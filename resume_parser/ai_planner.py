# pyre-ignore-all-errors
"""
AI Project Planner Service (Layer 2)
This service receives a project description and generates
milestones + tasks using Groq LLM (llama-3.1-8b-instant).
No database operations - just AI planning and returning structured JSON.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import requests
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Project Planner API", version="1.0.0")

# CORS middleware to allow .NET backend and frontend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your backend/frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ===================== Pydantic Models =====================

class TaskItem(BaseModel):
    """A single task within a milestone"""
    title: str = ""
    description: str = ""

class MilestoneItem(BaseModel):
    """A single milestone with its tasks"""
    title: str = ""
    description: str = ""
    deadlineOffsetDays: int = 0
    budgetPercentage: float = 0.0
    tasks: List[TaskItem] = []

class ProjectPlanRequest(BaseModel):
    """Input from the manager"""
    projectName: str
    projectDescription: str
    deadline: str
    budget: float

class ProjectPlanResponse(BaseModel):
    """AI-generated project plan"""
    milestones: List[MilestoneItem] = []

# ===================== Prompt Builder =====================

def build_prompt(project_name: str, project_description: str, deadline: str, budget: float) -> str:
    """Build the prompt that instructs Groq to generate a project plan."""
    
    return f"""You are a software project planning assistant.
Based on the following project information, generate a structured project plan.

Project Name:
{project_name}

Project Description:
{project_description}

Project Deadline:
{deadline}

Project Budget:
{budget}

Break the project into logical milestones.
For each milestone provide:
- title
- description
- deadlineOffsetDays (relative timeline in days from project start, must be cumulative and ascending)
- budgetPercentage (percentage of project budget, all milestones must sum to exactly 100)
- tasks (each task should have title and description)

Rules:
1. Generate 4 to 6 milestones that cover the full project lifecycle.
2. Each milestone must have 4 to 8 specific, actionable tasks.
3. deadlineOffsetDays must be cumulative and fit within the total project timeline.
4. budgetPercentage values across all milestones must sum to exactly 100.
5. Tasks must be specific development actions, NOT vague like "Work on backend".
6. Every task title should start with an action verb (Design, Implement, Create, Develop, Test, Deploy, Configure, Build, Set up, Write, Prepare, Conduct, etc.)
7. Task descriptions should explain what needs to be done in 1-2 sentences.

Return ONLY valid JSON in this exact structure. Do not include any text, explanation, or markdown outside the JSON:
{{
  "milestones": [
    {{
      "title": "Milestone Name",
      "description": "What this milestone covers",
      "deadlineOffsetDays": 14,
      "budgetPercentage": 15,
      "tasks": [
        {{
          "title": "Task title starting with action verb",
          "description": "What needs to be done"
        }}
      ]
    }}
  ]
}}

Return the JSON now:"""


# ===================== JSON Extraction =====================

def extract_json_from_response(response_text: str) -> dict:
    """
    Extract JSON from Groq response.
    Handles markdown code blocks, text before/after JSON, 
    trailing commas, and unclosed brackets.
    (Reuses proven patterns from fastapi_app.py)
    """
    if not response_text:
        print("[WARNING] Empty response text from Groq")
        return {}
    
    text = response_text.strip()
    original_text = text
    
    # Strategy 1: Look for JSON in markdown code blocks
    if "```json" in text or "```" in text:
        code_blocks = list(re.finditer(r'```(?:json)?', text))
        if code_blocks:
            start_marker = int(code_blocks[0].end())
            end_marker = int(text.find("```", start_marker))
            if end_marker == -1:
                end_marker = len(text)
                print("[DEBUG] No closing ``` found, using end of text")
            text = str(text[start_marker:end_marker]).strip()  # pyre-ignore
            print("[DEBUG] Extracted JSON from markdown code block")
    
    text = text.strip()
    
    # Strategy 2: Find JSON object boundaries by matching braces
    if not text.startswith("{"):
        start_idx = int(text.find("{"))
        if start_idx != -1:
            brace_count = 0
            end_idx = -1
            for i in range(start_idx, len(text)):
                char = str(text)[i]
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = int(i)
                        break
            if end_idx != -1 and end_idx > start_idx:
                text = str(text[start_idx:end_idx+1])  # pyre-ignore
                print("[DEBUG] Extracted JSON object from text with prefix")
    
    text = text.strip()
    
    # Strategy 3: Try to parse as-is
    try:
        parsed = json.loads(text)
        print(f"[DEBUG] Successfully parsed JSON")
        return parsed
    except json.JSONDecodeError as e:
        print(f"[WARNING] Initial JSON parse failed: {str(e)}")
        
        # Strategy 4: Fix common JSON issues (trailing commas, etc.)
        try:
            fixed_text = text
            fixed_text = re.sub(r',(\s*[}\]])', r'\g<1>', fixed_text)
            last_brace = int(fixed_text.rfind('}'))
            if last_brace != -1:
                fixed_text = str(fixed_text[:last_brace+1])  # pyre-ignore
            parsed = json.loads(fixed_text)
            print("[DEBUG] Successfully parsed after fixing trailing commas")
            return parsed
        except json.JSONDecodeError:
            pass
        
        # Strategy 5: Try first { to last }
        brace_start = int(text.find('{'))
        if brace_start != -1:
            last_brace = int(text.rfind('}'))
            if last_brace != -1:
                try:
                    potential_json = str(text[brace_start:last_brace+1])  # pyre-ignore
                    potential_json = re.sub(r',(\s*[}\]])', r'\g<1>', potential_json)
                    parsed = json.loads(potential_json)
                    print("[DEBUG] Successfully parsed using first { to last }")
                    return parsed
                except:
                    pass
        
        # Strategy 6: Fix incomplete JSON by closing unclosed brackets/braces
        try:
            fixed_text = text
            fixed_text = re.sub(r',(\s*[}\]])', r'\1', fixed_text)
            
            open_braces = fixed_text.count('{') - fixed_text.count('}')
            open_brackets = fixed_text.count('[') - fixed_text.count(']')
            
            if open_braces > 0 or open_brackets > 0:
                # Remove any trailing incomplete content after the last complete value
                # Try to find where the JSON breaks and close it
                fixed_text = fixed_text.rstrip()
                
                # Close open brackets first (they're usually inside objects)
                for _ in range(open_brackets):
                    fixed_text += ']'
                for _ in range(open_braces):
                    fixed_text += '}'
                
                fixed_text = re.sub(r',(\s*[}\]])', r'\g<1>', fixed_text)
                
                parsed = json.loads(str(fixed_text))
                print(f"[DEBUG] Successfully parsed after closing {open_braces} braces and {open_brackets} brackets")
                return parsed
        except:
            pass
        
        print(f"[ERROR] All JSON extraction strategies failed")
        print(f"[DEBUG] First 500 chars: {original_text[:500]}")  # pyre-ignore
        return {}


# ===================== Validation =====================

def validate_and_normalize_plan(plan: dict) -> dict:
    """
    Validate the AI-generated plan and normalize it:
    - Ensure milestones exist
    - Ensure budget percentages sum to 100
    - Ensure milestones are sorted by deadlineOffsetDays
    - Ensure all required fields have values
    """
    if "milestones" not in plan or not isinstance(plan["milestones"], list):
        raise ValueError("AI response missing 'milestones' array")
    
    milestones = plan["milestones"]
    
    if len(milestones) == 0:
        raise ValueError("AI generated 0 milestones")
    
    # Validate and clean each milestone
    for i, ms in enumerate(milestones):
        # Ensure required fields
        if not ms.get("title"):
            ms["title"] = f"Milestone {i + 1}"
        if not ms.get("description"):
            ms["description"] = ""
        
        # Ensure numeric fields
        if not isinstance(ms.get("deadlineOffsetDays"), (int, float)):
            ms["deadlineOffsetDays"] = (i + 1) * 14  # Default: 2 weeks per milestone
        ms["deadlineOffsetDays"] = int(ms["deadlineOffsetDays"])
        
        if not isinstance(ms.get("budgetPercentage"), (int, float)):
            ms["budgetPercentage"] = 0
        ms["budgetPercentage"] = float(ms["budgetPercentage"])
        
        # Ensure tasks exist
        if not isinstance(ms.get("tasks"), list):
            ms["tasks"] = []
        
        # Clean tasks
        for j, task in enumerate(ms["tasks"]):
            if not isinstance(task, dict):
                ms["tasks"][j] = {"title": str(task), "description": ""}
            else:
                if not task.get("title"):
                    task["title"] = f"Task {j + 1}"
                if not task.get("description"):
                    task["description"] = ""
    
    # Normalize budget percentages to sum to exactly 100
    total_budget = sum(float(ms.get("budgetPercentage", 0.0)) for ms in milestones)
    if total_budget > 0 and abs(total_budget - 100) > 0.01:
        print(f"[DEBUG] Budget percentages sum to {total_budget}, normalizing to 100")
        scale_factor = 100.0 / total_budget
        for ms in milestones:
            val = float(ms["budgetPercentage"]) * scale_factor
            ms["budgetPercentage"] = float(round(val, 1))  # pyre-ignore
        
        # Fix rounding: adjust last milestone so total is exactly 100
        current_sum = sum(float(ms["budgetPercentage"]) for ms in milestones[:-1])
        ms_final_val = 100.0 - current_sum
        milestones[-1]["budgetPercentage"] = float(round(ms_final_val)) if current_sum == 100 else float(round(ms_final_val, 1)) # pyre-ignore
    elif total_budget == 0:
        # AI didn't return budget percentages, distribute evenly
        even_share = float(round(100.0 / len(milestones), 1))  # pyre-ignore
        for ms in milestones:
            ms["budgetPercentage"] = even_share
        current_sum = sum(float(ms["budgetPercentage"]) for ms in milestones[:-1])
        ms_final_val = 100.0 - current_sum
        milestones[-1]["budgetPercentage"] = float(round(ms_final_val, 1))  # pyre-ignore
    
    # Sort milestones by deadlineOffsetDays (ascending)
    milestones.sort(key=lambda ms: ms["deadlineOffsetDays"])
    
    plan["milestones"] = milestones
    return plan


# ===================== Groq API Call =====================

def call_groq_for_plan(project_name: str, project_description: str, deadline: str, budget: float) -> dict:
    """Send project details to Groq LLM and get back a structured project plan."""
    
    if not GROQ_API_KEY:
        print("[ERROR] GROQ_API_KEY not set in environment")
        raise ValueError("GROQ_API_KEY not set in environment. Please set it in the .env file.")
    
    prompt = build_prompt(project_name, project_description, deadline, budget)
    
    print(f"[DEBUG] Sending project plan request to Groq API for: {project_name}")
    
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'messages': [
            {
                'role': 'system', 
                'content': 'You are a software project planning assistant. You ALWAYS return ONLY valid JSON. Never include explanations or text outside the JSON object.'
            },
            {
                'role': 'user', 
                'content': prompt
            }
        ],
        'model': 'llama-3.1-8b-instant',
        'max_tokens': 4096,
        'temperature': 0.3  # Low temperature for consistent, deterministic plans
    }
    
    try:
        print("[DEBUG] Making request to Groq API...")
        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=60
        )
        print(f"[DEBUG] Groq API response status: {response.status_code}")
        response.raise_for_status()
        
        response_data = response.json()
        if 'choices' not in response_data or not response_data['choices']:
            raise ValueError("Invalid response from Groq API: missing choices")
        
        content = response_data['choices'][0]['message']['content']
        print(f"[DEBUG] Groq returned {len(content)} characters of content")
        
        # Check if response was truncated
        finish_reason = response_data['choices'][0].get('finish_reason', '')
        if finish_reason == 'length':
            print("[WARNING] Groq response was truncated (hit max_tokens limit)")
        
        # Extract JSON from response
        plan_json = extract_json_from_response(content)
        
        if not plan_json:
            print("[ERROR] Failed to extract JSON from Groq response")
            print(f"[DEBUG] Raw content (first 1000 chars): {content[:1000]}")
            raise ValueError("Groq returned empty or invalid JSON")
        
        # Validate and normalize the plan
        plan_json = validate_and_normalize_plan(plan_json)
        
        print(f"[DEBUG] Successfully generated plan with {len(plan_json.get('milestones', []))} milestones")
        return plan_json
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Groq API request failed: {str(e)}")
        raise Exception(f"Groq API request error: {str(e)}")
    except ValueError as e:
        raise e
    except Exception as e:
        print(f"[ERROR] Unexpected error: {str(e)}")
        raise Exception(f"AI planning error: {str(e)}")


# ===================== API Endpoints =====================

@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "service": "AI Project Planner",
        "status": "running",
        "version": "1.0.0"
    }


@app.post("/api/generate-plan", response_model=ProjectPlanResponse)
async def generate_plan(request: ProjectPlanRequest):
    """
    Generate a project plan from a project description.
    
    Receives project details (name, description, deadline, budget)
    and returns milestones + tasks as structured JSON.
    
    Args:
        request: ProjectPlanRequest with project details
    
    Returns:
        ProjectPlanResponse: Structured plan with milestones and tasks
    """
    try:
        print(f"[DEBUG] Received plan request for project: {request.projectName}")
        
        # Validate inputs
        if not request.projectName.strip():
            raise HTTPException(status_code=400, detail="Project name is required")
        if not request.projectDescription.strip():
            raise HTTPException(status_code=400, detail="Project description is required")
        if not request.deadline.strip():
            raise HTTPException(status_code=400, detail="Project deadline is required")
        if request.budget <= 0:
            raise HTTPException(status_code=400, detail="Project budget must be greater than 0")
        
        # Call Groq to generate the plan
        plan_json = call_groq_for_plan(
            project_name=request.projectName.strip(),
            project_description=request.projectDescription.strip(),
            deadline=request.deadline.strip(),
            budget=request.budget
        )
        
        # Convert to Pydantic model for validation and serialization
        try:
            result = ProjectPlanResponse(**plan_json)
            total_tasks = sum(len(ms.tasks) for ms in result.milestones)
            print(f"[DEBUG] Returning plan: {len(result.milestones)} milestones, {total_tasks} total tasks")
            return result
        except Exception as e:
            print(f"[ERROR] Pydantic validation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Response validation error: {str(e)}")
    
    except HTTPException:
        raise
    except ValueError as ve:
        print(f"[ERROR] ValueError: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        import traceback
        print(f"[ERROR] Unexpected error: {str(e)}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate project plan: {str(e)}")


# ===================== Run Server =====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
