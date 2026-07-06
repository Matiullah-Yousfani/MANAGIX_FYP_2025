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
from typing import List, Optional
import os
import requests
import json
import re
from pathlib import Path
from dotenv import load_dotenv

# Always load .env from this script's folder (cwd may differ when started via script).
_ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_FILE, override=False)
# Fallback: allocation service may share key via parent .env
load_dotenv(Path(__file__).resolve().parent.parent / "ai_allocation" / ".env", override=False)

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

MIN_DESCRIPTION_CHARS = 200
MIN_BUDGET_USD = 50.0
MIN_DISTINCT_WORDS = 35

def validate_description_quality(description: str) -> None:
    """Reject filler / low-quality descriptions before calling the LLM."""
    desc = (description or "").strip()
    if len(desc) < MIN_DESCRIPTION_CHARS:
        raise ValueError(f"Project description must be at least {MIN_DESCRIPTION_CHARS} characters.")
    lower = desc.lower()
    if re.search(r"lorem\s+ipsum|asdf{3,}|test\s+test\s+test|xxxx+|aaaa+|qwerty|keyboard\s+test", lower):
        raise ValueError("Description looks like placeholder or filler text.")
    words = [w for w in re.split(r"\W+", desc) if len(w) > 2]
    if len(words) < MIN_DISTINCT_WORDS:
        raise ValueError(f"Description needs at least {MIN_DISTINCT_WORDS} meaningful words.")
    distinct = len(set(w.lower() for w in words))
    if distinct < MIN_DISTINCT_WORDS:
        raise ValueError(f"Use at least {MIN_DISTINCT_WORDS} distinct words (found {distinct}).")
    counts: dict = {}
    for w in words:
        k = w.lower()
        counts[k] = counts.get(k, 0) + 1
    top_word = max(counts, key=counts.get)
    if counts[top_word] > max(8, int(len(words) * 0.12)):
        raise ValueError(f'Word "{top_word}" is repeated too often.')
    if not re.search(r"[.!?]", desc):
        raise ValueError("Write full sentences with goals, stakeholders, scope, and outcomes.")

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
    methodologyOptions: List[str] = []

class ProjectPlanResponse(BaseModel):
    """AI-generated project plan"""
    suggestedMethodology: str = ""
    methodologyRationale: str = ""
    milestones: List[MilestoneItem] = []

# ===================== Prompt Builder =====================

def build_prompt(
    project_name: str,
    project_description: str,
    deadline: str,
    budget: float,
    methodology_options: List[str],
) -> str:
    """Build the prompt that instructs Groq to generate a project plan."""

    meth_section = ""
    if methodology_options:
        meth_json = json.dumps(methodology_options)
        meth_section = f"""
Software development methodologies available (JSON array of exact names you must copy from):
{meth_json}

You MUST include top-level keys "suggestedMethodology" and "methodologyRationale".
- suggestedMethodology: set to EXACTLY one string from the list above (character-for-character match to one entry).
- methodologyRationale: 1-3 sentences on why that methodology fits this project.
If the list is empty, omit suggestedMethodology and methodologyRationale or set them to empty strings.
"""

    return f"""You are a professional project planning assistant for ANY domain (software, construction, marketing, events, research, healthcare, education, manufacturing, etc.).
Based on the following project information, generate a structured project plan that matches the ACTUAL domain described.

Project Name:
{project_name}

Project Description:
{project_description}

Project Deadline:
{deadline}

Project Budget (USD):
{budget}
{meth_section}
IMPORTANT — Domain and quality rules:
- Infer the true domain from the description. If it is NOT a software/IT project, do NOT use programming tasks (APIs, databases, React, deployment pipelines) unless explicitly required.
- Use domain-appropriate deliverables (e.g. site surveys for construction, campaigns for marketing, lesson plans for education).
- Descriptions may be concise or detailed; extract all explicit requirements.
- Do NOT invent unrelated technical scope. Do NOT produce a software plan for a non-software project.
- If the description is incoherent or not a real project brief, return JSON with "valid": false and "rejectionReason" explaining why — and an empty milestones array.

Break the project into logical milestones that fit THIS project's scope, description, and budget.
For each milestone provide:
- title
- description
- deadlineOffsetDays (relative timeline in days from project start, must be cumulative and ascending)
- budgetPercentage (percentage of project budget, all milestones must sum to exactly 100)
- tasks (each task must have title and description — at least 2 tasks per milestone)

Rules:
1. Scale scope to the budget: if budget is under $5,000 use 3-4 milestones with 2-4 tasks each; $5k-$20k use 4-5 milestones with 3-5 tasks; above $20k use 5-6 milestones with 4-6 tasks.
2. Milestone and task titles MUST reference the project domain — never generic-only names like "Phase 1 Work".
3. budgetPercentage values across all milestones must sum to exactly 100.
4. deadlineOffsetDays must be cumulative and fit within the total project timeline before the deadline.
5. Tasks must be concrete, deliverable items sized for the budget.
6. Every task title should start with a domain-appropriate action verb.
7. Task descriptions must mention concrete deliverables in 1-2 sentences.
8. Choose suggestedMethodology based on project nature — do NOT default to Agile for non-iterative projects (e.g. Waterfall for construction, Kanban for ongoing ops).

Return ONLY valid JSON in this exact structure:
{{
  "valid": true,
  "rejectionReason": "",
  "suggestedMethodology": "Exact name from methodology list or empty string",
  "methodologyRationale": "Short explanation or empty string",
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

def validate_and_normalize_plan(plan: dict, methodology_options: Optional[List[str]] = None) -> dict:
    """
    Validate the AI-generated plan and normalize it:
    - Ensure milestones exist
    - Ensure budget percentages sum to 100
    - Ensure milestones are sorted by deadlineOffsetDays
    - Ensure all required fields have values
    """
    if methodology_options is None:
        methodology_options = []

    if "suggestedMethodology" not in plan or not str(plan.get("suggestedMethodology", "")).strip():
        plan["suggestedMethodology"] = ""
    if "methodologyRationale" not in plan or plan["methodologyRationale"] is None:
        plan["methodologyRationale"] = ""

    if plan.get("valid") is False:
        reason = str(plan.get("rejectionReason") or "Description is not a valid project brief.")
        raise ValueError(reason)

    if methodology_options and plan.get("suggestedMethodology"):
        sm = str(plan["suggestedMethodology"]).strip()
        if not any(sm == m or sm.lower() == m.lower() for m in methodology_options):
            found = None
            for m in methodology_options:
                if sm.lower() in m.lower() or m.lower() in sm.lower():
                    found = m
                    break
            if found:
                plan["suggestedMethodology"] = found
            else:
                plan["suggestedMethodology"] = ""
        else:
            for m in methodology_options:
                if sm.lower() == m.lower():
                    plan["suggestedMethodology"] = m
                    break

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
        
        # Clean tasks — require at least one real task per milestone
        cleaned_tasks = []
        for j, task in enumerate(ms.get("tasks") or []):
            if not isinstance(task, dict):
                task = {"title": str(task), "description": ""}
            title = str(task.get("title") or "").strip()
            desc = str(task.get("description") or "").strip()
            if not title:
                continue
            cleaned_tasks.append({"title": title, "description": desc or title})
        if len(cleaned_tasks) == 0:
            raise ValueError(f"Milestone '{ms.get('title', i + 1)}' must include at least one task.")
        ms["tasks"] = cleaned_tasks
    
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

def call_groq_for_plan(
    project_name: str,
    project_description: str,
    deadline: str,
    budget: float,
    methodology_options: List[str],
) -> dict:
    """Send project details to Groq LLM and get back a structured project plan."""
    
    if not GROQ_API_KEY:
        print("[ERROR] GROQ_API_KEY not set in environment")
        raise ValueError("GROQ_API_KEY not set in environment. Please set it in the .env file.")
    
    prompt = build_prompt(project_name, project_description, deadline, budget, methodology_options)
    
    print(f"[DEBUG] Sending project plan request to Groq API for: {project_name}")
    
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    data = {
        'messages': [
            {
                'role': 'system', 
                'content': 'You are a domain-aware project planning assistant. You ALWAYS return ONLY valid JSON. Reject incoherent descriptions with valid:false. Never include explanations outside the JSON object.'
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
        plan_json = validate_and_normalize_plan(plan_json, methodology_options)
        
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
        "version": "1.0.0",
        "groqConfigured": bool(GROQ_API_KEY),
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
        if len(request.projectDescription.strip()) < MIN_DESCRIPTION_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"Project description must be at least {MIN_DESCRIPTION_CHARS} characters.",
            )
        try:
            validate_description_quality(request.projectDescription.strip())
        except ValueError as qe:
            raise HTTPException(status_code=400, detail=str(qe))
        if not request.deadline.strip():
            raise HTTPException(status_code=400, detail="Project deadline is required")
        if request.budget < MIN_BUDGET_USD:
            raise HTTPException(
                status_code=400,
                detail=f"Project budget must be at least ${MIN_BUDGET_USD:.0f}.",
            )
        
        # Call Groq to generate the plan
        opts = request.methodologyOptions if request.methodologyOptions else []
        plan_json = call_groq_for_plan(
            project_name=request.projectName.strip(),
            project_description=request.projectDescription.strip(),
            deadline=request.deadline.strip(),
            budget=request.budget,
            methodology_options=opts,
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


# ===================== PHASE 4: Meeting Task Extraction =====================
# Receives a meeting transcript + team-context payload from MANAGIX.Services.MeetingService
# (C# wrapper) and returns a list of structured task suggestions. The C# layer never
# auto-creates tasks — it always shows them in the modal for manager confirmation first.

class TeamMemberRef(BaseModel):
    userId: str = ""
    name: str = ""
    skills: List[str] = []

class ExtractTasksRequest(BaseModel):
    transcript: str = ""
    meetingTitle: Optional[str] = None
    projectId: Optional[str] = None
    teamMembers: List[TeamMemberRef] = []

class ExtractedTask(BaseModel):
    title: str = ""
    description: Optional[str] = None
    suggestedAssigneeUserId: Optional[str] = None
    suggestedAssigneeName: Optional[str] = None
    estimatedHours: Optional[float] = None
    priority: Optional[str] = "Medium"
    requiredSkills: List[str] = []

class ExtractTasksResponse(BaseModel):
    tasks: List[ExtractedTask] = []


def _build_extract_prompt(req: ExtractTasksRequest) -> str:
    """Compose the LLM prompt — explicit JSON schema, team-bound assignees."""
    member_lines = []
    for m in req.teamMembers[:25]:
        skills = ", ".join(m.skills[:8]) if m.skills else "(no listed skills)"
        member_lines.append(f"- {m.name} (id={m.userId}) — skills: {skills}")
    members_block = "\n".join(member_lines) if member_lines else "(no project team provided)"

    return f"""You are a project-management assistant. Read the meeting transcript and extract concrete action items.

For EACH action item, return:
  • title: short imperative (max 80 chars)
  • description: 1-2 sentences of context
  • suggestedAssigneeUserId: the userId of the BEST team member to handle this task (must come from the list below; null if no clear match)
  • suggestedAssigneeName: matching name
  • estimatedHours: rough effort 1-40 (number)
  • priority: "Low" | "Medium" | "High" | "Critical"
  • requiredSkills: short list of skill tags relevant to the work

Team members you may assign tasks to (use ONLY these userIds):
{members_block}

Meeting title: {req.meetingTitle or "(untitled)"}

Transcript:
\"\"\"
{req.transcript[:8000]}
\"\"\"

Respond with ONLY a JSON object of the form: {{"tasks": [...]}} — no commentary, no markdown.
"""


def _call_groq_extract(req: ExtractTasksRequest) -> dict:
    """Call Groq with the extraction prompt and parse the JSON response."""
    if not GROQ_API_KEY:
        # Degrade gracefully when no key — return empty list rather than 500.
        print("[WARN] GROQ_API_KEY missing; returning empty extraction.")
        return {"tasks": []}

    prompt = _build_extract_prompt(req)
    body = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": "You output strict JSON for project task extraction."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        json=body, headers=headers, timeout=60,
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]

    try:
        data = json.loads(raw)
    except Exception:
        # Try to recover from minor formatting noise.
        match = re.search(r"\{[\s\S]*\}", raw)
        data = json.loads(match.group(0)) if match else {"tasks": []}

    return data


class ParticipantTranscriptRef(BaseModel):
    userId: str = ""
    userName: str = ""
    transcript: str = ""

class AnalyzeMeetingRequest(BaseModel):
    transcript: str = ""
    meetingTitle: Optional[str] = None
    projectId: Optional[str] = None
    teamMembers: List[TeamMemberRef] = []
    participantTranscripts: List[ParticipantTranscriptRef] = []

class SpeedUpAlert(BaseModel):
    userId: Optional[str] = None
    userName: Optional[str] = None
    message: str = ""
    reason: Optional[str] = None

class BacklogItem(BaseModel):
    title: str = ""
    description: Optional[str] = None
    priority: Optional[str] = "Medium"
    suggestedAssigneeUserId: Optional[str] = None
    suggestedAssigneeName: Optional[str] = None

class MeetingAnalysisResponse(BaseModel):
    combinedSummary: Optional[str] = None
    meetingNotes: Optional[str] = None
    combinedTranscript: Optional[str] = None
    backlogItems: List[BacklogItem] = []
    participantTranscripts: List[ParticipantTranscriptRef] = []
    tasks: List[ExtractedTask] = []
    speedUpAlerts: List[SpeedUpAlert] = []
    finalized: bool = False


def _build_analyze_prompt(req: AnalyzeMeetingRequest) -> str:
    member_lines = []
    for m in req.teamMembers[:25]:
        skills = ", ".join(m.skills[:8]) if m.skills else "(no listed skills)"
        member_lines.append(f"- {m.name} (id={m.userId}) — skills: {skills}")
    members_block = "\n".join(member_lines) if member_lines else "(no project team provided)"

    per_participant = ""
    if req.participantTranscripts:
        blocks = []
        for p in req.participantTranscripts[:20]:
            blocks.append(
                f"Participant: {p.userName or p.userId}\n{p.transcript[:4000]}"
            )
        per_participant = "\n\n--- Per-participant transcripts ---\n" + "\n\n".join(blocks)

    return f"""You are a project-management assistant analyzing a team meeting.

Read the combined transcript and per-participant transcripts (with speaker names and timestamps).
Produce:
1) combinedSummary — 2-4 sentence executive overview of the meeting
2) meetingNotes — bullet-style meeting notes (key decisions, blockers, follow-ups) as plain text with newlines
3) tasks — concrete action items when people discussed creating work (same schema as task extraction)
4) backlogItems — product backlog items discussed (features, improvements, tech debt) not yet scheduled as tasks
5) speedUpAlerts — when someone is asked to speed up, work faster, catch up, or meet a deadline urgently.
   Each alert must name the employee (userId from team list) and a short notification message.

Team members (use ONLY these userIds for assignments and speed-up alerts):
{members_block}

Meeting title: {req.meetingTitle or "(untitled)"}

Combined transcript:
\"\"\"
{req.transcript[:12000]}
\"\"\"
{per_participant}

Respond with ONLY JSON:
{{
  "combinedSummary": "string",
  "meetingNotes": "string with bullet points",
  "backlogItems": [
    {{
      "title": "string",
      "description": "string",
      "priority": "Low|Medium|High|Critical",
      "suggestedAssigneeUserId": "uuid or null",
      "suggestedAssigneeName": "string or null"
    }}
  ],
  "tasks": [
    {{
      "title": "string",
      "description": "string",
      "suggestedAssigneeUserId": "uuid or null",
      "suggestedAssigneeName": "string or null",
      "estimatedHours": 4,
      "priority": "Medium",
      "requiredSkills": ["skill"]
    }}
  ],
  "speedUpAlerts": [
    {{
      "userId": "uuid from team list",
      "userName": "name",
      "message": "short notification text for the employee",
      "reason": "why they should speed up"
    }}
  ]
}}
"""


@app.post("/analyze-meeting", response_model=MeetingAnalysisResponse)
async def analyze_meeting(request: AnalyzeMeetingRequest):
    """Full meeting analysis: summary, tasks, speed-up alerts."""
    try:
        if not request.transcript or not request.transcript.strip():
            if not request.participantTranscripts:
                return MeetingAnalysisResponse()
            request.transcript = "\n\n".join(
                f"=== {p.userName or p.userId} ===\n{p.transcript}"
                for p in request.participantTranscripts
            )

        if not GROQ_API_KEY:
            print("[WARN] GROQ_API_KEY missing; returning empty analysis.")
            return MeetingAnalysisResponse(combinedSummary=request.transcript[:500])

        prompt = _build_analyze_prompt(request)
        body = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You output strict JSON for meeting analysis."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=body, headers=headers, timeout=90,
        )
        resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"]
        try:
            data = json.loads(raw)
        except Exception:
            match = re.search(r"\{[\s\S]*\}", raw)
            data = json.loads(match.group(0)) if match else {}

        valid_ids = {m.userId for m in request.teamMembers if m.userId}
        clean_tasks: list[ExtractedTask] = []
        for t in (data.get("tasks") or [])[:25]:
            if not isinstance(t, dict):
                continue
            title = (t.get("title") or "").strip()
            if not title:
                continue
            assignee_id = t.get("suggestedAssigneeUserId")
            if assignee_id and assignee_id not in valid_ids:
                assignee_id = None
            clean_tasks.append(ExtractedTask(
                title=title[:160],
                description=(t.get("description") or "")[:1000] or None,
                suggestedAssigneeUserId=assignee_id,
                suggestedAssigneeName=(t.get("suggestedAssigneeName") or None),
                estimatedHours=t.get("estimatedHours"),
                priority=(t.get("priority") or "Medium")[:16],
                requiredSkills=[s for s in (t.get("requiredSkills") or []) if isinstance(s, str)][:10],
            ))

        clean_alerts: list[SpeedUpAlert] = []
        for a in (data.get("speedUpAlerts") or [])[:15]:
            if not isinstance(a, dict):
                continue
            msg = (a.get("message") or "").strip()
            if not msg:
                continue
            uid = a.get("userId")
            if uid and uid not in valid_ids:
                uid = None
            clean_alerts.append(SpeedUpAlert(
                userId=uid,
                userName=(a.get("userName") or None),
                message=msg[:500],
                reason=(a.get("reason") or "")[:500] or None,
            ))

        clean_backlog: list[BacklogItem] = []
        for b in (data.get("backlogItems") or [])[:20]:
            if not isinstance(b, dict):
                continue
            title = (b.get("title") or "").strip()
            if not title:
                continue
            assignee_id = b.get("suggestedAssigneeUserId")
            if assignee_id and assignee_id not in valid_ids:
                assignee_id = None
            clean_backlog.append(BacklogItem(
                title=title[:160],
                description=(b.get("description") or "")[:1000] or None,
                priority=(b.get("priority") or "Medium")[:16],
                suggestedAssigneeUserId=assignee_id,
                suggestedAssigneeName=(b.get("suggestedAssigneeName") or None),
            ))

        return MeetingAnalysisResponse(
            combinedSummary=(data.get("combinedSummary") or "")[:2000] or None,
            meetingNotes=(data.get("meetingNotes") or "")[:8000] or None,
            backlogItems=clean_backlog,
            participantTranscripts=request.participantTranscripts,
            tasks=clean_tasks,
            speedUpAlerts=clean_alerts,
            finalized=True,
        )
    except requests.HTTPError as e:
        print(f"[ERROR] Groq HTTP error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq error: {e}")
    except Exception as e:
        import traceback
        print(f"[ERROR] analyze_meeting failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-tasks", response_model=ExtractTasksResponse)
async def extract_tasks_from_meeting(request: ExtractTasksRequest):
    """PHASE 4: Action-item extraction from a meeting transcript."""
    try:
        if not request.transcript or not request.transcript.strip():
            return ExtractTasksResponse(tasks=[])

        data = _call_groq_extract(request)
        raw_tasks = data.get("tasks", []) if isinstance(data, dict) else []

        # Validate / sanitize before returning to the C# layer.
        clean: list[ExtractedTask] = []
        valid_ids = {m.userId for m in request.teamMembers if m.userId}
        for t in raw_tasks[:25]:
            if not isinstance(t, dict):
                continue
            title = (t.get("title") or "").strip()
            if not title:
                continue
            assignee_id = t.get("suggestedAssigneeUserId")
            if assignee_id and assignee_id not in valid_ids:
                # LLM hallucinated an id — drop it; keep the name as a hint.
                assignee_id = None
            clean.append(ExtractedTask(
                title=title[:160],
                description=(t.get("description") or "")[:1000] or None,
                suggestedAssigneeUserId=assignee_id,
                suggestedAssigneeName=(t.get("suggestedAssigneeName") or None),
                estimatedHours=t.get("estimatedHours"),
                priority=(t.get("priority") or "Medium")[:16],
                requiredSkills=[s for s in (t.get("requiredSkills") or []) if isinstance(s, str)][:10],
            ))

        return ExtractTasksResponse(tasks=clean)
    except requests.HTTPError as e:
        print(f"[ERROR] Groq HTTP error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq error: {e}")
    except Exception as e:
        import traceback
        print(f"[ERROR] extract_tasks failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ===================== Run Server =====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
