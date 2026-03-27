"""
AI Allocation Service - Managix Layer 3
FastAPI service for AI-powered team formation and task allocation using Groq LLM.
Runs on port 8001.
"""

import os
import re
import json
import requests
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

app = FastAPI(
    title="AI Allocation Service",
    description="AI-powered team formation and task allocation for Managix",
    version="1.0.0",
)

# CORS - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class ExperienceItem(BaseModel):
    title: Optional[str] = ""
    company: Optional[str] = ""
    duration: Optional[str] = ""

class EmployeeInfo(BaseModel):
    userId: str
    name: str
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    activeTasks: int = 0

class ProjectInfo(BaseModel):
    projectId: str
    title: str
    description: str

class TaskInfo(BaseModel):
    taskId: str
    title: str
    description: str = ""

class TeamMemberInfo(BaseModel):
    userId: str
    name: str
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    activeTasks: int = 0

# Request models with Swagger examples

class SuggestTeamRequest(BaseModel):
    project: ProjectInfo
    employees: List[EmployeeInfo]

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "project": {
                    "projectId": "proj-001",
                    "title": "E-Commerce Platform",
                    "description": "Build a full-stack e-commerce platform with React frontend, .NET backend, payment integration, and admin dashboard"
                },
                "employees": [
                    {"userId": "emp-001", "name": "Alice Smith", "skills": ["React", "TypeScript", "Tailwind CSS", "Next.js"], "experience": [{"title": "Frontend Developer", "company": "TechCo", "duration": "3 years"}], "activeTasks": 1},
                    {"userId": "emp-002", "name": "Bob Johnson", "skills": [".NET", "C#", "SQL Server", "Azure", "REST APIs"], "experience": [{"title": "Backend Developer", "company": "SoftInc", "duration": "4 years"}], "activeTasks": 2},
                    {"userId": "emp-003", "name": "Charlie Brown", "skills": ["React", ".NET", "Docker", "PostgreSQL"], "experience": [{"title": "Full Stack Developer", "company": "DevHub", "duration": "2 years"}], "activeTasks": 0},
                    {"userId": "emp-004", "name": "Diana Prince", "skills": ["Selenium", "Jest", "Cypress", "QA Testing"], "experience": [{"title": "QA Engineer", "company": "QualityCo", "duration": "2 years"}], "activeTasks": 1},
                    {"userId": "emp-005", "name": "Eve Wilson", "skills": ["Flutter", "Firebase", "Dart"], "experience": [{"title": "Mobile Developer", "company": "AppStudio", "duration": "1 year"}], "activeTasks": 3}
                ]
            }]
        }
    }

class SuggestEmployeesRequest(BaseModel):
    projectDescription: str
    employees: List[EmployeeInfo]

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "projectDescription": "Build a React Native mobile app with Firebase backend for a food delivery service. Features include real-time order tracking, payment gateway, and push notifications.",
                "employees": [
                    {"userId": "emp-001", "name": "Alice Smith", "skills": ["React", "React Native", "JavaScript", "Firebase"], "experience": [{"title": "Mobile Developer", "company": "AppCo", "duration": "2 years"}], "activeTasks": 1},
                    {"userId": "emp-002", "name": "Bob Johnson", "skills": [".NET", "C#", "SQL Server"], "experience": [{"title": "Backend Developer", "company": "Corp", "duration": "3 years"}], "activeTasks": 3},
                    {"userId": "emp-003", "name": "Charlie Brown", "skills": ["Python", "Firebase", "React", "Node.js"], "experience": [{"title": "Full Stack Developer", "company": "StartUp", "duration": "1 year"}], "activeTasks": 0},
                    {"userId": "emp-004", "name": "Diana Prince", "skills": ["Flutter", "Dart", "Firebase", "REST APIs"], "experience": [{"title": "Mobile Developer", "company": "MobileFirst", "duration": "2 years"}], "activeTasks": 2}
                ]
            }]
        }
    }

class SuggestTaskAllocationRequest(BaseModel):
    tasks: List[TaskInfo]
    teamMembers: List[TeamMemberInfo]

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "tasks": [
                    {"taskId": "task-001", "title": "Setup React Project", "description": "Initialize React project with TypeScript, Tailwind CSS, and folder structure"},
                    {"taskId": "task-002", "title": "Create REST API Endpoints", "description": "Build REST API with .NET for user management, authentication, and CRUD operations"},
                    {"taskId": "task-003", "title": "Design Database Schema", "description": "Design and implement SQL Server database schema with Entity Framework migrations"},
                    {"taskId": "task-004", "title": "Write Unit Tests", "description": "Create comprehensive test suite covering all API endpoints and business logic"},
                    {"taskId": "task-005", "title": "Implement Payment Gateway", "description": "Integrate Stripe payment gateway for order checkout and subscription billing"}
                ],
                "teamMembers": [
                    {"userId": "emp-001", "name": "Alice Smith", "skills": ["React", "TypeScript", "CSS", "Next.js"], "experience": [{"title": "Frontend Developer", "company": "TechCo", "duration": "3 years"}], "activeTasks": 1},
                    {"userId": "emp-002", "name": "Bob Johnson", "skills": [".NET", "C#", "SQL Server", "Entity Framework"], "experience": [{"title": "Backend Developer", "company": "SoftInc", "duration": "4 years"}], "activeTasks": 0},
                    {"userId": "emp-003", "name": "Charlie Brown", "skills": ["Testing", "Jest", "Selenium", "Cypress"], "experience": [{"title": "QA Engineer", "company": "QualityCo", "duration": "2 years"}], "activeTasks": 2}
                ]
            }]
        }
    }

# ---------------------------------------------------------------------------
# Groq JSON extraction (copied from resume_parser/fastapi_app.py lines 151-319)
# ---------------------------------------------------------------------------

def extract_json_from_groq_response(response_text: str) -> dict:
    """Extract JSON from Groq response (handles markdown code blocks and text before JSON)"""
    if not response_text:
        print("[WARNING] Empty response text from Groq")
        return {}

    text = response_text.strip()
    original_text = text

    # Strategy 1: Look for JSON in markdown code blocks first (most reliable)
    # Handle both complete and incomplete code blocks
    if "```json" in text or "```" in text:
        # Find all code block markers
        code_blocks = list(re.finditer(r'```(?:json)?', text))
        if code_blocks:
            # Extract content from first code block
            start_marker = code_blocks[0].end()
            # Find the next ``` after start_marker, or use end of text if not found
            end_marker = text.find("```", start_marker)
            if end_marker == -1:
                # No closing ```, use end of text (incomplete JSON from Groq)
                end_marker = len(text)
                print("[DEBUG] No closing ``` found, using end of text (JSON might be incomplete)")

            text = text[start_marker:end_marker].strip()
            print("[DEBUG] Extracted JSON from markdown code block")

    text = text.strip()

    # Strategy 3: Find JSON object boundaries by matching braces (handles text before JSON)
    if not text.startswith("{"):
        start_idx = text.find("{")
        if start_idx != -1:
            # Count braces to find the matching closing brace
            brace_count = 0
            end_idx = -1
            for i in range(start_idx, len(text)):
                if text[i] == '{':
                    brace_count += 1
                elif text[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = i
                        break

            if end_idx != -1 and end_idx > start_idx:
                text = text[start_idx:end_idx+1]
                print("[DEBUG] Extracted JSON object from text with prefix (handled nested braces)")

    text = text.strip()

    # Strategy 4: Try to parse as-is
    try:
        parsed = json.loads(text)
        print(f"[DEBUG] Successfully parsed JSON with {len(parsed)} top-level keys")
        return parsed
    except json.JSONDecodeError as e:
        print(f"[WARNING] Initial JSON parse failed: {str(e)} at position {e.pos}")
        print(f"[DEBUG] Text around error (chars {max(0, e.pos-100)} to {min(len(text), e.pos+100)}):")
        print(f"  ...{text[max(0, e.pos-100):e.pos+100]}...")

        # Strategy 5: Fix common JSON issues
        try:
            fixed_text = text
            # Remove trailing commas
            fixed_text = re.sub(r',(\s*[}\]])', r'\1', fixed_text)
            # Fix unclosed strings (if any)
            # Remove any text after the last }
            last_brace = fixed_text.rfind('}')
            if last_brace != -1:
                fixed_text = fixed_text[:last_brace+1]

            parsed = json.loads(fixed_text)
            print("[DEBUG] Successfully parsed after fixing JSON issues (trailing commas, etc.)")
            return parsed
        except json.JSONDecodeError as e2:
            print(f"[ERROR] JSON decode error after fixes: {str(e2)} at position {e2.pos}")

            # Strategy 6: Try progressive truncation from the end
            # Sometimes Groq returns incomplete JSON or extra text
            brace_start = text.find('{')
            if brace_start != -1:
                print(f"[DEBUG] Attempting progressive truncation from position {len(text)}")
                # Try different end positions, starting from the last } and working backwards
                last_brace = text.rfind('}')
                if last_brace != -1:
                    # Try parsing from first { to last }
                    try:
                        potential_json = text[brace_start:last_brace+1]
                        parsed = json.loads(potential_json)
                        print(f"[DEBUG] Successfully parsed by using first {{ to last }}")
                        return parsed
                    except:
                        pass

                # Try truncating character by character from the end
                for truncate_pos in range(len(text), brace_start + 50, -1):
                    try:
                        potential_json = text[brace_start:truncate_pos]
                        # Check if it's valid JSON structure
                        if potential_json.count('{') == potential_json.count('}'):
                            parsed = json.loads(potential_json)
                            print(f"[DEBUG] Successfully parsed by truncating to position {truncate_pos}")
                            return parsed
                    except:
                        continue

            # Strategy 7: Try to fix incomplete JSON by closing arrays/objects intelligently
            try:
                fixed_text = text

                # Remove trailing commas first
                fixed_text = re.sub(r',(\s*[}\]])', r'\1', fixed_text)

                # Count unclosed brackets/braces
                open_braces = fixed_text.count('{') - fixed_text.count('}')
                open_brackets = fixed_text.count('[') - fixed_text.count(']')

                # If we have unclosed structures, try to fix them
                if open_braces > 0 or open_brackets > 0:
                    # Find where the JSON is incomplete and close it properly
                    # Close brackets first (they're inside objects), then braces
                    if open_brackets > 0:
                        # Find the last unclosed array
                        last_open_bracket = fixed_text.rfind('[')
                        if last_open_bracket != -1:
                            # Check if it has content
                            after_bracket = fixed_text[last_open_bracket+1:].strip()
                            if after_bracket and not after_bracket.startswith(']'):
                                # There's content, need to close the array
                                # Find a safe place to insert ]
                                # Look for the last complete item before the truncation
                                fixed_text = fixed_text.rstrip()
                                if not fixed_text.endswith(']'):
                                    fixed_text += ']'
                                    open_brackets -= 1

                    # Close braces
                    if open_braces > 0:
                        fixed_text = fixed_text.rstrip()
                        if not fixed_text.endswith('}'):
                            # Find where to close - before the last incomplete structure
                            fixed_text += '\n' + '}' * open_braces

                    # Close remaining brackets
                    if open_brackets > 0:
                        fixed_text += '\n' + ']' * open_brackets

                # Remove any trailing commas again after closing
                fixed_text = re.sub(r',(\s*[}\]])', r'\1', fixed_text)

                parsed = json.loads(fixed_text)
                print(f"[DEBUG] Successfully parsed after closing {open_braces} braces and {open_brackets} brackets")
                return parsed
            except Exception as e3:
                print(f"[WARNING] Failed to fix incomplete JSON: {str(e3)}")
                import traceback
                print(f"[DEBUG] Traceback: {traceback.format_exc()}")

            # Strategy 8: Last resort - try to extract partial data and return what we can
            print(f"[ERROR] All JSON extraction strategies failed")
            print(f"[DEBUG] Full response text length: {len(original_text)}")
            print(f"[DEBUG] First 1000 chars of original: {original_text[:1000]}")
            print(f"[DEBUG] Last 500 chars of original: {original_text[-500:]}")
            print(f"[DEBUG] Extracted text length: {len(text)}")
            print(f"[DEBUG] First 1000 chars of extracted: {text[:1000]}")

            # Return empty dict so caller can handle gracefully
            return {}

# ---------------------------------------------------------------------------
# Groq LLM helper
# ---------------------------------------------------------------------------

SYSTEM_MESSAGE = (
    "You are an AI project management assistant that specializes in team formation "
    "and task allocation. Always return complete, valid JSON. Never truncate your response."
)

def call_groq(prompt: str) -> dict:
    """Call Groq LLM and return parsed JSON."""
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_MESSAGE},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 4096,
        "temperature": 0.3,
    }

    print(f"[DEBUG] Sending request to Groq API ({GROQ_MODEL})...")
    print(f"[DEBUG] Prompt length: {len(prompt)} chars")

    response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
    print(f"[DEBUG] Groq API response status: {response.status_code}")

    if response.status_code != 200:
        error_detail = response.text
        print(f"[ERROR] Groq API error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Groq API error: {error_detail}")

    data = response.json()
    raw_text = data["choices"][0]["message"]["content"]
    print(f"[DEBUG] Groq raw response length: {len(raw_text)} chars")
    print(f"[DEBUG] Groq raw response (first 500 chars): {raw_text[:500]}")

    parsed = extract_json_from_groq_response(raw_text)
    if not parsed:
        print("[ERROR] Failed to extract JSON from Groq response")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse AI response. The model returned invalid JSON.",
        )
    return parsed

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    return {
        "service": "AI Allocation Service",
        "status": "running",
        "version": "1.0.0",
    }


@app.post("/suggest-team")
def suggest_team(req: SuggestTeamRequest):
    """Suggest an optimal team for a project based on employee skills, experience, and workload."""
    try:
        employees_text = ""
        for emp in req.employees:
            exp_str = "; ".join(
                [f"{e.title} at {e.company} ({e.duration})" for e in emp.experience if e.title]
            ) or "No experience listed"
            employees_text += (
                f"- Employee ID: {emp.userId}, Name: {emp.name}, "
                f"Skills: [{', '.join(emp.skills)}], "
                f"Experience: [{exp_str}], "
                f"Active Tasks: {emp.activeTasks}\n"
            )

        prompt = f"""You are an AI project management assistant. Your task is to analyze a project and suggest the optimal team from the available employees.

PROJECT DETAILS:
- Project ID: {req.project.projectId}
- Title: {req.project.title}
- Description: {req.project.description}

AVAILABLE EMPLOYEES:
{employees_text}

INSTRUCTIONS:
1. Carefully analyze the project title and description to understand what skills and expertise are needed.
2. Review each employee's skills, experience, and current workload (active tasks).
3. Select the best employees for the project team based on skill match, relevant experience, and workload availability.
4. Prefer employees who have lower active task counts (less busy) when skill levels are similar.
5. Match employee skills directly to project requirements.
6. Assign a clear, specific role to each selected team member that reflects their contribution to the project.
7. Provide a concise reason for each selection explaining why they are a good fit.

OUTPUT FORMAT:
Return a JSON object with the following exact structure:
{{
  "team": [
    {{
      "userId": "<the employee's userId>",
      "role": "<specific role for this project, e.g. Frontend Developer, Backend Lead, UI/UX Designer>",
      "reason": "<brief explanation of why this employee was selected>"
    }}
  ]
}}

RULES:
- Only include employees from the provided list. CRITICAL: You MUST copy-paste the EXACT userId strings from the input. They are long UUIDs like "49f48835-64c9-4384-a798-c78f5abe86ee". Do NOT shorten or modify them.
- Each team member must have a unique, project-relevant role.
- Prefer employees with fewer active tasks when skills are comparable.
- Do not select more team members than necessary for the project scope.
- If the project is small, a team of 2-4 is appropriate. For larger projects, up to 6-8 members.

Return ONLY valid JSON. Do not include any explanation or extra text."""

        print(f"[DEBUG] /suggest-team called for project: {req.project.title}")
        result = call_groq(prompt)
        print(f"[DEBUG] /suggest-team result keys: {list(result.keys())}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /suggest-team failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI team suggestion failed: {str(e)}")


@app.post("/suggest-employees")
def suggest_employees(req: SuggestEmployeesRequest):
    """Rank employees by match score for a given project description."""
    try:
        employees_text = ""
        for emp in req.employees:
            exp_str = "; ".join(
                [f"{e.title} at {e.company} ({e.duration})" for e in emp.experience if e.title]
            ) or "No experience listed"
            employees_text += (
                f"- Employee ID: {emp.userId}, Name: {emp.name}, "
                f"Skills: [{', '.join(emp.skills)}], "
                f"Experience: [{exp_str}], "
                f"Active Tasks: {emp.activeTasks}\n"
            )

        prompt = f"""You are an AI project management assistant. Your task is to rank all employees by how well they match a project description.

PROJECT DESCRIPTION:
{req.projectDescription}

AVAILABLE EMPLOYEES:
{employees_text}

INSTRUCTIONS:
1. Analyze the project description to identify required skills, technologies, and expertise areas.
2. For each employee, calculate a match score from 0 to 100 based on:
   - Skill relevance: How closely the employee's skills match the project needs (50% weight).
   - Experience relevance: How relevant the employee's past experience is to this project (30% weight).
   - Workload availability: Employees with fewer active tasks get a higher availability bonus (20% weight). An employee with 0 active tasks gets full 20 points, while an employee with 5+ active tasks gets 0 availability points.
3. Sort employees from highest match score to lowest.
4. Provide a concise reason for each employee's score explaining the key factors.

OUTPUT FORMAT:
Return a JSON object with the following exact structure:
{{
  "recommendedEmployees": [
    {{
      "userId": "<the employee's userId>",
      "matchScore": <integer from 0 to 100>,
      "reason": "<brief explanation of score based on skill match, experience, and workload>"
    }}
  ]
}}

RULES:
- Include ALL employees from the list, ranked from highest to lowest match score.
- CRITICAL: You MUST copy-paste the EXACT userId strings from the input. They are long UUIDs like "49f48835-64c9-4384-a798-c78f5abe86ee". Do NOT shorten or replace them with "emp-1" or similar.
- matchScore must be an integer between 0 and 100.
- Be objective and consistent in scoring.
- Employees with directly matching skills should score significantly higher than those without.
- Employees who are overloaded (many active tasks) should have their score reduced.

Return ONLY valid JSON. Do not include any explanation or extra text."""

        print(f"[DEBUG] /suggest-employees called")
        result = call_groq(prompt)
        print(f"[DEBUG] /suggest-employees result keys: {list(result.keys())}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /suggest-employees failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI employee suggestion failed: {str(e)}")


@app.post("/suggest-task-allocation")
def suggest_task_allocation(req: SuggestTaskAllocationRequest):
    """Assign each task to the best-suited team member."""
    try:
        tasks_text = ""
        for task in req.tasks:
            tasks_text += (
                f"- Task ID: {task.taskId}, Title: {task.title}, "
                f"Description: {task.description or 'No description provided'}\n"
            )

        members_text = ""
        for mem in req.teamMembers:
            exp_str = "; ".join(
                [f"{e.title} at {e.company} ({e.duration})" for e in mem.experience if e.title]
            ) or "No experience listed"
            members_text += (
                f"- Member ID: {mem.userId}, Name: {mem.name}, "
                f"Skills: [{', '.join(mem.skills)}], "
                f"Experience: [{exp_str}], "
                f"Active Tasks: {mem.activeTasks}\n"
            )

        prompt = f"""You are an AI project management assistant. Your task is to assign each task to the most suitable team member.

TASKS TO ASSIGN:
{tasks_text}

TEAM MEMBERS:
{members_text}

INSTRUCTIONS:
1. Analyze each task's title and description to understand what skills and expertise it requires.
2. For each task, evaluate all team members and select the best match based on:
   - Skill match: Does the team member have the skills needed for this task?
   - Experience: Has the team member worked on similar tasks or projects before?
   - Current workload: How many active tasks does the team member already have? Prefer members with fewer active tasks.
3. Distribute tasks fairly across team members. Do NOT assign all tasks to one person even if they are the most skilled.
4. For complex or critical tasks, prefer more experienced team members.
5. For simpler tasks, prefer team members with lighter workloads.
6. Provide a confidence score (0-100) indicating how confident you are in each assignment.
7. Provide a reason explaining why each task was assigned to the chosen team member.

OUTPUT FORMAT:
Return a JSON object with the following exact structure:
{{
  "taskAssignments": [
    {{
      "taskId": "<the task's taskId>",
      "userId": "<the assigned team member's userId>",
      "reason": "<brief explanation of why this member is the best fit for this task>",
      "confidence": <integer from 0 to 100>
    }}
  ]
}}

RULES:
- Every task must be assigned to exactly one team member.
- CRITICAL: You MUST copy-paste the EXACT taskId and userId strings from the input above. They are long UUIDs like "802b9708-0a9f-4832-8ddb-4306d71ac4b4". Do NOT shorten them or replace them with "user1", "task-1" etc.
- Do not assign all tasks to a single person. Balance the workload across the team.
- When calculating workload, consider both existing activeTasks AND the new tasks you are assigning in this response.
- confidence must be an integer between 0 and 100.
- Higher confidence means the skill match and experience alignment are strong.
- Lower confidence means the assignment is acceptable but not ideal.

Return ONLY valid JSON. Do not include any explanation or extra text."""

        print(f"[DEBUG] /suggest-task-allocation called with {len(req.tasks)} tasks and {len(req.teamMembers)} members")
        result = call_groq(prompt)
        print(f"[DEBUG] /suggest-task-allocation result keys: {list(result.keys())}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /suggest-task-allocation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI task allocation failed: {str(e)}")


# ---------------------------------------------------------------------------
# Feature 4: Generate Project Plan (Milestones + Tasks)
# ---------------------------------------------------------------------------

class GeneratePlanRequest(BaseModel):
    projectName: str
    projectDescription: str
    deadline: str = "90 days"
    budget: float = 50000

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "projectName": "SmartHealth - Patient Management System",
                "projectDescription": "Build a full-stack patient management system for hospitals. Features include patient registration, doctor appointment scheduling, medical records management with CRUD operations, prescription tracking, real-time notifications using SignalR, a React dashboard with charts for hospital analytics, .NET Core REST API backend, SQL Server database with Entity Framework, role-based access for doctors, nurses, and admin staff, and a reporting module for generating monthly health statistics.",
                "deadline": "90 days",
                "budget": 50000
            }]
        }
    }


@app.post("/api/generate-plan")
def generate_plan(req: GeneratePlanRequest):
    """Generate milestones and tasks for a project based on its description. Pure INPUT -> AI -> JSON OUTPUT."""
    try:
        prompt = f"""You are an AI project planning assistant. Generate a detailed project plan with milestones and tasks.

PROJECT DETAILS:
- Name: {req.projectName}
- Description: {req.projectDescription}
- Deadline: {req.deadline}
- Budget: {req.budget}

INSTRUCTIONS:
1. Break the project into 4-6 logical milestones that cover the full project lifecycle.
2. Each milestone should have 3-5 specific, actionable tasks.
3. Milestones should be ordered chronologically (what comes first in development).
4. deadlineOffsetDays = number of days from project start when this milestone should be completed.
5. budgetPercentage = what percentage of total budget this milestone should use (all must add up to 100).
6. Task descriptions should be clear and specific enough for a developer to understand what to build.

OUTPUT FORMAT:
Return a JSON object with the following exact structure:
{{
  "milestones": [
    {{
      "title": "<milestone title>",
      "description": "<what this milestone covers>",
      "deadlineOffsetDays": <number>,
      "budgetPercentage": <number>,
      "tasks": [
        {{
          "title": "<task title>",
          "description": "<detailed task description>"
        }}
      ]
    }}
  ]
}}

RULES:
- Generate 4-6 milestones with 3-5 tasks each.
- deadlineOffsetDays must increase with each milestone (first milestone earliest, last milestone near the deadline).
- budgetPercentage across all milestones must add up to 100.
- Task descriptions must be specific and actionable.
- Include milestones for: Planning, Development (split by frontend/backend if applicable), Testing/QA, and Deployment.

Return ONLY valid JSON. Do not include any explanation or extra text."""

        print(f"[DEBUG] /api/generate-plan called for project: {req.projectName}")
        result = call_groq(prompt)
        print(f"[DEBUG] /api/generate-plan result keys: {list(result.keys())}")

        if "milestones" not in result:
            raise HTTPException(status_code=500, detail="AI did not return milestones")

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /api/generate-plan failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI plan generation failed: {str(e)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  AI Allocation Service - Managix Layer 3")
    print("  Starting on http://0.0.0.0:8002")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8002)
