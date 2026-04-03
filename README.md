# LOQO AI PRO: Broadcast Intelligence Engine

LOQO AI is a sophisticated multi-agent pipeline designed to transform any news URL into a dynamic, broadcast-ready screenplay. 

## 🚀 Key Features

- **Elite QA Agent**: Content is strictly evaluated against a 60-point criteria across 6 categories (Article, Script, Insight, Visuals, Image, Performance).
- **Iterative Feedback Loop**: Failures or "Improve" statuses trigger a smart regeneration cycle where agents use specific QA critiques to refine the output.
- **Visual Packaging**: Automatic generation of scene-by-scene visual descriptions and AI image prompts for production.
- **Premium Dashboard**: A dark-mode, broadcast-style interface with real-time analytics, radar charts, and detailed expert feedback.

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, LangGraph, LangChain, Pydantic, Gemini 2.5 (Flash & Pro).
- **Frontend**: React, Vite, Tailwind CSS, Lucide icons, Recharts.
- **Monitoring**: Langfuse integration for full-trace observability.

## 📦 Installation & Setup

### Backend Setup
1. Navigate to the `backend/` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file based on `.env.example` and add your `GEMINI_API_KEY`.
4. Start the server:
   ```bash
   python main.py
   ```

### Frontend Setup
1. Navigate to the `frontend-v3/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 🎥 Running a Generation
1. Open the dashboard (typically `http://localhost:3015`).
2. Paste a news article URL into the input field.
3. Click **GENERATE** and observe the multi-agent pipeline (Extraction → Editor → Visuals → QA) in action.
4. If the content doesn't meet the 90% "Elite" threshold, watch as the system automatically iterates based on feedback.

---
*Built for the future of broadcast automation.*
