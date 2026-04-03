import os
import json
import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from graph import create_graph
from langfuse.langchain import CallbackHandler

# Load environment explicitly
load_dotenv()

# Initialize Langfuse Callback Handler
langfuse_handler = CallbackHandler()

app = FastAPI(title="Loqo AI Screenplay Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    url: str

graph = create_graph()

async def event_generator(url: str):
    # LangGraph streams execution state.
    initial_state = {
        "url": url,
        "retry_count": 0
    }
    
    # We keep track of the full state to send to the frontend
    full_state = initial_state.copy()
    
    # Run the graph and stream events
    try:
        last_node = ""
        # Pass the Langfuse handler in the config and use astream for async execution
        async for event in graph.astream(initial_state, config={"callbacks": [langfuse_handler]}):
            # event is a dict with the node name as key and the update as value
            node_name = list(event.keys())[0]
            node_update = event[node_name]
            
            # Accumulate the update into our full_state
            full_state.update(node_update)
            last_node = node_name
            
            print(f"DEBUG: Streaming Node -> {node_name}")
            
            data = {
                "status": "running",
                "current_node": node_name,
                "state": full_state # Send the full accumulated state
            }
            # For JSON serialization of pydantic models
            from fastapi.encoders import jsonable_encoder
            yield f"data: {json.dumps(jsonable_encoder(data))}\n\n"
            
            # small delay for UI effect
            await asyncio.sleep(0.8)
            
        # Final success
        data = {
            "status": "completed",
            "current_node": last_node,
            "state": full_state
        }
        print("DEBUG: Pipeline Completed Successfully")
        yield f"data: {json.dumps(jsonable_encoder(data))}\n\n"
    except Exception as e:
        print(f"DEBUG: Pipeline Error -> {e}")
        yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

@app.post("/generate")
async def generate_script(req: GenerateRequest):
    return StreamingResponse(event_generator(req.url), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
