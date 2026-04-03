from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from models import ScreenplaySegment, QA_Evaluation
from agents import extraction_node, editor_node, visuals_node, qa_node

class GraphState(TypedDict):
    url: str
    article_title: str
    article_text: str
    article_images: List[str]
    editor_script: str
    segments: List[ScreenplaySegment]
    qa_eval: QA_Evaluation
    retry_count: int

def should_retry(state: GraphState):
    qa = state.get("qa_eval")
    retry_count = state.get("retry_count", 0)
    
    if int(retry_count) >= 3:
        return END
        
    if qa and qa.is_passing:
        return END
        
    return "editor"

def create_graph():
    workflow = StateGraph(GraphState)
    
    workflow.add_node("extraction", extraction_node)
    workflow.add_node("editor", editor_node)
    workflow.add_node("visuals", visuals_node)
    workflow.add_node("qa", qa_node)
    
    workflow.set_entry_point("extraction")
    workflow.add_edge("extraction", "editor")
    workflow.add_edge("editor", "visuals")
    workflow.add_edge("visuals", "qa")
    
    workflow.add_conditional_edges("qa", should_retry, {
        "editor": "editor",
        "visuals": "visuals",
        END: END
    })
    
    return workflow.compile()
