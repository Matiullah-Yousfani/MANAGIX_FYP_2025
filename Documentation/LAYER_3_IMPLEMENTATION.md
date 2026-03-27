# Managix FYP — Layer 3: AI Resource Allocation

## Implementation Document

**Module:** AI Resource Allocation
**Completed:** March 27, 2026
**Status:** Fully Implemented & Tested

---

## 1. What Was Asked

Layer 3 is the **intelligence layer** of Managix. The requirements document specified three AI-powered features that assist managers in team formation and task assignment, following a strict principle:

> **INPUT → AI → JSON OUTPUT**
> The AI module must NOT save data, validate inputs, handle authentication, apply business rules, or modify any system state.

### 1.1 Feature 1 — Suggest Best Team for a Project

**Purpose:** Automatically generate a complete, optimized team based on project needs.

**Required Input:**
- Project information (projectId, title, description)
- All available employees with their skills, experience, and current active task count

**Required Output:**
- A list of suggested team members, each with:
  - `userId` — which employee
  - `role` — suggested role (e.g., "Backend Developer")
  - `reason` — AI's justification for the selection

**AI Logic Must Consider:**
- Project requirements extracted from description
- Employee skills (from ResumeSkill table)
- Experience level (from ResumeExperience table)
- Current workload (active tasks where Status = "Todo" or "InProgress")

### 1.2 Feature 2 — Suggest Employees During Team Creation

**Purpose:** Assist the manager while manually building a team by ranking employees.

**Required Input:**
- Project description text
- All available employees with skills, experience, and workload

**Required Output:**
- Ranked list of recommended employees, each with:
  - `userId` — which employee
  - `matchScore` — 0 to 100 compatibility score
  - `reason` — why this employee is a good match

**AI Logic Must Consider:**
- Skill matching against project needs
- Ranking employees by relevance
- Filtering best candidates considering availability

### 1.3 Feature 3 — Suggest Task Allocation

**Purpose:** Suggest the best employee for each unfinished task in a project.

**Required Input:**
- List of tasks (taskId, title, description)
- Team members with their skills, experience, and active task count

**Required Output:**
- Assignment list, each entry with:
  - `taskId` — which task
  - `userId` — assigned employee
  - `reason` — AI's justification
  - `confidence` — 0 to 100 confidence score

**AI Logic Must Consider:**
1. Skill matching (task requirements vs. employee skills)
2. Workload balancing (avoid overloading employees)
3. Experience level (critical tasks assigned to experienced employees)

### 1.4 Additional Requirements

- **Data Sources:** Only use existing database tables — no schema changes required
- **Workload Calculation:** Count tasks where `Status == "Todo"` OR `Status == "InProgress"`
- **Prompt Design:** Every AI request must end with "Return ONLY valid JSON"
- **Testing:** Provide sample inputs, sample outputs, JSON validation
- **Manager Workflow:** AI suggests → Manager reviews & confirms → Backend saves

---

## 2. System Architecture

The implementation follows the exact same architecture as Layer 2 (AI Resume Parser):

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   React      │     │  .NET Backend    │     │  Python FastAPI   │
│   Frontend   │────▶│  Azure Functions │────▶│  AI Service       │
│   (port 5173)│     │  (port 7005)     │     │  (port 8001)      │
└──────────────┘     └──────────────────┘     └──────────────────┘
                            │                        │
                     ┌──────┴──────┐          ┌──────┴──────┐
                     │  SQL Server │          │  Groq LLM   │
                     │  Database   │          │  API         │
                     └─────────────┘          └─────────────┘
```

**Data Flow:**
1. Manager clicks "Generate Suggestion" on the frontend
2. Frontend calls .NET backend API endpoint
3. Backend gathers all required data from the database (employees, skills, experience, tasks)
4. Backend constructs a structured JSON payload and sends it to the Python AI service
5. Python service builds a detailed prompt and sends it to Groq LLM (llama-3.1-8b-instant)
6. Groq returns a JSON response, Python parses and validates it
7. Response flows back through .NET backend to the frontend
8. Manager reviews the suggestions and can accept/reject before any data is saved

---

## 3. What Was Implemented

### 3.1 Python AI Service (`ai_allocation/`)

**Directory:** `D:\FYP-Project\MANAGIX_FYP_2025\ai_allocation\`
**Port:** 8001

#### Files Created:

| File | Purpose |
|------|---------|
| `ai_allocation_app.py` (553 lines) | Full FastAPI application with Groq LLM integration |
| `requirements.txt` | Python dependencies (fastapi, uvicorn, pydantic, requests, python-dotenv) |
| `.env` | Groq API key (same key as resume_parser service) |
| `start_ai_allocation.bat` | Windows startup script |

#### Endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check — returns service status |
| POST | `/suggest-team` | Analyzes project + employees, returns optimal team composition |
| POST | `/suggest-employees` | Ranks employees by match score for a project |
| POST | `/suggest-task-allocation` | Assigns tasks to team members optimally |

#### Key Implementation Details:

- **Groq LLM Model:** `llama-3.1-8b-instant` with `max_tokens: 4096`
- **JSON Extraction:** Copied the robust `extract_json_from_groq_response()` function from the resume parser, which handles 8 different strategies for extracting valid JSON from LLM responses (markdown code blocks, brace matching, trailing comma removal, progressive truncation, incomplete JSON repair)
- **Prompt Engineering:** Each endpoint builds a detailed structured prompt that includes:
  - Clear task description
  - All input data formatted as readable text
  - Exact expected JSON output format with examples
  - Scoring criteria (skill relevance, experience, workload)
  - Strict instruction to return only valid JSON
- **CORS:** Configured to allow all origins (matches resume_parser pattern)
- **Error Handling:** Try/catch around all Groq API calls with HTTP 500 responses on failure

#### Prompt Strategy per Endpoint:

**suggest-team:**
- Instructs AI to analyze project title and description
- Evaluates each employee's skills against inferred project requirements
- Considers workload (prefers employees with fewer active tasks)
- Returns team with clear role assignments and justifications

**suggest-employees:**
- Weighted scoring: skills (50%), experience (30%), workload availability (20%)
- Returns employees sorted by matchScore descending
- Provides detailed reasoning for each score

**suggest-task-allocation:**
- Matches task descriptions against employee skill sets
- Balances workload across team members
- Assigns higher confidence when skill match is strong
- Ensures every task gets exactly one assignee

---

### 3.2 Backend DTOs

**File:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX.Models\DTO\AiAllocationDto.cs`

All Data Transfer Objects in a single file under `MANAGIX.Models.DTO` namespace:

| DTO Class | Purpose |
|-----------|---------|
| `EmployeeInfoDto` | Employee data sent to Python (UserId, Name, Skills[], Experience[], ActiveTasks) |
| `ExperienceInfoDto` | Experience sub-object (Title, Company, Duration) |
| `SuggestTeamRequestDto` | Frontend → Backend request for Feature 1 (ProjectId) |
| `TeamSuggestionDto` | Single team member suggestion (UserId, Name, Role, Reason) |
| `SuggestTeamResponseDto` | Full Feature 1 response (Team[] of TeamSuggestionDto) |
| `SuggestEmployeesRequestDto` | Frontend → Backend request for Feature 2 (ProjectDescription) |
| `EmployeeRecommendationDto` | Single employee recommendation (UserId, Name, MatchScore, Reason) |
| `SuggestEmployeesResponseDto` | Full Feature 2 response (RecommendedEmployees[]) |
| `SuggestTaskAllocationRequestDto` | Frontend → Backend request for Feature 3 (ProjectId) |
| `TaskAssignmentDto` | Single task assignment (TaskId, UserId, TaskTitle, EmployeeName, Reason, Confidence) |
| `SuggestTaskAllocationResponseDto` | Full Feature 3 response (TaskAssignments[]) |

---

### 3.3 Backend Service

#### Interface: `IAiAllocationService.cs`

**File:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX.Services\IAiAllocationService.cs`

```
SuggestBestTeamAsync(Guid projectId) → SuggestTeamResponseDto
SuggestEmployeesAsync(string projectDescription) → SuggestEmployeesResponseDto
SuggestTaskAllocationAsync(Guid projectId) → SuggestTaskAllocationResponseDto
```

#### Implementation: `AiAllocationService.cs` (242 lines)

**File:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX.Services\AiAllocationService.cs`

**Constructor Injection:** `IUnitOfWork` (database access via repository pattern)

**HttpClient:** Created inline with 2-minute timeout, pointing to `http://localhost:8001`

**Private Helper Methods:**

| Method | What It Does |
|--------|-------------|
| `GetEmployeeInfoAsync(Guid userId, string name)` | Fetches skills from ResumeSkills, experience from ResumeExperiences, counts active tasks (Status == "Todo" or "InProgress") from TaskItems |
| `GetAllEmployeesInfoAsync()` | Iterates all users, calls GetEmployeeInfoAsync for each, returns full list |

**Feature Method Implementations:**

**`SuggestBestTeamAsync`:**
1. Fetches project from `_unitOfWork.Projects.GetByIdAsync(projectId)`
2. Gets all employees with skills/experience/workload via `GetAllEmployeesInfoAsync()`
3. Constructs JSON payload with project info + all employees
4. POSTs to `http://localhost:8001/suggest-team`
5. Deserializes response, enriches with employee names via lookup dictionary
6. Returns `SuggestTeamResponseDto`

**`SuggestEmployeesAsync`:**
1. Gets all employees info
2. Constructs payload with project description + employees
3. POSTs to `http://localhost:8001/suggest-employees`
4. Deserializes and enriches with names
5. Returns `SuggestEmployeesResponseDto`

**`SuggestTaskAllocationAsync`:**
1. Gets project's team via `_unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId)`
2. Gets team members via `_unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(teamId)`
3. For each member, fetches full employee info
4. Gets pending tasks (Status != "Done") via `_unitOfWork.Tasks.GetByProjectIdAsync(projectId)`
5. Constructs payload with tasks + team members
6. POSTs to `http://localhost:8001/suggest-task-allocation`
7. Enriches response with task titles and employee names
8. Returns `SuggestTaskAllocationResponseDto`

**Existing Repositories Used (no new repositories needed):**
- `_unitOfWork.Users` — Get all employees
- `_unitOfWork.Projects` — Get project details
- `_unitOfWork.ResumeSkills` — Get employee skills
- `_unitOfWork.ResumeExperiences` — Get employee experience
- `_unitOfWork.Tasks` — Get tasks and calculate workload
- `_unitOfWork.ProjectTeams` — Get project-team mapping
- `_unitOfWork.TeamEmployees` — Get team member list

---

### 3.4 Backend Azure Function

**File:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX_FYP_2025\Functions\AiAllocationFunction.cs` (179 lines)

Follows the exact same pattern as `ResumeFunction.cs`.

| Function Name | Route | Method | Input | Description |
|--------------|-------|--------|-------|-------------|
| `SuggestBestTeam` | `/api/ai/suggest-team` | POST | `{ "projectId": "guid" }` | Suggests optimal team for a project |
| `SuggestEmployees` | `/api/ai/suggest-employees` | POST | `{ "projectDescription": "text" }` | Ranks employees for a project |
| `SuggestTaskAllocation` | `/api/ai/suggest-task-allocation` | POST | `{ "projectId": "guid" }` | Suggests task-to-employee assignments |

**Error Handling per Endpoint:**
- **400 Bad Request** — Missing or invalid input
- **502 Bad Gateway** — Cannot connect to Python AI service
- **504 Gateway Timeout** — Python AI service took too long
- **500 Internal Server Error** — Unexpected exceptions

---

### 3.5 Dependency Injection Registration

**File Modified:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX_FYP_2025\Program.cs`

Added one line after the existing `IResumeService` registration:

```csharp
builder.Services.AddScoped<IAiAllocationService, AiAllocationService>();
```

---

### 3.6 Frontend API Service

**File:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_FRONTEND\managix\src\api\aiService.ts` (52 lines)

Follows the exact pattern of `resumeService.ts`:

| Method | API Call | Returns |
|--------|----------|---------|
| `suggestTeam(projectId)` | POST `/ai/suggest-team` | `{ team: TeamSuggestion[] }` |
| `suggestEmployees(projectDescription)` | POST `/ai/suggest-employees` | `{ recommendedEmployees: EmployeeRecommendation[] }` |
| `suggestTaskAllocation(projectId)` | POST `/ai/suggest-task-allocation` | `{ taskAssignments: TaskAssignment[] }` |

**TypeScript Interfaces Defined:**
- `TeamSuggestion` (userId, name, role, reason)
- `EmployeeRecommendation` (userId, name, matchScore, reason)
- `TaskAssignment` (taskId, userId, taskTitle, employeeName, reason, confidence)

---

### 3.7 Frontend UI — AI Allocation Page

**File:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_FRONTEND\managix\src\pages\ai\AiAllocation.tsx` (680 lines)

A comprehensive, manager-only page with the following features:

#### Page Layout:
- **Header:** "AI Resource Allocation" with Brain icon and descriptive subtitle
- **Project Selector:** Custom animated dropdown that fetches the manager's projects
- **Three Tabs:** "Suggest Team", "Recommend Employees", "Task Allocation"

#### Tab 1 — Suggest Team:
- "Generate Team Suggestion" button with Sparkles icon
- Loading state with animated spinner and "AI is analyzing..." text
- Results displayed as cards, each showing:
  - Employee name (bold)
  - Suggested role (colored badge)
  - AI reasoning text
- "Apply Team" button that:
  1. Creates a new team via `teamService.createTeam()`
  2. Adds each suggested employee via `teamService.addEmployeeToTeam()`
  3. Assigns team to project via `projectService.assignTeamToProject()`
  4. Shows success toast notification

#### Tab 2 — Recommend Employees:
- "Find Best Employees" button with UserCheck icon
- Results displayed as ranked cards with:
  - Employee name
  - Animated match score progress bar (green > 80, yellow > 60, red < 60)
  - AI reasoning
- Sorted by matchScore descending

#### Tab 3 — Task Allocation:
- "Suggest Task Assignments" button with ListTodo icon
- Results displayed as assignment cards showing:
  - Task title (bold)
  - Arrow indicator → Assigned employee name
  - Confidence score badge (color-coded)
  - AI reasoning
- "Apply All Assignments" button that updates each task via `taskService.update()`

#### UI/UX Details:
- Framer Motion animations throughout (fade-up cards, staggered lists, tab indicator)
- Auto-dismissing toast notifications (success/error)
- Consistent Tailwind CSS styling matching existing app (rounded-2xl cards, shadow-sm, black primary buttons)
- Loading states prevent duplicate submissions

---

### 3.8 Routing & Navigation

**File Modified:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_FRONTEND\managix\src\app.tsx`
- Added import: `import AiAllocation from './pages/ai/AiAllocation'`
- Added route: `<Route path="/ai-allocation" element={<Layout><AiAllocation /></Layout>} />`

**File Modified:** `D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_FRONTEND\managix\src\components\Sidebar.tsx`
- Added "AI Assistant" link in the Manager section (after Milestones)
- Uses a lightbulb/brain SVG icon matching the existing sidebar icon style

---

## 4. Files Summary

### New Files (10)

| # | File Path | Lines | Purpose |
|---|-----------|-------|---------|
| 1 | `ai_allocation/ai_allocation_app.py` | 553 | Python FastAPI AI service with Groq integration |
| 2 | `ai_allocation/requirements.txt` | 5 | Python dependencies |
| 3 | `ai_allocation/.env` | 1 | Groq API key |
| 4 | `ai_allocation/start_ai_allocation.bat` | ~20 | Windows startup script |
| 5 | `MANAGIX.Models/DTO/AiAllocationDto.cs` | 81 | All request/response DTOs |
| 6 | `MANAGIX.Services/IAiAllocationService.cs` | 13 | Service interface |
| 7 | `MANAGIX.Services/AiAllocationService.cs` | 242 | Service implementation |
| 8 | `Functions/AiAllocationFunction.cs` | 179 | 3 Azure Function HTTP endpoints |
| 9 | `src/api/aiService.ts` | 52 | Frontend API service |
| 10 | `src/pages/ai/AiAllocation.tsx` | 680 | Full AI Allocation page |

### Modified Files (3)

| # | File Path | Change |
|---|-----------|--------|
| 1 | `MANAGIX_FYP_2025/Program.cs` | Added DI registration for `IAiAllocationService` |
| 2 | `src/app.tsx` | Added import + route `/ai-allocation` |
| 3 | `src/components/Sidebar.tsx` | Added "AI Assistant" nav link for Manager role |

---

## 5. Database Tables Used (No Changes Required)

| Table | Data Used For |
|-------|--------------|
| `Users` | Get all employee names and IDs |
| `UserProfiles` | Employee profile data |
| `ResumeSkills` | Employee skill names (primary source for AI matching) |
| `ResumeExperiences` | Employee experience (title, company, duration) |
| `TaskItems` | Task details + workload calculation (count where Status = Todo/InProgress) |
| `Projects` | Project title and description for AI analysis |
| `Teams` | Team creation when applying suggestions |
| `TeamEmployees` | Team member relationships |
| `ProjectTeams` | Project-to-team mapping |

---

## 6. Testing Results

### Backend Build
```
Build succeeded.
0 Error(s)
9 Warning(s) (all pre-existing, none from Layer 3)
```

### Frontend Build
```
vite v7.1.9 building for production...
2203 modules transformed
built in 24.28s — SUCCESS
```

### Python AI Service — Live API Tests

**Health Check:**
```
GET http://localhost:8001/
Response: {"service":"AI Allocation Service","status":"running","version":"1.0.0"}
```

**Feature 1 — Suggest Team:**
```
POST http://localhost:8001/suggest-team
Input: E-Commerce Platform project + 4 employees
Response: 3 team members suggested with roles:
  - Charlie Brown → Full Stack Developer (0 active tasks, broad skills)
  - Bob Johnson → Backend Lead (4 years .NET experience)
  - Alice Smith → Frontend Developer (React/TypeScript skills)
```

**Feature 2 — Suggest Employees:**
```
POST http://localhost:8001/suggest-employees
Input: "React Native mobile app with Firebase" + 3 employees
Response: Ranked employees:
  - Charlie: 90 score (React + Firebase skills, 0 active tasks)
  - Alice: 70 score (React Native skills, 1 active task)
  - Bob: 0 score (no matching skills, 3 active tasks)
```

**Feature 3 — Suggest Task Allocation:**
```
POST http://localhost:8001/suggest-task-allocation
Input: 3 tasks + 3 team members
Response: Optimal assignments:
  - "Setup React project" → Alice (95% confidence, frontend skills)
  - "Create API endpoints" → Bob (90% confidence, backend skills)
  - "Write unit tests" → Charlie (80% confidence, QA skills)
```

---

## 7. How to Run

### Start All Services

**Terminal 1 — Python AI Service (port 8001):**
```bash
cd D:\FYP-Project\MANAGIX_FYP_2025\ai_allocation
py ai_allocation_app.py
```

**Terminal 2 — .NET Backend (port 7005):**
```bash
cd D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX_FYP_2025
func start
```

**Terminal 3 — React Frontend (port 5173):**
```bash
cd D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_FRONTEND\managix
npm run dev
```

### User Workflow
1. Open `http://localhost:5173` in browser
2. Login as a **Manager** account
3. Click **"AI Assistant"** in the sidebar
4. Select a project from the dropdown
5. Use any of the 3 tabs to generate AI suggestions
6. Review suggestions and click "Apply" to save

---

## 8. Alignment with Requirements Document

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| AI module performs only INPUT → AI → JSON OUTPUT | Done | Python service is fully stateless, no DB access |
| AI must not save data to database | Done | Only the frontend triggers saves via existing CRUD services |
| AI must not validate inputs | Done | Backend validates, Python just processes |
| AI must not modify system state | Done | All changes require manager confirmation |
| Workload = count of Todo + InProgress tasks | Done | Calculated in `AiAllocationService.GetEmployeeInfoAsync()` |
| Use existing tables only, no schema changes | Done | Uses User, ResumeSkill, ResumeExperience, TaskItem, Project, Team, TeamEmployee, ProjectTeam |
| Feature 1: Suggest Best Team | Done | Full implementation with roles and reasoning |
| Feature 2: Suggest Employees | Done | Match scores 0-100 with weighted criteria |
| Feature 3: Suggest Task Allocation | Done | Confidence scores with workload balancing |
| Prompt must include "Return ONLY valid JSON" | Done | Every prompt ends with this instruction |
| Sample inputs/outputs for testing | Done | Tested with real Groq API responses |
| JSON validation | Done | Robust 8-strategy JSON parser from resume_parser |
| Functions: suggestBestTeam, suggestEmployees, suggestTaskAllocation | Done | Exact function names in service interface |
| Manager reviews and confirms before saving | Done | UI shows suggestions, manager clicks Apply |

---

**END OF DOCUMENT**
