import os
import json
import requests
from dotenv import load_dotenv
from langchain.docstore.document import Document
from langchain_community.vectorstores import FAISS
from sentence_transformers import SentenceTransformer
from langchain_community.embeddings import HuggingFaceEmbeddings

# ========= CONFIG ==========

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env!")

BASE_FOLDER = "embedding_vectors_fl"
# Use HuggingFaceEmbeddings for local embeddings (FAISS compatible)
EMBEDDING_FUNCTION = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

# ===========================

def generate_summary_with_groq(parsed_json, api_key):
    """
    Uses Groq LLM to generate a professional summary from parsed resume JSON.
    """
    prompt = f"""
    Generate a **concise marketing summary** for a freelancer based on the following structured resume data:

    {json.dumps(parsed_json, indent=2)}

    ### Guidelines:
    - **Do NOT include the freelancer's name, contact info, education, universities, or personal goals.**
    - Use a **professional, factual, business-oriented tone** to market the freelancer to potential clients.
    - **Mention the role or specialization** (e.g., Backend Developer, Frontend Engineer, Data Scientist).
    - If **years of experience are explicitly mentioned in the experience section**, include them.
    - If **project timelines or experience durations are available**, estimate the experience based on that (e.g., start-end years or multiple long-term projects).
    - If there is **no clear way to estimate experience, omit years entirely. Do not invent them.**
    - **Highlight top technical skills** and connect them to **real business applications or industries** (e.g., SaaS dashboards, e-commerce automation).
    - **Extract meaningful insights from projects**: what was built, the technologies used, and the business impact.
    - Focus on **capabilities and deliverables**, such as scalability, automation, data pipelines, or UI development.
    - **Avoid soft skills or personality traits** (no "goal-oriented", "team player", etc.).
    - Keep the summary between **30 to 50 words.**
    - **Output only the summary text. No extra explanations or labels.**
    """
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }

    data = {
        'messages': [
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            {'role': 'user', 'content': prompt}
        ],
        'model': 'llama-3.1-8b-instant',
        'max_tokens': 150
    }

    response = requests.post(
        'https://api.groq.com/openai/v1/chat/completions',
        headers=headers,
        json=data
    )

    if response.status_code == 200:
        content = response.json()['choices'][0]['message']['content']
        return content.strip()
    else:
        raise Exception(f"Groq API Error: {response.status_code} - {response.text}")


def process_freelancer(freelancer, api_key, embedding_func=EMBEDDING_FUNCTION):
    freelancer_id = freelancer['freelancer_id']
    parsed_json = freelancer['parsed_resume']

    # Generate summary
    summary = generate_summary_with_groq(parsed_json, api_key)

    if not isinstance(summary, str) or len(summary.strip()) == 0:
        raise ValueError(f"Generated summary is invalid for freelancer {freelancer_id}")
    print(f"\n📄 Generated Summary for {freelancer_id}:")
    print(summary)

    # Prepare metadata
    metadata = {
        "freelancer_id": freelancer_id,
        "name": parsed_json.get("name", ""),
        "skills": parsed_json.get("skills", []),
        "categories": ["Freelancer"],
        "summary": summary,
        "hourly_rate": freelancer.get("hourly_rate", 0),
        "availability": freelancer.get("availability", "Unknown")
    }

    # Create Document
    doc = Document(page_content=summary, metadata=metadata)

    # Create FAISS vector store (local embeddings)
    faiss_store = FAISS.from_documents([doc], embedding_func)

    # Save FAISS vector store to local folder
    save_path = os.path.join(BASE_FOLDER, freelancer_id)
    os.makedirs(save_path, exist_ok=True)
    faiss_store.save_local(save_path)
    
    print(f"✅ Saved FAISS vector for freelancer: {freelancer_id}")


def main():
    freelancers = [
        {
            "freelancer_id": "FL123",
            "hourly_rate": 30,
            "location": "Pakistan",
            "availability": "Full-time",
            "parsed_resume": {
                "name": "John Doe",
                "skills": ["Python", "FastAPI", "SQL", "Selenium", "AWS"],
                "experience": [
                    {
                        "title": "Python Developer",
                        "company": "ABC Corp",
                        "duration": "2020 - 2024",
                        "description": "Built scalable scraping pipelines."
                    }
                ],
                "projects": [
                    {"title": "E-commerce Price Tracker", "description": "Price scraping system."}
                ]
            }
        },
        {
            "freelancer_id": "FL456",
            "hourly_rate": 40,
            "location": "India",
            "availability": "Part-time",
            "parsed_resume": {
                "name": "Jane Smith",
                "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
                "experience": [
                    {
                        "title": "Frontend Developer",
                        "company": "XYZ Ltd",
                        "duration": "2019 - 2024",
                        "description": "Built web dashboards and interactive UIs."
                    }
                ],
                "projects": [
                    {"title": "Real-time Dashboard", "description": "Built using React and WebSockets."}
                ]
            }
        }
    ]

    for freelancer in freelancers:
        process_freelancer(freelancer, GROQ_API_KEY, EMBEDDING_FUNCTION)

    print("\n🚀 All freelancer FAISS vectors saved locally with HuggingFace embeddings!")


if __name__ == "__main__":
    main()