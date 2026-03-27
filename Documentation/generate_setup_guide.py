"""Generate Developer Setup Guide PDF for Managix FYP 2025"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER

PRIMARY = HexColor("#1a1a1a")
ACCENT = HexColor("#2563eb")
LIGHT_BG = HexColor("#f8fafc")
BORDER = HexColor("#e2e8f0")
CODE_BG = HexColor("#1e293b")
WHITE = HexColor("#ffffff")
GRAY = HexColor("#64748b")

def build_pdf():
    doc = SimpleDocTemplate(
        "DEVELOPER_SETUP_GUIDE.pdf", pagesize=letter,
        rightMargin=60, leftMargin=60, topMargin=60, bottomMargin=60
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('T', parent=styles['Title'], fontSize=28, textColor=PRIMARY, spaceAfter=6, alignment=TA_CENTER, fontName='Helvetica-Bold')
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=12, textColor=GRAY, spaceAfter=30, alignment=TA_CENTER)
    h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=20, textColor=PRIMARY, spaceBefore=20, spaceAfter=10, fontName='Helvetica-Bold')
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=ACCENT, spaceBefore=14, spaceAfter=8, fontName='Helvetica-Bold')
    body = ParagraphStyle('B', parent=styles['Normal'], fontSize=10, textColor=PRIMARY, spaceAfter=6, leading=14)
    code = ParagraphStyle('C', parent=styles['Normal'], fontSize=9, fontName='Courier', textColor=HexColor("#e2e8f0"), backColor=CODE_BG, spaceAfter=8, spaceBefore=4, leftIndent=12, rightIndent=12, leading=14, borderPadding=(8,8,8,8))
    bullet = ParagraphStyle('Bul', parent=styles['Normal'], fontSize=10, textColor=PRIMARY, spaceAfter=4, leftIndent=20, bulletIndent=10, leading=14)
    note = ParagraphStyle('N', parent=styles['Normal'], fontSize=9, textColor=GRAY, spaceAfter=6, leftIndent=20, leading=13, fontName='Helvetica-Oblique')
    cover_body = ParagraphStyle('CB', parent=body, alignment=TA_CENTER, fontSize=11, textColor=GRAY)

    s = []  # story

    # Cover
    s.append(Spacer(1, 80))
    s.append(Paragraph("MANAGIX FYP 2025", title_style))
    s.append(Paragraph("Developer Setup Guide", subtitle_style))
    s.append(Spacer(1, 20))
    s.append(HRFlowable(width="60%", thickness=2, color=ACCENT))
    s.append(Spacer(1, 20))
    s.append(Paragraph("A complete guide for setting up the Managix Project Management System<br/>on a new developer machine.", cover_body))
    s.append(Spacer(1, 40))

    # Architecture table
    arch = [
        ['Service', 'Port', 'Technology', 'Purpose'],
        ['React Frontend', '5173', 'React + Vite + TypeScript', 'User Interface'],
        ['.NET Backend', '7005', '.NET 8 Azure Functions', 'REST API + Business Logic'],
        ['AI Allocation', '8002', 'Python FastAPI + Groq', 'Team & Task AI Suggestions'],
        ['AI Planner', '8001', 'Python FastAPI + Groq', 'Milestone & Task Generation'],
        ['SQL Server', '1433', 'SQL Server', 'Database'],
    ]
    t = Table(arch, colWidths=[1.4*inch, 0.6*inch, 2*inch, 2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT), ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (1,0), (1,-1), 'CENTER'), ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    s.append(t)
    s.append(PageBreak())

    # 1. Project Overview
    s.append(Paragraph("1. Project Overview", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("Managix is a comprehensive AI-powered project management system built as a Final Year Project. It enables managers to create projects, form teams, assign tasks, track progress via Kanban boards, and leverage AI for intelligent decision-making.", body))
    s.append(Spacer(1, 8))
    s.append(Paragraph("The system is built in 3 layers:", body))
    s.append(Paragraph("<bullet>&bull;</bullet> <b>Layer 1 - Core CRUD:</b> Project, Team, Task, User management with role-based access", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> <b>Layer 2 - AI Resume Parser:</b> Extracts skills and experience from resumes using Groq LLM", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> <b>Layer 3 - AI Resource Allocation:</b> AI-powered team formation, employee ranking, and task assignment", bullet))

    # 2. Prerequisites
    s.append(Spacer(1, 10))
    s.append(Paragraph("2. Prerequisites", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("Install the following before proceeding:", body))
    prereq = [
        ['Software', 'Version', 'Download Link'],
        ['Node.js', 'v18 or higher', 'https://nodejs.org'],
        ['Python', '3.10 or higher', 'https://python.org'],
        ['.NET SDK', '8.0', 'https://dotnet.microsoft.com'],
        ['Azure Functions Core Tools', 'v4', 'https://github.com/Azure/azure-functions-core-tools'],
        ['SQL Server', 'LocalDB or Express', 'https://www.microsoft.com/sql-server'],
        ['Git', 'Latest', 'https://git-scm.com'],
    ]
    t2 = Table(prereq, colWidths=[1.8*inch, 1.2*inch, 3*inch])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY), ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    s.append(t2)

    # 3. Clone
    s.append(Spacer(1, 10))
    s.append(Paragraph("3. Step 1: Clone the Repository", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("git clone https://github.com/Matiullah-Yousfani/MANAGIX_FYP_2025.git", code))
    s.append(Paragraph("cd MANAGIX_FYP_2025", code))

    # 4. Env Variables
    s.append(Spacer(1, 10))
    s.append(Paragraph("4. Step 2: Configure Environment Variables", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("The AI services require a Groq API key. You need to create <b>.env</b> files in two directories.", body))

    s.append(Paragraph("How to get a Groq API Key:", h2))
    s.append(Paragraph("<bullet>1.</bullet> Go to <b>https://console.groq.com</b>", bullet))
    s.append(Paragraph("<bullet>2.</bullet> Sign up for a free account", bullet))
    s.append(Paragraph("<bullet>3.</bullet> Navigate to <b>API Keys</b> in the sidebar", bullet))
    s.append(Paragraph("<bullet>4.</bullet> Click <b>Create API Key</b> and copy the key", bullet))

    s.append(Spacer(1, 8))
    s.append(Paragraph("Create file: <b>ai_allocation/.env</b>", body))
    s.append(Paragraph("GROQ_API_KEY=your_groq_api_key_here", code))
    s.append(Paragraph("Create file: <b>resume_parser/.env</b>", body))
    s.append(Paragraph("GROQ_API_KEY=your_groq_api_key_here", code))
    s.append(Paragraph("Replace your_groq_api_key_here with the actual API key you copied from the Groq console.", note))

    s.append(PageBreak())

    # 5. Python Setup
    s.append(Paragraph("5. Step 3: Setup Python AI Services", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("AI Allocation Service (Layer 3):", h2))
    s.append(Paragraph("cd ai_allocation", code))
    s.append(Paragraph("pip install -r requirements.txt", code))
    s.append(Paragraph("AI Planner / Resume Parser Service (Layer 2):", h2))
    s.append(Paragraph("cd resume_parser", code))
    s.append(Paragraph("pip install -r requirements.txt", code))

    # 6. .NET Setup
    s.append(Spacer(1, 10))
    s.append(Paragraph("6. Step 4: Setup .NET Backend", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("cd MANAGIX_BACKEND/MANAGIX_FYP_2025", code))
    s.append(Paragraph("dotnet restore", code))
    s.append(Paragraph("dotnet build", code))
    s.append(Paragraph("If you need to change the database connection, update the connection string in <b>local.settings.json</b> inside the MANAGIX_FYP_2025 project folder.", note))

    # 7. Frontend Setup
    s.append(Spacer(1, 10))
    s.append(Paragraph("7. Step 5: Setup React Frontend", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("cd MANAGIX_FRONTEND/managix", code))
    s.append(Paragraph("npm install", code))

    # 8. Start Services
    s.append(Spacer(1, 10))
    s.append(Paragraph("8. Step 6: Start All Services", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("Open <b>4 separate terminal windows</b> and run each service in its own terminal.", body))

    s.append(Paragraph("Terminal 1 - AI Allocation Service (Port 8002):", h2))
    s.append(Paragraph("cd ai_allocation", code))
    s.append(Paragraph("python ai_allocation_app.py", code))

    s.append(Paragraph("Terminal 2 - AI Planner Service (Port 8001):", h2))
    s.append(Paragraph("cd resume_parser", code))
    s.append(Paragraph("python ai_planner.py", code))

    s.append(Paragraph("Terminal 3 - .NET Backend (Port 7005):", h2))
    s.append(Paragraph("cd MANAGIX_BACKEND/MANAGIX_FYP_2025", code))
    s.append(Paragraph("func start", code))

    s.append(Paragraph("Terminal 4 - React Frontend (Port 5173):", h2))
    s.append(Paragraph("cd MANAGIX_FRONTEND/managix", code))
    s.append(Paragraph("npm run dev", code))

    s.append(PageBreak())

    # 9. Verify
    s.append(Paragraph("9. Step 7: Verify Everything Works", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("Once all services are running, verify each one:", body))
    verify = [
        ['Service', 'URL', 'Expected Result'],
        ['AI Allocation (Swagger)', 'http://localhost:8002/docs', '4 AI endpoints visible'],
        ['AI Planner (Swagger)', 'http://localhost:8001/docs', '/api/generate-plan endpoint'],
        ['.NET Backend', 'http://localhost:7005/api/', 'API endpoints listed'],
        ['React Frontend', 'http://localhost:5173', 'Login page appears'],
    ]
    t3 = Table(verify, colWidths=[1.5*inch, 2*inch, 2.5*inch])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT), ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    s.append(t3)

    # 10. Testing AI Endpoints
    s.append(Spacer(1, 10))
    s.append(Paragraph("10. Testing AI Endpoints via Swagger", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))
    s.append(Paragraph("All AI endpoints can be tested at <b>http://localhost:8002/docs</b>. Each has pre-filled examples. Click <b>Try it out</b>, then <b>Execute</b>.", body))

    ep = [
        ['Endpoint', 'Method', 'Description'],
        ['/api/generate-plan', 'POST', 'Generate milestones and tasks from a project description'],
        ['/suggest-team', 'POST', 'Suggest the best team for a project based on employee skills'],
        ['/suggest-employees', 'POST', 'Rank all employees by match score for a project'],
        ['/suggest-task-allocation', 'POST', 'Assign tasks to team members based on skills and workload'],
    ]
    t4 = Table(ep, colWidths=[2*inch, 0.8*inch, 3.2*inch])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY), ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('FONTNAME', (0,1), (0,-1), 'Courier'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_BG]),
        ('TOPPADDING', (0,0), (-1,-1), 6), ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    s.append(t4)

    # 11. Troubleshooting
    s.append(Spacer(1, 10))
    s.append(Paragraph("11. Troubleshooting", h1))
    s.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    s.append(Spacer(1, 6))

    s.append(Paragraph("<b>Port already in use</b>", body))
    s.append(Paragraph("netstat -ano | findstr :PORT", code))
    s.append(Paragraph("taskkill /F /PID &lt;PID&gt;", code))

    s.append(Paragraph("<b>API key not working</b>", body))
    s.append(Paragraph("<bullet>&bull;</bullet> Verify .env file is in the correct directory (ai_allocation/ or resume_parser/)", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> Make sure the key is valid at https://console.groq.com", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> Check there are no extra spaces or quotes around the key", bullet))

    s.append(Spacer(1, 6))
    s.append(Paragraph("<b>Backend build errors</b>", body))
    s.append(Paragraph("<bullet>&bull;</bullet> Run <b>dotnet restore</b> before <b>dotnet build</b>", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> Ensure .NET 8 SDK is installed: <b>dotnet --version</b>", bullet))

    s.append(Spacer(1, 6))
    s.append(Paragraph("<b>Frontend build errors</b>", body))
    s.append(Paragraph("<bullet>&bull;</bullet> Delete <b>node_modules</b> folder and run <b>npm install</b> again", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> Ensure Node.js v18+ is installed: <b>node --version</b>", bullet))

    s.append(Spacer(1, 6))
    s.append(Paragraph("<b>func command not found</b>", body))
    s.append(Paragraph("<bullet>&bull;</bullet> Install Azure Functions Core Tools v4", bullet))
    s.append(Paragraph("<bullet>&bull;</bullet> Or use full path: <b>C:\\Users\\&lt;username&gt;\\AppData\\Local\\AzureFunctionsTools\\Releases\\4.x\\cli_x64\\func.exe start</b>", bullet))

    doc.build(s)
    print("PDF generated: DEVELOPER_SETUP_GUIDE.pdf")

if __name__ == "__main__":
    build_pdf()
