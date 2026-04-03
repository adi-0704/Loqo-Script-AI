import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    response = requests.get(url)
    if response.status_code == 200:
        models = response.json().get("models", [])
        with open("models_list.txt", "w") as f:
            for model in models:
                f.write(f"{model.get('name')}\n")
        print("Models saved to models_list.txt")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"An error occurred: {e}")
