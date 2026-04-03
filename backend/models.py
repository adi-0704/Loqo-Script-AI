from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ScreenplaySegment(BaseModel):
    segment_id: int
    start_time: str
    end_time: str
    layout: Literal["anchor_left + source_visual_right", "anchor_left + ai_support_visual_right", "fullscreen_visual"] = Field(
        default="anchor_left + ai_support_visual_right"
    )
    anchor_narration: str
    main_headline: str
    subheadline: str
    top_tag: str
    left_panel: str
    right_panel: str
    source_image_url: Optional[str] = None
    ai_support_visual_prompt: Optional[str] = None
    transition: Literal["cut", "crossfade", "slide", "fade_out"] = Field(default="cut")

class Screenplay(BaseModel):
    article_url: str
    source_title: str
    video_duration_sec: int
    segments: List[ScreenplaySegment]

class CategoryScores(BaseModel):
    article_quality: int = Field(ge=1, le=5)
    script_quality: int = Field(ge=1, le=5)
    insight_quality: int = Field(ge=1, le=5)
    visual_quality: int = Field(ge=1, le=5)
    image_quality: int = Field(ge=1, le=5)
    performance_quality: int = Field(ge=1, le=5)

class QA_Evaluation(BaseModel):
    total_score: int = Field(description="Sum of all criteria (Max 300)")
    percentage: float = Field(description="Percentage score")
    status: Literal["REJECT", "IMPROVE", "APPROVE"]
    category_scores: CategoryScores
    top_issues: List[str]
    improvement_suggestions: List[str]
    iteration_required: bool
    is_passing: bool = Field(description="True if status is APPROVE")
    weakest_agent: Optional[Literal["editor", "visuals", "none"]] = None
