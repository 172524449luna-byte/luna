from __future__ import annotations

import json
import os
import re
from math import floor
from typing import Any

from openai import OpenAI
from pydantic import ValidationError

from app.models import (
    BudgetItem,
    CreativeCard,
    ExecutionResponse,
    InsightResponse,
    PlanningRequest,
    PlanningResponse,
    ReferenceCase,
    RiskItem,
    StaffingItem,
    StrategyResponse,
    TimelineStage,
)

BASE_URL = "https://wanqing-api.corp.kuaishou.com/api/gateway/v1/endpoints"
MODEL_NAME = os.getenv("WQ_MODEL", "ep-a49ej6-1777200737174913043")
JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)
ACCENTS = ["purple", "blue", "pink", "green", "amber"]
CREATIVE_ICONS = ["FileText", "Lightbulb", "TrendingUp", "Users"]
TIMELINE_ICONS = ["Settings", "Megaphone", "Rocket", "Flag"]
RISK_ACCENTS = ["rose", "amber", "purple"]

INSIGHT_PROMPT = """你是资深活动运营策划专家，专注商业线下/线上全类型活动策划。
请基于用户需求输出“活动基础概述、活动核心目标、参与人群分析、整体创意亮点前置洞察、市场趋势、核心痛点与机会判断”。
你必须严格遵守以下规则：
1. 优先参考近两年全网真实爆款活动、商业落地案例中常见的玩法逻辑与执行框架，但不要编造具体品牌名称、虚假来源或无法验证的数据。
2. 拒绝空泛套话，所有内容都要能够直接指导后续策划与执行。
3. 内容必须紧贴用户填写的活动背景、活动目的、参与人群、总预算、特殊要求。
只返回 JSON，不要输出 markdown、解释、代码块。
JSON 结构必须为：
{
  "title": string,
  "summary": string,
  "activity_overview": string,
  "core_goals": string[],
  "audience_analysis": string[],
  "market_analysis": string[],
  "audience_personas": string[],
  "pain_points": string[],
  "opportunities": string[]
}
要求：
- 所有内容必须为中文。
- 所有数组至少 3 项。
- 每一项都要有实际分析价值，而不是关键词堆砌。"""

STRATEGY_PROMPT = """你是资深活动创意与传播策划专家。
请基于用户需求和洞察结果，输出“整体创意亮点、宣传推广方案、互动玩法、环节设计”。
你必须严格遵守以下规则：
1. 必须借鉴近两年主流商业活动、线上线下整合营销、会员拉新、内容种草、直播联动、打卡互动、裂变玩法中的成熟逻辑，但不要编造具体品牌名称。
2. 每个创意和推广动作都要写清楚玩法机制、执行动作、用户参与方式、传播触发点。
3. 拒绝空泛表达，如“增强体验感”“提升氛围感”这种无执行细节的话术。
只返回 JSON，不要输出 markdown、解释、代码块。
JSON 结构必须为：
{
  "slogan": string,
  "theme": string,
  "theme_options": string[],
  "tags": string[],
  "creative_highlights": string[],
  "creative_matrix": [
    {
      "title": string,
      "description": string,
      "accent": "purple" | "blue" | "pink" | "green" | "amber",
      "icon": "FileText" | "Lightbulb" | "TrendingUp" | "Users"
    }
  ],
  "promotion_plan": string[]
}
要求：
- 所有内容必须为中文。
- creative_highlights 至少 4 项。
- creative_matrix 必须刚好 4 项。
- promotion_plan 至少 5 项。
- theme_options 必须刚好 5 项，每项都是可直接给用户选择的完整活动主题名称，风格有区分度，但必须贴合当前需求。
- slogan 要自然、有传播感，不能生硬截断。"""

EXECUTION_PROMPT = """你是资深活动执行统筹专家。
请基于用户需求、洞察和策略结果，输出完整的“详细时间流程安排、现场/线上执行环节、完整预算明细拆分、人员分工安排、安全&风险应急预案、备用备选方案、关键注意事项、参考案例”。
你必须严格遵守以下规则：
1. 必须按真实商业活动落地标准编写，包含会前、会中、会后完整执行闭环。
2. 必须写清楚每一步如何执行、谁负责、用什么资源、如何控风险。
3. 预算必须结合用户总预算和参与人群规模做合理拆分，说明用途、市场价依据、省钱建议。
4. 必须生成 2-3 个同类型精简参考案例，作为灵感借鉴，但不要编造具体品牌名称或虚假数据，可描述为“近年购物中心周年庆快闪类案例”“近年新品发布沉浸体验类案例”等。
5. 拒绝空洞话术，所有模块都要可直接复制用于汇报或落地执行。
只返回 JSON，不要输出 markdown、解释、代码块。
JSON 结构必须为：
{
  "project_period": string,
  "execution_modules": string[],
  "sop": string[],
  "resources": string[],
  "timeline": [
    {
      "id": number,
      "name": string,
      "range": string,
      "tasks": string[],
      "accent": "purple" | "blue" | "pink" | "green" | "amber",
      "icon": "Settings" | "Megaphone" | "Rocket" | "Flag"
    }
  ],
  "budget_total": string,
  "budget_warning": string,
  "budget_items": [
    {
      "name": string,
      "amount": string,
      "ratio": number,
      "accent": "purple" | "blue" | "pink" | "green" | "amber",
      "purpose": string,
      "market_reference": string,
      "saving_tip": string
    }
  ],
  "budget_optimization": string[],
  "staffing_plan": [
    {
      "role": string,
      "owner": string,
      "responsibilities": string[]
    }
  ],
  "safety_plan": string[],
  "risks": [
    {
      "title": string,
      "level": string,
      "response": string,
      "accent": "rose" | "amber" | "purple"
    }
  ],
  "backup_plans": string[],
  "reference_cases": [
    {
      "name": string,
      "summary": string,
      "highlights": string[]
    }
  ],
  "key_notes": string[]
}
要求：
- 所有内容必须为中文。
- execution_modules 至少 4 项。
- sop 至少 6 项。
- resources 至少 5 项。
- timeline 必须刚好 4 项，且每项 tasks 至少 3 条。
- budget_items 必须刚好 5 项，ratio 总和必须为 100。
- budget_optimization 至少 3 项。
- staffing_plan 至少 4 项。
- safety_plan 至少 4 项。
- risks 必须刚好 3 项。
- backup_plans 至少 3 项。
- reference_cases 为 2-3 项。
- key_notes 至少 4 项。"""


def _extract_budget_number(budget: str) -> float:
    matches = re.findall(r"(\d+(?:\.\d+)?)", budget.replace(",", ""))
    if not matches:
        return 0
    numbers = [float(value) for value in matches]
    if len(numbers) >= 2:
        return sum(numbers[:2]) / 2
    return numbers[0]


def _format_budget_amount(total: float, ratio: int) -> str:
    if total <= 0:
        return f"{ratio}%"
    amount = floor(total * ratio / 100)
    unit = "万" if total >= 10 else "元"
    if unit == "万":
        return f"¥{amount:.0f}万"
    return f"¥{amount * 10000:.0f}"


def _get_client() -> OpenAI:
    api_key = os.getenv("WQ_API_KEY")
    if not api_key:
        raise RuntimeError("未配置 WQ_API_KEY，无法调用万擎模型接口")
    return OpenAI(base_url=BASE_URL, api_key=api_key)


def _extract_json_content(content: str) -> dict[str, Any]:
    fenced_match = JSON_BLOCK_RE.search(content)
    candidate = fenced_match.group(1) if fenced_match else content.strip()

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end == -1 or start >= end:
            raise RuntimeError("模型返回内容不是有效 JSON")
        return json.loads(candidate[start : end + 1])


def _call_model(client: OpenAI, system_prompt: str, payload: dict[str, Any]) -> dict[str, Any]:
    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False, indent=2)},
        ],
        temperature=0.7,
    )
    content = completion.choices[0].message.content
    if not content:
        raise RuntimeError("模型未返回有效内容")
    return _extract_json_content(content)


def _normalize_insight_payload(payload: dict[str, Any]) -> dict[str, Any]:
    insight = payload.get("insight") if isinstance(payload.get("insight"), dict) else payload
    insight.setdefault("title", "项目背景深度洞察")
    insight.setdefault("activity_overview", insight.get("summary", ""))
    insight.setdefault("core_goals", [])
    insight.setdefault("audience_analysis", insight.get("audience_personas", []))
    return insight


def _normalize_strategy_payload(payload: dict[str, Any], request: PlanningRequest) -> dict[str, Any]:
    strategy = payload.get("strategy") if isinstance(payload.get("strategy"), dict) else payload
    strategy.setdefault("creative_highlights", [])
    strategy.setdefault("promotion_plan", [])
    strategy.setdefault("theme_options", [strategy.get("theme", "")])

    tags = strategy.get("tags")
    if not isinstance(tags, list) or not tags:
        strategy["tags"] = [request.audience, request.tone or "活动策划", request.budget or "预算待定"]

    creative_matrix = strategy.get("creative_matrix")
    if isinstance(creative_matrix, list):
        for index, card in enumerate(creative_matrix):
            card.setdefault("accent", ACCENTS[index % len(ACCENTS)])
            card.setdefault("icon", CREATIVE_ICONS[index % len(CREATIVE_ICONS)])

    theme_options = [option for option in strategy.get("theme_options", []) if option]
    if not theme_options:
        theme_options = [strategy.get("theme", "")]
    if strategy.get("theme") and strategy["theme"] not in theme_options:
        theme_options.insert(0, strategy["theme"])
    strategy["theme_options"] = theme_options[:5]

    return strategy


def _normalize_budget_items(execution: dict[str, Any], budget: str) -> None:
    budget_items = execution.get("budget_items")
    if not isinstance(budget_items, list) or not budget_items:
        return

    ratios: list[int] = []
    for item in budget_items:
        try:
            ratios.append(int(item.get("ratio", 0)))
        except (TypeError, ValueError):
            ratios.append(0)

    total_ratio = sum(ratios)
    if total_ratio <= 0:
        ratios = [30, 24, 20, 16, 10][: len(budget_items)]
        total_ratio = sum(ratios)

    normalized: list[int] = []
    accumulated = 0
    for index, ratio in enumerate(ratios):
        if index == len(ratios) - 1:
            normalized_ratio = max(0, 100 - accumulated)
        else:
            normalized_ratio = max(0, round(ratio / total_ratio * 100))
            accumulated += normalized_ratio
        normalized.append(normalized_ratio)

    budget_value = _extract_budget_number(budget)
    for index, item in enumerate(budget_items):
        ratio = normalized[index]
        item["ratio"] = ratio
        item.setdefault("accent", ACCENTS[index % len(ACCENTS)])
        if not item.get("amount"):
            item["amount"] = _format_budget_amount(budget_value, ratio)
        item.setdefault("purpose", "")
        item.setdefault("market_reference", "")
        item.setdefault("saving_tip", "")


def _normalize_execution_payload(payload: dict[str, Any], request: PlanningRequest) -> dict[str, Any]:
    execution = payload.get("execution") if isinstance(payload.get("execution"), dict) else payload
    execution.setdefault("execution_modules", [])
    execution.setdefault("budget_optimization", [])
    execution.setdefault("staffing_plan", [])
    execution.setdefault("safety_plan", [])
    execution.setdefault("backup_plans", [])
    execution.setdefault("reference_cases", [])
    execution.setdefault("key_notes", [])

    timeline = execution.get("timeline")
    if isinstance(timeline, list):
        for index, stage in enumerate(timeline):
            stage.setdefault("id", index + 1)
            stage.setdefault("accent", ACCENTS[index % len(ACCENTS)])
            stage.setdefault("icon", TIMELINE_ICONS[index % len(TIMELINE_ICONS)])

    risks = execution.get("risks")
    if isinstance(risks, list):
        for index, risk in enumerate(risks):
            risk.setdefault("accent", RISK_ACCENTS[index % len(RISK_ACCENTS)])

    execution.setdefault("budget_total", request.budget or "待确认")
    execution.setdefault("budget_warning", "")
    _normalize_budget_items(execution, request.budget)
    return execution


def build_insight(request: PlanningRequest, client: OpenAI | None = None) -> InsightResponse:
    llm_client = client or _get_client()
    payload = _call_model(
        llm_client,
        INSIGHT_PROMPT,
        {
            "request": request.model_dump(),
            "task": "生成项目洞察与活动基础概述",
        },
    )

    try:
        return InsightResponse.model_validate(_normalize_insight_payload(payload))
    except ValidationError as error:
        raise RuntimeError(f"洞察步骤返回结构不符合预期：{error}") from error


def build_strategy(
    request: PlanningRequest,
    insight: InsightResponse,
    client: OpenAI | None = None,
) -> StrategyResponse:
    llm_client = client or _get_client()
    payload = _call_model(
        llm_client,
        STRATEGY_PROMPT,
        {
            "request": request.model_dump(),
            "insight": insight.model_dump(),
            "task": "生成创意亮点、互动玩法与宣传推广方案",
        },
    )

    try:
        return StrategyResponse.model_validate(_normalize_strategy_payload(payload, request))
    except ValidationError as error:
        raise RuntimeError(f"策略步骤返回结构不符合预期：{error}") from error


def build_execution(
    request: PlanningRequest,
    insight: InsightResponse,
    strategy: StrategyResponse,
    client: OpenAI | None = None,
) -> ExecutionResponse:
    llm_client = client or _get_client()
    payload = _call_model(
        llm_client,
        EXECUTION_PROMPT,
        {
            "request": request.model_dump(),
            "insight": insight.model_dump(),
            "strategy": strategy.model_dump(),
            "task": "生成详细执行流程、预算、人员分工、风险预案和参考案例",
        },
    )

    try:
        return ExecutionResponse.model_validate(_normalize_execution_payload(payload, request))
    except ValidationError as error:
        raise RuntimeError(f"执行步骤返回结构不符合预期：{error}") from error


def build_plan(request: PlanningRequest) -> PlanningResponse:
    client = _get_client()
    insight = build_insight(request, client)
    strategy = build_strategy(request, insight, client)
    execution = build_execution(request, insight, strategy, client)
    return PlanningResponse(
        request=request,
        insight=insight,
        strategy=strategy,
        execution=execution,
    )
