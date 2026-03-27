"""
Generate professional PDF for Layer 3 Implementation Document
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)

OUTPUT = r"D:\FYP-Project\MANAGIX_FYP_2025\Documentation\LAYER_3_IMPLEMENTATION.pdf"

doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=2*cm, bottomMargin=2*cm
)

styles = getSampleStyleSheet()

DARK = HexColor("#1a1a2e")
PRIMARY = HexColor("#0f3460")
ACCENT = HexColor("#e94560")
LIGHT_BG = HexColor("#f5f5f5")
GREEN = HexColor("#27ae60")
TABLE_HEADER_BG = HexColor("#1a1a2e")
TABLE_ALT_BG = HexColor("#f0f4f8")

title_style = ParagraphStyle('CustomTitle', parent=styles['Title'],
    fontSize=28, textColor=DARK, spaceAfter=6, fontName='Helvetica-Bold', leading=34)

subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
    fontSize=12, textColor=HexColor("#666666"), spaceAfter=20, fontName='Helvetica')

h1_style = ParagraphStyle('H1', parent=styles['Heading1'],
    fontSize=20, textColor=PRIMARY, spaceBefore=24, spaceAfter=10,
    fontName='Helvetica-Bold', leading=24)

h2_style = ParagraphStyle('H2', parent=styles['Heading2'],
    fontSize=15, textColor=DARK, spaceBefore=18, spaceAfter=8,
    fontName='Helvetica-Bold', leading=20)

h3_style = ParagraphStyle('H3', parent=styles['Heading3'],
    fontSize=12, textColor=PRIMARY, spaceBefore=14, spaceAfter=6,
    fontName='Helvetica-Bold', leading=16)

body_style = ParagraphStyle('Body', parent=styles['Normal'],
    fontSize=10, textColor=HexColor("#333333"), spaceAfter=6,
    fontName='Helvetica', leading=14, alignment=TA_JUSTIFY)

bullet_style = ParagraphStyle('Bullet', parent=body_style,
    leftIndent=20, bulletIndent=8, spaceAfter=3)

code_style = ParagraphStyle('Code', parent=styles['Normal'],
    fontSize=9, textColor=HexColor("#d63384"), fontName='Courier',
    backColor=LIGHT_BG, leftIndent=12, spaceAfter=4, leading=12,
    borderPadding=(4, 4, 4, 4))

quote_style = ParagraphStyle('Quote', parent=body_style,
    leftIndent=20, rightIndent=20, fontSize=10,
    textColor=HexColor("#555555"), fontName='Helvetica-Oblique',
    backColor=HexColor("#fff3cd"), borderPadding=(8, 8, 8, 8),
    spaceAfter=12, spaceBefore=8)

story = []

def add_divider():
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=HexColor("#e0e0e0"),
                             spaceAfter=8, spaceBefore=4))

def make_table(headers, rows, col_widths=None):
    data = [headers] + rows
    w = doc.width
    if col_widths is None:
        n = len(headers)
        col_widths = [w / n] * n
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_BG),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, TABLE_ALT_BG]),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

def P(text, style=body_style):
    story.append(Paragraph(text, style))

def B(text):
    story.append(Paragraph(text, bullet_style))

# ==================== COVER PAGE ====================
story.append(Spacer(1, 3*cm))
P("MANAGIX FYP", ParagraphStyle('CoverPre', parent=subtitle_style,
    fontSize=14, textColor=ACCENT, fontName='Helvetica-Bold',
    alignment=TA_CENTER, spaceAfter=8))
P("Layer 3: AI Resource Allocation", ParagraphStyle('CoverTitle', parent=title_style,
    fontSize=32, alignment=TA_CENTER, spaceAfter=12))

story.append(HRFlowable(width="40%", thickness=3, color=ACCENT,
                         spaceAfter=20, spaceBefore=10, hAlign='CENTER'))

P("Implementation Document", ParagraphStyle('CoverSub', parent=subtitle_style,
    fontSize=16, alignment=TA_CENTER, spaceAfter=30))

cover_data = [
    ["Module", "AI Resource Allocation"],
    ["Project", "Managix - Project Management System"],
    ["Date", "March 27, 2026"],
    ["Status", "Fully Implemented & Tested"],
    ["Tech Stack", ".NET 8 + React 19 + Python FastAPI + Groq LLM"],
]
ct = Table(cover_data, colWidths=[5*cm, 10*cm])
ct.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('TEXTCOLOR', (0, 0), (0, -1), PRIMARY),
    ('TEXTCOLOR', (1, 0), (1, -1), HexColor("#333333")),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('LINEBELOW', (0, 0), (-1, -1), 0.5, HexColor("#e0e0e0")),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(ct)
story.append(PageBreak())

# ==================== TABLE OF CONTENTS ====================
P("Table of Contents", h1_style)
add_divider()
toc_items = [
    ("1. What Was Asked", 0),
    ("1.1 Feature 1 - Suggest Best Team", 1),
    ("1.2 Feature 2 - Suggest Employees", 1),
    ("1.3 Feature 3 - Suggest Task Allocation", 1),
    ("1.4 Additional Requirements", 1),
    ("2. System Architecture", 0),
    ("3. What Was Implemented", 0),
    ("3.1 Python AI Service", 1),
    ("3.2 Backend DTOs", 1),
    ("3.3 Backend Service", 1),
    ("3.4 Backend Azure Function", 1),
    ("3.5 Dependency Injection", 1),
    ("3.6 Frontend API Service", 1),
    ("3.7 Frontend UI", 1),
    ("3.8 Routing and Navigation", 1),
    ("4. Files Summary", 0),
    ("5. Database Tables Used", 0),
    ("6. Testing Results", 0),
    ("7. How to Run", 0),
    ("8. Alignment with Requirements", 0),
]
for item, indent_level in toc_items:
    s = ParagraphStyle('TOC', parent=body_style, leftIndent=indent_level * 20, fontSize=10, spaceAfter=4)
    story.append(Paragraph(item, s))
story.append(PageBreak())

# ==================== SECTION 1 ====================
P("1. What Was Asked", h1_style)
add_divider()
P("Layer 3 is the <b>intelligence layer</b> of Managix. The requirements document specified three AI-powered features that assist managers in team formation and task assignment, following a strict principle:", body_style)
P("<b>INPUT  --&gt;  AI  --&gt;  JSON OUTPUT</b><br/>The AI module must NOT save data, validate inputs, handle authentication, apply business rules, or modify any system state.", quote_style)

P("1.1 Feature 1 - Suggest Best Team for a Project", h2_style)
P("<b>Purpose:</b> Automatically generate a complete, optimized team based on project needs.", body_style)
P("<b>Required Input:</b>", body_style)
B("- Project information (projectId, title, description)")
B("- All available employees with their skills, experience, and current active task count")
P("<b>Required Output:</b> A list of suggested team members, each with:", body_style)
B("- <font face='Courier' size=9>userId</font> - which employee")
B("- <font face='Courier' size=9>role</font> - suggested role (e.g., Backend Developer)")
B("- <font face='Courier' size=9>reason</font> - AI justification for the selection")
P("<b>AI Logic Must Consider:</b>", body_style)
B("- Project requirements extracted from description")
B("- Employee skills (from ResumeSkill table)")
B("- Experience level (from ResumeExperience table)")
B("- Current workload (active tasks where Status = Todo or InProgress)")

P("1.2 Feature 2 - Suggest Employees During Team Creation", h2_style)
P("<b>Purpose:</b> Assist the manager while manually building a team by ranking employees.", body_style)
P("<b>Required Input:</b>", body_style)
B("- Project description text")
B("- All available employees with skills, experience, and workload")
P("<b>Required Output:</b> Ranked list of recommended employees, each with:", body_style)
B("- <font face='Courier' size=9>userId</font> - which employee")
B("- <font face='Courier' size=9>matchScore</font> - 0 to 100 compatibility score")
B("- <font face='Courier' size=9>reason</font> - why this employee is a good match")

P("1.3 Feature 3 - Suggest Task Allocation", h2_style)
P("<b>Purpose:</b> Suggest the best employee for each unfinished task in a project.", body_style)
P("<b>Required Input:</b>", body_style)
B("- List of tasks (taskId, title, description)")
B("- Team members with their skills, experience, and active task count")
P("<b>Required Output:</b> Assignment list, each entry with:", body_style)
B("- <font face='Courier' size=9>taskId</font> - which task")
B("- <font face='Courier' size=9>userId</font> - assigned employee")
B("- <font face='Courier' size=9>reason</font> - AI justification")
B("- <font face='Courier' size=9>confidence</font> - 0 to 100 confidence score")
P("<b>AI Logic Must Consider:</b>", body_style)
B("1. Skill matching (task requirements vs. employee skills)")
B("2. Workload balancing (avoid overloading employees)")
B("3. Experience level (critical tasks assigned to experienced employees)")

P("1.4 Additional Requirements", h2_style)
B("- <b>Data Sources:</b> Only use existing database tables - no schema changes required")
B("- <b>Workload Calculation:</b> Count tasks where Status == Todo OR InProgress")
B("- <b>Prompt Design:</b> Every AI request must end with Return ONLY valid JSON")
B("- <b>Testing:</b> Provide sample inputs, sample outputs, JSON validation")
B("- <b>Manager Workflow:</b> AI suggests --&gt; Manager reviews and confirms --&gt; Backend saves")

story.append(PageBreak())

# ==================== SECTION 2 ====================
P("2. System Architecture", h1_style)
add_divider()
P("The implementation follows the exact same architecture as Layer 2 (AI Resume Parser):", body_style)
story.append(Spacer(1, 10))

arch_data = [
    [Paragraph("<b>React Frontend</b><br/>(port 5173)", ParagraphStyle('AC', parent=body_style, fontSize=9, alignment=TA_CENTER)),
     Paragraph("--&gt;", ParagraphStyle('Arrow', parent=body_style, fontSize=14, alignment=TA_CENTER)),
     Paragraph("<b>.NET Backend</b><br/>Azure Functions<br/>(port 7005)", ParagraphStyle('AC2', parent=body_style, fontSize=9, alignment=TA_CENTER)),
     Paragraph("--&gt;", ParagraphStyle('Arrow2', parent=body_style, fontSize=14, alignment=TA_CENTER)),
     Paragraph("<b>Python FastAPI</b><br/>AI Service<br/>(port 8001)", ParagraphStyle('AC3', parent=body_style, fontSize=9, alignment=TA_CENTER))],
    ["", "", Paragraph("<b>SQL Server DB</b>", ParagraphStyle('AC4', parent=body_style, fontSize=9, alignment=TA_CENTER)), "",
     Paragraph("<b>Groq LLM API</b>", ParagraphStyle('AC5', parent=body_style, fontSize=9, alignment=TA_CENTER))],
]
at = Table(arch_data, colWidths=[3.5*cm, 1.5*cm, 4*cm, 1.5*cm, 4*cm])
at.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), HexColor("#e3f2fd")),
    ('BACKGROUND', (2, 0), (2, 0), HexColor("#e8f5e9")),
    ('BACKGROUND', (4, 0), (4, 0), HexColor("#fff3e0")),
    ('BACKGROUND', (2, 1), (2, 1), HexColor("#f3e5f5")),
    ('BACKGROUND', (4, 1), (4, 1), HexColor("#fce4ec")),
    ('BOX', (0, 0), (0, 0), 1, PRIMARY),
    ('BOX', (2, 0), (2, 0), 1, GREEN),
    ('BOX', (4, 0), (4, 0), 1, HexColor("#e65100")),
    ('BOX', (2, 1), (2, 1), 1, HexColor("#7b1fa2")),
    ('BOX', (4, 1), (4, 1), 1, ACCENT),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
]))
story.append(at)
story.append(Spacer(1, 14))

P("<b>Data Flow:</b>", body_style)
B("1. Manager clicks Generate Suggestion on the frontend")
B("2. Frontend calls .NET backend API endpoint")
B("3. Backend gathers all required data from the database (employees, skills, experience, tasks)")
B("4. Backend constructs a structured JSON payload and sends it to the Python AI service")
B("5. Python service builds a detailed prompt and sends it to Groq LLM (llama-3.1-8b-instant)")
B("6. Groq returns a JSON response, Python parses and validates it")
B("7. Response flows back through .NET backend to the frontend")
B("8. Manager reviews the suggestions and can accept/reject before any data is saved")

story.append(PageBreak())

# ==================== SECTION 3 ====================
P("3. What Was Implemented", h1_style)
add_divider()

P("3.1 Python AI Service", h2_style)
P("<b>Directory:</b> <font face='Courier'>ai_allocation/</font> &nbsp;&nbsp;|&nbsp;&nbsp; <b>Port:</b> 8001", body_style)

P("<b>Files Created:</b>", body_style)
make_table(
    ["File", "Purpose"],
    [
        ["ai_allocation_app.py (553 lines)", "Full FastAPI application with Groq LLM integration"],
        ["requirements.txt", "Python dependencies (fastapi, uvicorn, pydantic, requests, python-dotenv)"],
        [".env", "Groq API key (same key as resume_parser service)"],
        ["start_ai_allocation.bat", "Windows startup script"],
    ],
    [5.5*cm, doc.width - 5.5*cm]
)

P("<b>Endpoints:</b>", body_style)
make_table(
    ["Method", "Endpoint", "Description"],
    [
        ["GET", "/", "Health check - returns service status"],
        ["POST", "/suggest-team", "Analyzes project + employees, returns optimal team"],
        ["POST", "/suggest-employees", "Ranks employees by match score for a project"],
        ["POST", "/suggest-task-allocation", "Assigns tasks to team members optimally"],
    ],
    [2*cm, 4.5*cm, doc.width - 6.5*cm]
)

P("<b>Key Implementation Details:</b>", body_style)
B("- <b>Groq LLM Model:</b> llama-3.1-8b-instant with max_tokens: 4096")
B("- <b>JSON Extraction:</b> Robust 8-strategy parser from resume_parser")
B("- <b>Prompt Engineering:</b> Structured prompts with data, format, criteria, JSON-only instruction")
B("- <b>CORS:</b> Allow all origins (dev mode)")
B("- <b>Error Handling:</b> Try/catch with HTTP 500 on failure")

P("3.2 Backend DTOs", h2_style)
P("<b>File:</b> <font face='Courier'>MANAGIX.Models/DTO/AiAllocationDto.cs</font>", body_style)
make_table(
    ["DTO Class", "Purpose"],
    [
        ["EmployeeInfoDto", "Employee data (UserId, Name, Skills[], Experience[], ActiveTasks)"],
        ["ExperienceInfoDto", "Experience sub-object (Title, Company, Duration)"],
        ["SuggestTeamRequestDto", "Feature 1 request (ProjectId)"],
        ["TeamSuggestionDto", "Team member suggestion (UserId, Name, Role, Reason)"],
        ["SuggestTeamResponseDto", "Feature 1 response (Team[])"],
        ["SuggestEmployeesRequestDto", "Feature 2 request (ProjectDescription)"],
        ["EmployeeRecommendationDto", "Recommendation (UserId, Name, MatchScore, Reason)"],
        ["SuggestEmployeesResponseDto", "Feature 2 response (RecommendedEmployees[])"],
        ["SuggestTaskAllocationRequestDto", "Feature 3 request (ProjectId)"],
        ["TaskAssignmentDto", "Assignment (TaskId, UserId, TaskTitle, EmployeeName, Reason, Confidence)"],
        ["SuggestTaskAllocationResponseDto", "Feature 3 response (TaskAssignments[])"],
    ],
    [5.5*cm, doc.width - 5.5*cm]
)

P("3.3 Backend Service", h2_style)
P("<b>Interface:</b> <font face='Courier'>IAiAllocationService.cs</font> | <b>Implementation:</b> <font face='Courier'>AiAllocationService.cs</font> (242 lines)", body_style)
P("<font face='Courier' size=9>SuggestBestTeamAsync(Guid projectId) --&gt; SuggestTeamResponseDto<br/>SuggestEmployeesAsync(string projectDescription) --&gt; SuggestEmployeesResponseDto<br/>SuggestTaskAllocationAsync(Guid projectId) --&gt; SuggestTaskAllocationResponseDto</font>", code_style)
B("- Injects IUnitOfWork, uses HttpClient with 2-min timeout to http://localhost:8001")
B("- Helper: GetEmployeeInfoAsync - fetches skills, experience, active task count")
B("- Helper: GetAllEmployeesInfoAsync - iterates all users")
B("- Each method: gathers DB data --&gt; constructs JSON --&gt; POSTs to Python --&gt; enriches response with names")

P("3.4 Backend Azure Function", h2_style)
P("<b>File:</b> <font face='Courier'>AiAllocationFunction.cs</font> (179 lines)", body_style)
make_table(
    ["Function", "Route", "Method", "Input"],
    [
        ["SuggestBestTeam", "/api/ai/suggest-team", "POST", "{ projectId: guid }"],
        ["SuggestEmployees", "/api/ai/suggest-employees", "POST", "{ projectDescription: text }"],
        ["SuggestTaskAllocation", "/api/ai/suggest-task-allocation", "POST", "{ projectId: guid }"],
    ],
    [4*cm, 4.5*cm, 2*cm, doc.width - 10.5*cm]
)
P("<b>Error Handling:</b> 400 (bad input), 502 (service down), 504 (timeout), 500 (unexpected)", body_style)

P("3.5 Dependency Injection", h2_style)
P("Added to Program.cs:", body_style)
P("<font face='Courier' size=9>builder.Services.AddScoped&lt;IAiAllocationService, AiAllocationService&gt;();</font>", code_style)

P("3.6 Frontend API Service", h2_style)
P("<b>File:</b> <font face='Courier'>src/api/aiService.ts</font> (52 lines)", body_style)
make_table(
    ["Method", "API Call", "Returns"],
    [
        ["suggestTeam(projectId)", "POST /ai/suggest-team", "{ team: TeamSuggestion[] }"],
        ["suggestEmployees(desc)", "POST /ai/suggest-employees", "{ recommendedEmployees[] }"],
        ["suggestTaskAllocation(id)", "POST /ai/suggest-task-allocation", "{ taskAssignments[] }"],
    ],
    [5*cm, 5*cm, doc.width - 10*cm]
)

P("3.7 Frontend UI - AI Allocation Page", h2_style)
P("<b>File:</b> <font face='Courier'>src/pages/ai/AiAllocation.tsx</font> (680 lines)", body_style)
B("- <b>Header:</b> AI Resource Allocation with Brain icon and subtitle")
B("- <b>Project Selector:</b> Animated dropdown fetching manager projects")
B("- <b>Tab 1 - Suggest Team:</b> Cards with role badges + reasoning. Apply creates team via services")
B("- <b>Tab 2 - Recommend Employees:</b> Ranked with animated score bars (green/yellow/red)")
B("- <b>Tab 3 - Task Allocation:</b> Assignment cards with confidence badges. Apply updates tasks")
B("- <b>UI:</b> Framer Motion animations, toast notifications, Tailwind CSS, loading states")

P("3.8 Routing and Navigation", h2_style)
B("- <b>App.tsx:</b> Added route /ai-allocation")
B("- <b>Sidebar.tsx:</b> Added AI Assistant link in Manager section")

story.append(PageBreak())

# ==================== SECTION 4 ====================
P("4. Files Summary", h1_style)
add_divider()

P("<b>New Files (10):</b>", h3_style)
make_table(
    ["#", "File Path", "Lines", "Purpose"],
    [
        ["1", "ai_allocation/ai_allocation_app.py", "553", "Python FastAPI AI service"],
        ["2", "ai_allocation/requirements.txt", "5", "Python dependencies"],
        ["3", "ai_allocation/.env", "1", "Groq API key"],
        ["4", "ai_allocation/start_ai_allocation.bat", "~20", "Startup script"],
        ["5", "MANAGIX.Models/DTO/AiAllocationDto.cs", "81", "All DTOs"],
        ["6", "MANAGIX.Services/IAiAllocationService.cs", "13", "Service interface"],
        ["7", "MANAGIX.Services/AiAllocationService.cs", "242", "Service implementation"],
        ["8", "Functions/AiAllocationFunction.cs", "179", "3 Azure Function endpoints"],
        ["9", "src/api/aiService.ts", "52", "Frontend API service"],
        ["10", "src/pages/ai/AiAllocation.tsx", "680", "Full AI page"],
    ],
    [1*cm, 6.5*cm, 1.5*cm, doc.width - 9*cm]
)

P("<b>Modified Files (3):</b>", h3_style)
make_table(
    ["#", "File Path", "Change"],
    [
        ["1", "MANAGIX_FYP_2025/Program.cs", "Added DI registration for IAiAllocationService"],
        ["2", "src/app.tsx", "Added import + route /ai-allocation"],
        ["3", "src/components/Sidebar.tsx", "Added AI Assistant nav link for Manager"],
    ],
    [1*cm, 5.5*cm, doc.width - 6.5*cm]
)

# ==================== SECTION 5 ====================
P("5. Database Tables Used (No Changes Required)", h1_style)
add_divider()
make_table(
    ["Table", "Data Used For"],
    [
        ["Users", "Get all employee names and IDs"],
        ["UserProfiles", "Employee profile data"],
        ["ResumeSkills", "Employee skill names (primary source for AI matching)"],
        ["ResumeExperiences", "Employee experience (title, company, duration)"],
        ["TaskItems", "Task details + workload calculation (Status = Todo/InProgress)"],
        ["Projects", "Project title and description for AI analysis"],
        ["Teams", "Team creation when applying suggestions"],
        ["TeamEmployees", "Team member relationships"],
        ["ProjectTeams", "Project-to-team mapping"],
    ],
    [4*cm, doc.width - 4*cm]
)

story.append(PageBreak())

# ==================== SECTION 6 ====================
P("6. Testing Results", h1_style)
add_divider()

P("<b>Backend Build:</b>", h3_style)
P("<font face='Courier' size=9>Build succeeded. 0 Error(s), 9 Warning(s) (all pre-existing, none from Layer 3)</font>", code_style)

P("<b>Frontend Build:</b>", h3_style)
P("<font face='Courier' size=9>vite v7.1.9 building for production... 2203 modules transformed. Built in 24.28s - SUCCESS</font>", code_style)

P("<b>Python AI Service - Live API Tests:</b>", h3_style)

P("<b>Health Check:</b>", body_style)
P('<font face="Courier" size=9>GET http://localhost:8001/ --&gt; {"service":"AI Allocation Service","status":"running"}</font>', code_style)

P("<b>Feature 1 - Suggest Team:</b>", body_style)
P('<font face="Courier" size=9>POST /suggest-team | Input: E-Commerce Platform + 4 employees<br/>Result: Charlie --&gt; Full Stack Dev, Bob --&gt; Backend Lead, Alice --&gt; Frontend Dev</font>', code_style)

P("<b>Feature 2 - Suggest Employees:</b>", body_style)
P('<font face="Courier" size=9>POST /suggest-employees | Input: React Native + Firebase project<br/>Result: Charlie: 90 score, Alice: 70 score, Bob: 0 score</font>', code_style)

P("<b>Feature 3 - Suggest Task Allocation:</b>", body_style)
P('<font face="Courier" size=9>POST /suggest-task-allocation | Input: 3 tasks + 3 members<br/>Result: Setup React --&gt; Alice (95%), Create API --&gt; Bob (90%), Tests --&gt; Charlie (80%)</font>', code_style)

# ==================== SECTION 7 ====================
P("7. How to Run", h1_style)
add_divider()

P("<b>Terminal 1 - Python AI Service (port 8001):</b>", h3_style)
P("<font face='Courier' size=9>cd ai_allocation &amp;&amp; py ai_allocation_app.py</font>", code_style)

P("<b>Terminal 2 - .NET Backend (port 7005):</b>", h3_style)
P("<font face='Courier' size=9>cd MANAGIX_BACKEND/MANAGIX_FYP_2025 &amp;&amp; func start</font>", code_style)

P("<b>Terminal 3 - React Frontend (port 5173):</b>", h3_style)
P("<font face='Courier' size=9>cd MANAGIX_FRONTEND/managix &amp;&amp; npm run dev</font>", code_style)

P("<b>User Workflow:</b>", h3_style)
B("1. Open http://localhost:5173 in browser")
B("2. Login as a <b>Manager</b> account")
B("3. Click <b>AI Assistant</b> in the sidebar")
B("4. Select a project from the dropdown")
B("5. Use any of the 3 tabs to generate AI suggestions")
B("6. Review suggestions and click <b>Apply</b> to save")

story.append(PageBreak())

# ==================== SECTION 8 ====================
P("8. Alignment with Requirements Document", h1_style)
add_divider()

make_table(
    ["Requirement", "Status", "Implementation"],
    [
        ["AI performs only INPUT --&gt; AI --&gt; JSON OUTPUT", "Done", "Python service is fully stateless, no DB access"],
        ["AI must not save data to database", "Done", "Frontend triggers saves via existing CRUD services"],
        ["AI must not validate inputs", "Done", "Backend validates, Python just processes"],
        ["AI must not modify system state", "Done", "All changes require manager confirmation"],
        ["Workload = count of Todo + InProgress", "Done", "Calculated in GetEmployeeInfoAsync()"],
        ["Use existing tables only", "Done", "Uses 9 existing tables, 0 new tables"],
        ["Feature 1: Suggest Best Team", "Done", "Full implementation with roles and reasoning"],
        ["Feature 2: Suggest Employees", "Done", "Match scores 0-100 with weighted criteria"],
        ["Feature 3: Suggest Task Allocation", "Done", "Confidence scores with workload balancing"],
        ["Return ONLY valid JSON in prompts", "Done", "Every prompt ends with this instruction"],
        ["Sample inputs/outputs for testing", "Done", "Tested with real Groq API responses"],
        ["JSON validation", "Done", "Robust 8-strategy JSON parser"],
        ["Manager reviews before saving", "Done", "UI shows suggestions, manager clicks Apply"],
    ],
    [5.5*cm, 1.5*cm, doc.width - 7*cm]
)

story.append(Spacer(1, 30))
add_divider()
P("<b>END OF DOCUMENT</b>", ParagraphStyle('End', parent=body_style, alignment=TA_CENTER,
    fontSize=12, textColor=HexColor("#999999"), fontName='Helvetica-Bold'))

# ==================== BUILD ====================
def add_page_number(canvas_obj, doc_obj):
    page_num = canvas_obj.getPageNumber()
    text = f"Managix FYP - Layer 3 Implementation  |  Page {page_num}"
    canvas_obj.saveState()
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(HexColor("#999999"))
    canvas_obj.drawString(doc_obj.leftMargin, 1.2*cm, text)
    canvas_obj.drawRightString(A4[0] - doc_obj.rightMargin, 1.2*cm, "Confidential")
    canvas_obj.restoreState()

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f"PDF created successfully: {OUTPUT}")
