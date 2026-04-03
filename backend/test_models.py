import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

models_to_test = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.5-flash",
    "gemini-2.5-pro"
]

results = []

for model_name in models_to_test:
    print(f"Testing model: {model_name}...")
    try:
        llm = ChatGoogleGenerativeAI(model=model_name, temperature=0.3)
        response = llm.invoke("Hello, are you working?")
        res = f"SUCCESS: {model_name} responded: {response.content[:50]}..."
        print(res)
        results.append(res)
    except Exception as e:
        res = f"FAILED: {model_name} error: {e}"
        print(res)
        results.append(res)
    print("-" * 20)

with open("test_results.txt", "w") as f:
    f.write("\n".join(results))
