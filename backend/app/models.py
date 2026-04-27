from typing import Any

from pydantic import BaseModel, Field


class PlanningRequest(BaseModel):
    context: str = Field(..., min_length=10)
    objectives: str = Field(..., min_length=5)
    audience: str = Field(..., min_length=2)
    participant_count: str = Field(default="")
    budget: str = Field(default="")
    tone: str = Field(default="")
    reference_notes: str = Field(default="")


class InsightResponse(BaseModel):
    title: str = "项目背景深度洞察"
    summary: str = ""
    activity_overview: str = ""
    core_goals: list[str] = Field(default_factory=list)
    audience_analysis: list[str] = Field(default_factory=list)
    market_analysis: list[str] = Field(default_factory=list)
    audience_personas: list[str] = Field(default_factory=list)
    pain_points: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)


class CreativeCard(BaseModel):
    title: str = ""
    description: str = ""
    accent: str = "purple"
    icon: str = "FileText"


class StrategyResponse(BaseModel):
    slogan: str = ""
    theme: str = ""
    theme_options: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    creative_highlights: list[str] = Field(default_factory=list)
    creative_matrix: list[CreativeCard] = Field(default_factory=list)
    promotion_plan: list[str] = Field(default_factory=list)


class TimelineStage(BaseModel):
    id: int = 0
    name: str = ""
    range: str = ""
    tasks: list[str] = Field(default_factory=list)
    accent: str = "purple"
    icon: str = "Settings"


class BudgetItem(BaseModel):
    name: str = ""
    amount: str = ""
    ratio: int = 0
    accent: str = "purple"
    purpose: str = ""
    market_reference: str = ""
    saving_tip: str = ""


class RiskItem(BaseModel):
    title: str = ""
    level: str = ""
    response: str = ""
    accent: str = "rose"


class StaffingItem(BaseModel):
    role: str = ""
    owner: str = ""
    responsibilities: list[str] = Field(default_factory=list)


class ReferenceCase(BaseModel):
    name: str = ""
    summary: str = ""
    highlights: list[str] = Field(default_factory=list)


class ExecutionResponse(BaseModel):
    project_period: str = ""
    execution_modules: list[str] = Field(default_factory=list)
    sop: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    timeline: list[TimelineStage] = Field(default_factory=list)
    budget_total: str = ""
    budget_warning: str = ""
    budget_items: list[BudgetItem] = Field(default_factory=list)
    budget_optimization: list[str] = Field(default_factory=list)
    staffing_plan: list[StaffingItem] = Field(default_factory=list)
    safety_plan: list[str] = Field(default_factory=list)
    risks: list[RiskItem] = Field(default_factory=list)
    backup_plans: list[str] = Field(default_factory=list)
    reference_cases: list[ReferenceCase] = Field(default_factory=list)
    key_notes: list[str] = Field(default_factory=list)


class PlanningResponse(BaseModel):
    request: PlanningRequest
    insight: InsightResponse
    strategy: StrategyResponse
    execution: ExecutionResponse


class StreamEvent(BaseModel):
    step: str
    label: str
    content: dict[str, Any]
