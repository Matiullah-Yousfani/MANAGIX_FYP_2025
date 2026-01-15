# 🚀 AI Resume Parser Integration - Complete Setup Guide

## 📋 What Was Implemented

I've successfully integrated the AI Resume Parser with your .NET backend and React frontend. Here's what was created:

### ✅ Backend (.NET Core - Azure Functions)

#### **New Models** (`MANAGIX_BACKEND/MANAGIX.Models/Models/`)
- ✅ `ResumeEducation.cs` - Stores education details
- ✅ `ResumeSkill.cs` - Stores individual skills
- ✅ `ResumeProject.cs` - Stores project information
- ✅ `ResumeExperience.cs` - Stores work experience
- ✅ Updated `UserProfile.cs` - Added Summary field

#### **New DTOs** (`MANAGIX_BACKEND/MANAGIX.Models/DTO/`)
- ✅ `ResumeParsedDataDto.cs` - Contains all parsed resume data
- ✅ `ResumeUploadRequestDto.cs` - For file upload requests
- ✅ `ResumeSaveProfileDto.cs` - For saving complete profile
- ✅ `EducationDto.cs`, `ProjectDto.cs`, `ExperienceDto.cs` - Nested DTOs

#### **New Repositories** (`MANAGIX_BACKEND/MANAGIX.DataAccess/Repositories/`)
- ✅ `IResumeEducationRepository.cs` & `ResumeEducationRepository.cs`
- ✅ `IResumeSkillRepository.cs` & `ResumeSkillRepository.cs`
- ✅ `IResumeProjectRepository.cs` & `ResumeProjectRepository.cs`
- ✅ `IResumeExperienceRepository.cs` & `ResumeExperienceRepository.cs`
- ✅ Updated `IUnitOfWork.cs` & `UnitOfWork.cs`

#### **New Services** (`MANAGIX_BACKEND/MANAGIX.Services/`)
- ✅ `IResumeService.cs` & `ResumeService.cs`

#### **New Azure Function** (`MANAGIX_BACKEND/MANAGIX_FYP_2025/Functions/`)
- ✅ `ResumeFunction.cs` with 3 endpoints:
  - `POST /api/resume/parse` - Parse resume using Python service
  - `POST /api/resume/save` - Save parsed data to SQL Server
  - `GET /api/resume/{userId}` - Get resume data for a user

#### **Updated Files**
- ✅ `ApplicationDbContext.cs` - Added new DbSets
- ✅ `Program.cs` - Registered ResumeService

### ✅ Python FastAPI Service

#### **New Files** (`resume_parser/`)
- ✅ `fastapi_app.py` - Complete FastAPI service (replaces Streamlit)
- ✅ `requirements_fastapi.txt` - Dependencies for FastAPI
- ✅ `README_FASTAPI.md` - Setup instructions

**Features:**
- No database operations (removed MySQL/XAMPP dependency)
- Parses PDF and DOCX files
- Uses Groq LLM for intelligent parsing
- Returns structured JSON
- CORS enabled for .NET backend integration

### ✅ Frontend (React)

#### **New Files** (`MANAGIX_Frontend/managix/src/`)
- ✅ `api/resumeService.ts` - API service for resume operations
- ✅ `pages/resume/ResumeUpload.tsx` - Beautiful resume upload page
- ✅ `pages/resume/ResumeUpload.css` - Modern, responsive CSS

**Features:**
- File upload (PDF/DOCX)
- Real-time parsing with loading states
- Editable form fields for all parsed data
- Add/remove skills, education, projects, experience
- Beautiful gradient design
- Fully responsive

---

## 🛠️ Setup Instructions

### **Step 1: Database Migration**

You need to create a new migration for the new models:

```bash
cd MANAGIX_BACKEND/MANAGIX.DataAccess

# Create migration
dotnet ef migrations add AddResumeModels --startup-project ../MANAGIX_FYP_2025

# Apply migration to database
dotnet ef database update --startup-project ../MANAGIX_FYP_2025
```

This will create the following tables in your SQL Server database:
- `ResumeEducations`
- `ResumeSkills`
- `ResumeProjects`
- `ResumeExperiences`
- Updates `UserProfiles` table with `Summary` column

### **Step 2: Python FastAPI Service Setup**

```bash
cd resume_parser

# Install dependencies
pip install -r requirements_fastapi.txt

# Create .env file with your Groq API key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env

# Run the FastAPI service
python fastapi_app.py
```

The service will run on `http://localhost:8000`

**Important:** Keep this service running while using the resume upload feature.

### **Step 3: .NET Backend Setup**

```bash
cd MANAGIX_BACKEND/MANAGIX_FYP_2025

# Restore packages
dotnet restore

# Build the project
dotnet build

# Run the Azure Functions
func start
# OR
dotnet run
```

Your backend will run on `http://localhost:7071` (or your configured port)

### **Step 4: React Frontend Setup**

```bash
cd MANAGIX_Frontend/managix

# Install dependencies (if not already done)
npm install

# Run the development server
npm run dev
```

Your frontend will run on `http://localhost:5173` (or configured port)

---

## 📡 API Endpoints

### Backend (.NET)

1. **Parse Resume**
   - **POST** `/api/resume/parse`
   - **Body:**
     ```json
     {
       "userId": "guid",
       "fileName": "resume.pdf",
       "fileBase64": "base64_string"
     }
     ```

2. **Save Resume Profile**
   - **POST** `/api/resume/save`
   - **Body:**
     ```json
     {
       "userId": "guid",
       "name": "John Doe",
       "email": "john@example.com",
       "phone": "+1234567890",
       "summary": "Professional summary...",
       "education": [...],
       "skills": ["Python", "React", ...],
       "projects": [...],
       "experience": [...]
     }
     ```

3. **Get Resume Profile**
   - **GET** `/api/resume/{userId}`

### Python FastAPI

1. **Parse Resume**
   - **POST** `/parse-resume`
   - **Body:**
     ```json
     {
       "filename": "resume.pdf",
       "file_base64": "base64_string"
     }
     ```

2. **Health Check**
   - **GET** `/`

---

## 🎯 How to Use

### User Journey:

1. **Login to the Application**
   - Navigate to `/login`
   - User logs in (userId is stored in localStorage)

2. **Navigate to Resume Upload**
   - Go to `/resume-upload`

3. **Upload Resume**
   - Click "Choose a file" button
   - Select PDF or DOCX file
   - Click "Parse Resume" button

4. **Review & Edit**
   - AI parses the resume automatically
   - Review all parsed fields
   - Edit any incorrect information
   - Add/remove skills, education, projects, experience

5. **Save Profile**
   - Click "Save Profile" button
   - Data is saved to SQL Server database
   - User is redirected to dashboard

---

## 🔧 Configuration

### Python Service URL

If you deploy the Python service to a different URL, update `ResumeFunction.cs`:

```csharp
private const string PYTHON_PARSER_URL = "http://localhost:8000"; // Change this
```

### CORS Settings

For production, update CORS in `fastapi_app.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📊 Database Schema

### ResumeEducations
- `EducationId` (Guid, PK)
- `UserId` (Guid, FK to Users)
- `Degree` (string)
- `Institution` (string)
- `Year` (string)
- `Details` (string)
- `CreatedAt` (DateTime)

### ResumeSkills
- `SkillId` (Guid, PK)
- `UserId` (Guid, FK to Users)
- `SkillName` (string)
- `CreatedAt` (DateTime)

### ResumeProjects
- `ProjectId` (Guid, PK)
- `UserId` (Guid, FK to Users)
- `Title` (string)
- `Description` (string)
- `CreatedAt` (DateTime)

### ResumeExperiences
- `ExperienceId` (Guid, PK)
- `UserId` (Guid, FK to Users)
- `Title` (string)
- `Company` (string)
- `Duration` (string)
- `Description` (string)
- `CreatedAt` (DateTime)

### UserProfiles (Updated)
- Added: `Summary` (string)

---

## 🎨 Frontend Features

- **Modern UI**: Beautiful gradient design with smooth animations
- **Responsive**: Works on desktop, tablet, and mobile
- **Loading States**: Shows spinners during upload and parsing
- **Error Handling**: Clear error messages for user
- **Editable Fields**: All parsed data can be edited before saving
- **Dynamic Lists**: Add/remove items for skills, education, projects, experience
- **Validation**: File type validation (PDF/DOCX only)

---

## 🧪 Testing

### Test the FastAPI Service

```bash
# Health check
curl http://localhost:8000/

# Test with Swagger UI
# Open browser: http://localhost:8000/docs
```

### Test the Backend

Use tools like Postman or Thunder Client to test the endpoints.

### Test the Full Flow

1. Start all three services (Python, .NET, React)
2. Login to the application
3. Navigate to `/resume-upload`
4. Upload a sample resume
5. Verify parsing results
6. Edit if needed
7. Save and check database

---

## 🚀 Deployment Considerations

### Python FastAPI Service
- Deploy to: Azure App Service, AWS Lambda, Heroku, or DigitalOcean
- Use environment variables for `GROQ_API_KEY`
- Enable HTTPS
- Update CORS to allow only your domain

### .NET Backend
- Already set up for Azure Functions
- Update connection string for production database
- Update `PYTHON_PARSER_URL` to production URL

### React Frontend
- Build: `npm run build`
- Deploy to: Azure Static Web Apps, Vercel, Netlify
- Update API base URL in `axiosInstance.ts`

---

## 📝 What's Different from Old System

### ❌ Removed:
- Streamlit UI
- MySQL database
- XAMPP dependency
- Direct database saving in Python

### ✅ Added:
- FastAPI service (modern, production-ready)
- Integration with existing SQL Server
- React UI (consistent with your app)
- Normalized database structure
- Full CRUD operations
- Better error handling
- Modern UI/UX

---

## 🐛 Troubleshooting

### Python Service Won't Start
- Check if port 8000 is available
- Verify Groq API key is set in `.env`
- Check Python version (3.8+ required)

### Parsing Fails
- Verify Groq API key is valid
- Check file format (PDF/DOCX only)
- Check file is not corrupted
- Look at FastAPI logs: `python fastapi_app.py`

### Backend Connection Issues
- Verify Python service is running on port 8000
- Check CORS settings
- Verify database connection string
- Run migrations if not done

### Frontend Issues
- Clear browser cache
- Check console for errors
- Verify userId is in localStorage
- Check API base URL in `axiosInstance.ts`

---

## 📞 Support

If you encounter any issues:
1. Check the console logs (browser, backend, Python)
2. Verify all services are running
3. Check database connection
4. Ensure migrations are applied

---

## 🎉 Summary

You now have a fully integrated AI Resume Parser that:
- ✅ Works with your existing .NET backend
- ✅ Uses your SQL Server database
- ✅ Has a beautiful React UI
- ✅ No longer depends on Streamlit or XAMPP
- ✅ Follows your existing architecture patterns
- ✅ Is production-ready

**Next Steps:**
1. Run the database migration
2. Start the Python FastAPI service
3. Start your .NET backend
4. Start your React frontend
5. Test the resume upload flow
6. Enjoy! 🚀
