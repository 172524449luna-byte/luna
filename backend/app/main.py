from __future__ import annotations

import asyncio
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import PlanningRequest, PlanningResponse
from app.services.planner import build_execution, build_insight, build_plan, build_strategy

app = FastAPI(title="EventMaster AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/plan")
def create_plan(request: PlanningRequest) -> PlanningResponse:
    try:
        return build_plan(request)
    except RuntimeError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.post("/api/plan/stream")
async def create_plan_stream(request: PlanningRequest) -> StreamingResponse:
    async def event_generator():
        try:
            insight = await asyncio.to_thread(build_insight, request)
            yield f"data: {json.dumps({'step': 'insight', 'label': '项目背景深度洞察', 'content': insight.model_dump()}, ensure_ascii=False)}\n\n"

            strategy = await asyncio.to_thread(build_strategy, request, insight)
            yield f"data: {json.dumps({'step': 'strategy', 'label': '核心策略与创意矩阵', 'content': strategy.model_dump()}, ensure_ascii=False)}\n\n"

            execution = await asyncio.to_thread(build_execution, request, insight, strategy)
            yield f"data: {json.dumps({'step': 'execution', 'label': '落地执行全景图', 'content': execution.model_dump()}, ensure_ascii=False)}\n\n"

            plan = PlanningResponse(
                request=request,
                insight=insight,
                strategy=strategy,
                execution=execution,
            )
            yield f"event: done\ndata: {json.dumps(plan.model_dump(), ensure_ascii=False)}\n\n"
        except RuntimeError as error:
            data = json.dumps({"message": str(error)}, ensure_ascii=False)
            yield f"event: error\ndata: {data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
