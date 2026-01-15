# ⚡ Quick Start Guide - AI Resume Parser Integration

## 🚀 Get Started in 5 Steps

### 1️⃣ Database Migration (First Time Only)
```bash
cd MANAGIX_BACKEND/MANAGIX.DataAccess
dotnet ef migrations add AddResumeModels --startup-project ../MANAGIX_FYP_2025
dotnet ef database update --startup-project ../MANAGIX_FYP_2025
```

### 2️⃣ Start Python FastAPI Service
```bash
cd resume_parser

# Create .env file with your Groq API key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env

# Windows
start_fastapi.bat

# Linux/Mac
chmod +x start_fastapi.sh
./start_fastapi.sh
```

**Service will run on:** `http://localhost:8000`

### 3️⃣ Start .NET Backend
```bash
cd MANAGIX_BACKEND/MANAGIX_FYP_2025
func start
# OR
dotnet run
```

**Backend will run on:** `http://localhost:7071`

### 4️⃣ Start React Frontend
```bash
cd MANAGIX_Frontend/managix
npm install  # First time only
npm run dev
```

**Frontend will run on:** `http://localhost:5173`

### 5️⃣ Test It Out!
1. Login to your app → `http://localhost:5173/login`
2. Navigate to → `http://localhost:5173/resume-upload`
3. Upload a PDF or DOCX resume
4. Watch the magic happen! ✨

---

## 📁 What Files Were Added/Modified

### ✅ Backend (C#/.NET)
```
MANAGIX_BACKEND/
├── MANAGIX.Models/Models/
│   ├── ResumeEducation.cs       ✅ NEW
│   ├── ResumeSkill.cs           ✅ NEW
│   ├── ResumeProject.cs         ✅ NEW
│   ├── ResumeExperience.cs      ✅ NEW
│   └── UserProfile.cs           ✏️ MODIFIED (added Summary field)
│
├── MANAGIX.Models/DTO/
│   ├── ResumeParsedDataDto.cs   ✅ NEW
│   ├── ResumeUploadRequestDto.cs ✅ NEW
│   └── ResumeSaveProfileDto.cs  ✅ NEW
│
├── MANAGIX.DataAccess/Repositories/
│   ├── ResumeEducationRepository.cs    ✅ NEW
│   ├── ResumeSkillRepository.cs        ✅ NEW
│   ├── ResumeProjectRepository.cs      ✅ NEW
│   ├── ResumeExperienceRepository.cs   ✅ NEW
│   └── IRepositories/
│       ├── IResumeEducationRepository.cs    ✅ NEW
│       ├── IResumeSkillRepository.cs        ✅ NEW
│       ├── IResumeProjectRepository.cs      ✅ NEW
│       ├── IResumeExperienceRepository.cs   ✅ NEW
│       ├── IUnitOfWork.cs                   ✏️ MODIFIED
│       └── UnitOfWork.cs                    ✏️ MODIFIED
│
├── MANAGIX.DataAccess/Data/
│   └── ApplicationDbContext.cs  ✏️ MODIFIED
│
├── MANAGIX.Services/
│   ├── IResumeService.cs        ✅ NEW
│   └── ResumeService.cs         ✅ NEW
│
└── MANAGIX_FYP_2025/
    ├── Functions/
    │   └── ResumeFunction.cs    ✅ NEW
    └── Program.cs               ✏️ MODIFIED
```

### ✅ Python FastAPI Service
```
resume_parser/
├── fastapi_app.py              ✅ NEW (replaces streamlit_app.py)
├── requirements_fastapi.txt    ✅ NEW
├── README_FASTAPI.md           ✅ NEW
├── start_fastapi.bat           ✅ NEW (Windows)
└── start_fastapi.sh            ✅ NEW (Linux/Mac)
```

### ✅ Frontend (React/TypeScript)
```
MANAGIX_Frontend/managix/src/
├── api/
│   └── resumeService.ts        ✅ NEW
├── pages/resume/
│   ├── ResumeUpload.tsx        ✅ NEW
│   └── ResumeUpload.css        ✅ NEW
└── app.tsx                     ✏️ MODIFIED
```

### 📚 Documentation
```
├── INTEGRATION_GUIDE.md        ✅ NEW (Complete setup guide)
└── QUICK_START.md              ✅ NEW (This file)
```

---

## 🎯 Key Features Implemented

### Backend
- ✅ 4 new database models with relationships
- ✅ Repository pattern following your existing structure
- ✅ Service layer for business logic
- ✅ 3 new API endpoints
- ✅ Integration with Python parser service

### Python Service
- ✅ FastAPI (modern, production-ready)
- ✅ No database dependencies
- ✅ Groq LLM integration
- ✅ PDF & DOCX support
- ✅ Structured JSON output

### Frontend
- ✅ Beautiful, modern UI with gradients
- ✅ File upload with validation
- ✅ Real-time parsing feedback
- ✅ Fully editable fields
- ✅ Add/remove dynamic items
- ✅ Fully responsive design

---

## 🔗 API Endpoints Summary

### .NET Backend
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resume/parse` | Parse resume file |
| POST | `/api/resume/save` | Save parsed data to DB |
| GET | `/api/resume/{userId}` | Get user's resume data |

### Python FastAPI
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/parse-resume` | Parse resume file |
| GET | `/docs` | Swagger UI |

---

## 🗄️ New Database Tables

After migration, you'll have:
- `ResumeEducations` - User education history
- `ResumeSkills` - User skills
- `ResumeProjects` - User projects
- `ResumeExperiences` - Work experience
- `UserProfiles` - Updated with Summary field

---

## 🔑 Environment Variables Needed

### Python Service (.env file)
```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your key from: https://console.groq.com/keys

### .NET Backend (local.settings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "your_sql_server_connection_string"
  }
}
```

---

## 📱 User Flow

1. **User uploads resume** → PDF/DOCX file
2. **Frontend sends to .NET backend** → `/api/resume/parse`
3. **.NET calls Python FastAPI** → Parse with Groq LLM
4. **Python returns JSON** → Structured resume data
5. **Frontend displays data** → Editable form
6. **User reviews & edits** → Can modify all fields
7. **User clicks "Save"** → `/api/resume/save`
8. **.NET saves to SQL Server** → All tables updated
9. **Success!** → User redirected to dashboard

---

## 🐛 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Python service won't start | Check port 8000 is free, verify GROQ_API_KEY |
| Migration fails | Ensure connection string is correct |
| Parse fails | Verify Python service is running on port 8000 |
| Frontend can't connect | Check API base URL in axiosInstance.ts |
| CORS error | Verify CORS settings in fastapi_app.py |

---

## 📞 Need Help?

1. Check `INTEGRATION_GUIDE.md` for detailed setup
2. Check console logs (Browser DevTools, Backend, Python)
3. Verify all services are running
4. Test endpoints individually

---

## ✅ Checklist Before Testing

- [ ] Database migration completed
- [ ] Python service running on port 8000
- [ ] .NET backend running on port 7071
- [ ] React frontend running on port 5173
- [ ] GROQ_API_KEY set in .env file
- [ ] Logged in to the application
- [ ] Test resume file ready (PDF or DOCX)

---

## 🎉 You're All Set!

Everything is ready to go. Just follow the 5 steps above and start uploading resumes!

**Pro Tip:** Use the Swagger UI at `http://localhost:8000/docs` to test the Python API directly.

Happy coding! 🚀
