import os
import pdfplumber
import tempfile
import requests
import json
from docx import Document as DocxDocument
from dotenv import load_dotenv

from app.db import (
    update_resume,
    save_resume_file,
    is_email_duplicate,
    update_summary,
    ensure_freelancer_exists
)
from app.utils import extract_json_from_groq_response
from app.profile_updater import update_freelancer_contact, update_freelancer_summary

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# ---------------- Helper Functions ----------------

def extract_text_from_resume(file_name, file_bytes):
    resume_text = ''
    file_type = file_name.split('.')[-1].lower()

    if file_type == 'pdf':
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            with pdfplumber.open(tmp_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        resume_text += text + '\n'
        finally:
            os.unlink(tmp_path)

    elif file_type == 'docx':
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            doc = DocxDocument(tmp_path)
            for para in doc.paragraphs:
                resume_text += para.text + '\n'
        finally:
            os.unlink(tmp_path)

    return resume_text.strip()


def call_groq_llm(resume_text, api_key):
    """
    Send text to Groq LLM for JSON parsing. Returns dict and raw response.
    Handles empty or invalid responses gracefully.
    """
    if not resume_text.strip():
        return None, "Resume text is empty"

    prompt = f"""
You are an expert resume parser. Convert the resume text below to a standardized JSON
with the following structure (only include fields you can confidently extract):
{{
  "name": "",
  "email": "",
  "phone": "",
  "summary": "",
  "education": [
    {{
      "degree": "",
      "institution": "",
      "year": "",
      "details": ""
    }}
  ],
  "skills": [],
  "projects": [
    {{
      "title": "",
      "description": ""
    }}
  ],
  "experience": [
    {{
      "title": "",
      "company": "",
      "duration": "",
      "description": ""
    }}
  ]
}}

Resume Text:
{resume_text}
"""

    headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    data = {
        'messages': [
            {'role': 'system', 'content': 'You are a helpful assistant.'},
            {'role': 'user', 'content': prompt}
        ],
        'model': 'llama-3.1-8b-instant',
        'max_tokens': 2048
    }

    try:
        response = requests.post('https://api.groq.com/openai/v1/chat/completions', headers=headers, json=data, timeout=60)
        response.raise_for_status()
        content = response.json()['choices'][0]['message']['content']
        parsed_json = extract_json_from_groq_response(content)
        if not parsed_json:
            return None, "Groq returned empty JSON"
        return parsed_json, content
    except Exception as e:
        return None, str(e)


def deduplicate_list_of_dicts(items, key_fields):
    seen = set()
    unique_items = []
    for item in items:
        identifier = tuple(item.get(k, "").strip().lower() for k in key_fields)
        if identifier not in seen:
            seen.add(identifier)
            unique_items.append(item)
    return unique_items


def deduplicate_skills_list(skills):
    return list(set(s.strip().lower() for s in skills if isinstance(s, str)))


def deduplicate_resume(parsed):
    if "skills" in parsed and isinstance(parsed["skills"], list):
        parsed["skills"] = deduplicate_skills_list(parsed["skills"])

    if "projects" in parsed and isinstance(parsed["projects"], list):
        parsed["projects"] = deduplicate_list_of_dicts(parsed["projects"], key_fields=["title", "description"])

    if "experience" in parsed and isinstance(parsed["experience"], list):
        parsed["experience"] = deduplicate_list_of_dicts(parsed["experience"], key_fields=["company", "title", "description"])

    return parsed


# ---------------- Summary Generator (Groq) ----------------

def generate_summary_with_groq(parsed_json, api_key):
    """
    Uses Groq LLM to generate a professional summary from parsed resume JSON.
    This version is kept lightweight (no Torch / embeddings imports) so it
    works in constrained Windows environments.
    """
    prompt = f"""
    Generate a concise marketing summary for a freelancer based on the
    following structured resume data:

    {json.dumps(parsed_json, indent=2)}

    Guidelines:
    - Do NOT include the freelancer's name or contact info.
    - Use a professional, factual tone to market the freelancer.
    - Mention the main role/specialization.
    - If years of experience are clearly derivable from the data, include them;
      otherwise omit them (do not invent).
    - Highlight key technical skills and what they enable the freelancer to build.
    - Keep the summary between 30 and 50 words.
    - Output only the summary text.
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    data = {
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        "model": "llama-3.1-8b-instant",
        "max_tokens": 150,
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=60,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return content.strip()
    except Exception:
        # If summary generation fails for any reason, just fallback later.
        return ""


# ---------------- Main Handler ----------------

def handle_resume_upload(uploaded_file, api_key, freelancer_id):
    file_name = uploaded_file.name
    file_bytes = uploaded_file.read()  # Streamlit files are BytesIO

    resume_text = extract_text_from_resume(file_name, file_bytes)
    if not resume_text:
        return None, "No text could be extracted from the resume."

    ensure_freelancer_exists(freelancer_id)
    save_resume_file(freelancer_id, file_name, file_bytes)

    new_parsed_json, raw_response = call_groq_llm(resume_text, api_key)
    if new_parsed_json is None:
        return None, f"Parsing failed. Groq response: {raw_response}"

    # Remove duplicates
    new_parsed_json = deduplicate_resume(new_parsed_json)

    # Check email duplication
    if is_email_duplicate(new_parsed_json.get("email"), freelancer_id):
        return None, f"Email {new_parsed_json.get('email')} already exists."

    merged_json = update_resume(freelancer_id, new_parsed_json)

    # Ensure summary exists
    summary, err = generate_summary_with_groq(new_parsed_json, api_key), None
    if not summary:
        summary = "Experienced freelancer with relevant technical expertise."
    update_summary(freelancer_id, summary)
    merged_json["summary"] = summary

    update_freelancer_contact(
        freelancer_id,
        merged_json.get("name", ""),
        merged_json.get("email", ""),
        merged_json.get("phone", ""),
    )
    update_freelancer_summary(freelancer_id, merged_json.get("summary", ""))

    # NOTE: We intentionally do NOT call the embedding/FAISS pipeline here to
    # avoid heavy Torch/Transformer dependencies crashing Streamlit on Windows.
    # The recommender pipeline (process_freelancer in app.Embedding) can be run
    # separately in an offline script or API if needed.

    return merged_json, None
