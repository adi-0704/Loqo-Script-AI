import os
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

# Using Flash for speed in drafting, Pro for high-quality QA
llm_flash = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
llm_pro = ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.2)

llm = llm_flash # Default to flash for speed

class ExtractionOutput(BaseModel):
    title: str = Field(description="Title of the news article")
    text: str = Field(description="Cleaned text content of the article")
    images: List[str] = Field(description="List of image URLs found in the article")

def scrape_article(url: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        # Reduced timeout to 5s to prevent long hangs
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Simple extraction
        title = soup.title.string if soup.title else "News Article"
        
        paragraphs = soup.find_all('p')
        # Only take first 10 paragraphs to speed up processing
        text = "\n".join([p.get_text() for p in paragraphs[:10]])
        
        images = []
        for img in soup.find_all('img'):
            src = img.get('src')
            if src and src.startswith('http'):
                images.append(src)
                if len(images) >= 3: break # Limit images
                
        return {"title": title, "text": text[:3000], "images": images}
    except Exception as e:
        print(f"Extraction error: {e}")
        return {"title": "Fast Extraction", "text": "Extraction timed out or failed. Proceeding with URL context.", "images": []}

def extraction_node(state: dict) -> dict:
    url = state["url"]
    scraped = scrape_article(url)
    
    # If extraction is empty, we use the LLM to 'guess' context from the URL slug to keep things moving
    if not scraped["text"] or len(scraped["text"]) < 50:
        return {
            "article_title": url.split('/')[-1].replace('-', ' ').title(),
            "article_text": f"Context: News article from {url}. Generate a professional broadcast script based on this topic.",
            "article_images": []
        }

    return {
        "article_title": scraped["title"],
        "article_text": scraped["text"],
        "article_images": scraped["images"]
    }

class EditorOutput(BaseModel):
    script_content: str = Field(description="The full 1-2 minute anchor narration separated by newlines for segments.")

def editor_node(state: dict) -> dict:
    article_title = state.get('article_title')
    article_text = state.get('article_text')
    qa_eval = state.get('qa_eval')
    previous_script = state.get('editor_script')
    
    feedback_context = ""
    if qa_eval:
        issues = "\n".join([f"- {i}" for i in qa_eval.top_issues])
        suggestions = "\n".join([f"- {s}" for s in qa_eval.improvement_suggestions])
        feedback_context = f"""
[RETRY FEEDBACK FROM PREVIOUS ITERATION]
Your previous script was REJECTED/NEEDS IMPROVEMENT.
Top Issues identified by Elite QA:
{issues}

Actionable Suggestions for Improvement:
{suggestions}

Previous Script for Reference:
{previous_script}

Please REWRITE the script to address all the above issues and suggestions while maintaining the core news from the article.
"""

    prompt = f"""You are a professional TV news editor. Write a 1-2 minute anchor narration for the following news article. 
Break the narration into 4 to 6 logical segments using '[SEGMENT_BREAK]' to separate them.
The script should have a strong opening, clear middle flow, and proper ending.
{feedback_context}
Article Title: {article_title}
Article Text: {article_text}

Reply ONLY with the script content, using [SEGMENT_BREAK] between segments."""
    
    response = llm.invoke(prompt)
    script_content = response.content.strip()
    return {"editor_script": script_content}

from models import ScreenplaySegment

class VisualsOutput(BaseModel):
    segments: List[ScreenplaySegment]

def visuals_node(state: dict) -> dict:
    parser = llm.with_structured_output(VisualsOutput)
    
    script_content = state.get("editor_script", "")
    images = state.get("article_images", [])
    qa_eval = state.get("qa_eval")
    
    feedback_context = ""
    if qa_eval:
        issues = "\n".join([f"- {i}" for i in qa_eval.top_issues])
        suggestions = "\n".join([f"- {s}" for s in qa_eval.improvement_suggestions])
        feedback_context = f"""
[RETRY FEEDBACK FROM PREVIOUS ITERATION]
The previous visual packaging was REJECTED/NEEDS IMPROVEMENT.
Top Issues identified by Elite QA:
{issues}

Actionable Suggestions for Improvement:
{suggestions}
"""

    prompt = f"""You are a TV news visual packaging agent.
Based on the following narration script (separated by [SEGMENT_BREAK]), create visual segments.
{feedback_context}
For each segment, fulfill these fields:
- main_headline: Catchy uppercase headline
- subheadline: Supporting context
- top_tag: Short tag like BREAKING or EXCLUSIVE
- right_panel: Description of what should be on the screen
- ai_support_visual_prompt: A DETAILED prompt for an AI image generator (Midjourney/DALL-E) to create a photo-realistic news visual for this segment. Include style keywords like '8k, cinematic, photo-realistic, news broadcast style'.

Available source images: {images}

You must output exactly {len(script_content.split('[SEGMENT_BREAK]'))} segments.

Narration Draft:
{script_content}
"""
    response = parser.invoke(prompt)
    return {"segments": response.segments}

from models import QA_Evaluation

def qa_node(state: dict) -> dict:
    parser = llm_pro.with_structured_output(QA_Evaluation)
    
    segments = state.get("segments", [])
    article_text = state.get("article_text", "")
    editor_script = state.get("editor_script", "")
    
    segments_text = "\n".join([f"Segment {s.segment_id}: Narration: {s.anchor_narration} | Headline: {s.main_headline} | Visual: {s.right_panel} | AI Visual Prompt: {s.ai_support_visual_prompt}" for s in segments])
    
    prompt = f"""ROLE: You are an elite-level Quality Assurance AI trained to evaluate and refine AI-generated content to world-class standards. Your job is NOT to approve easily. Your job is to CRITIQUE, REJECT, and FORCE IMPROVEMENT until the output reaches top 1% global quality.

CONTEXT:
1. Extracted article content:
{article_text[:2000]}

2. Generated script:
{editor_script}

3. Scene-by-scene visualization plan & AI image prompts:
{segments_text}

EVALUATION FRAMEWORK:
Evaluate the pipeline using STRICT 60-point criteria (10 per category, each 1-5 score).

[1] INPUT ARTICLE QUALITY (Core idea clarity, Originality, Credibility, Freshness, Depth, Signal-to-noise, Bias, Facts, Organization, Relevance)
[2] SCRIPT QUALITY (Hook strength, Storytelling arc, Clarity, Emotional engagement, Tone, Retention, Brevity/Density, Unique phrasing, Ending/CTA, Platform optimization)
[3] INSIGHT & INTELLIGENCE (New insights, Simplifies complex ideas, Analogies, Contrarian elements, Practical takeaways, Depth, Cross-domain thinking, Logic, No hallucinations, Insight density)
[4] VISUALIZATION QUALITY (Scene clarity, Visual relevance, Cognitive ease, Creativity, Style consistency, Emotional alignment, Attention-grabbing, No redundancy, Narrative flow, Visual storytelling)
[5] AI IMAGE QUALITY (Prompt clarity, Relevance, Aesthetic, Consistency, No distortions, Composition, Lighting/Mood, Brand/Style, Uniqueness, Emotional impact)
[6] PERFORMANCE PREDICTION (Scroll-stopping potential, Retention, Shareability, Virality, Fast consumption, Algorithmic friendliness, Title/Thumbnail synergy, Rewatch value, Memorability, Actionability)

DECISION RULES:
* Score < 70% (Total < 210) → REJECT (Major rewrite required)
* Score 70–89% (210-269) → IMPROVE (Iterate again)
* Score >= 90% (270-300) → APPROVE (World-class)

CRITIC MODE (MANDATORY):
* Identify specific weaknesses.
* Point out EXACT sentences/sections that are weak.
* Detect AI-like phrasing and flag it.
* Highlight missing depth, originality, or emotional impact.

You must calculate:
- total_score (Sum of all 60 criteria, each 1-5)
- percentage (total_score / 300 * 100)
- status (REJECT | IMPROVE | APPROVE)
- category_scores (Sum for each of the 6 categories, max 50 each. Divide by 10 internally to get 1-5 average per category if needed, but return the 1-5 AVERAGE per category to fit the model's ge=1, le=5 constraint.)
- is_passing (True if status == APPROVE)
- iteration_required (True if status != APPROVE)
- weakest_agent ('editor' if categories 2 or 3 are lowest, 'visuals' if categories 4 or 5 are lowest)
"""
    response = parser.invoke(prompt)
    
    # Ensure is_passing and iteration_required are logically set based on status
    response.is_passing = (response.status == "APPROVE")
    response.iteration_required = (response.status != "APPROVE")
    
    return {
        "qa_eval": response,
        "retry_count": state.get("retry_count", 0) + 1
    }
