# Resume Parser FastAPI Service

This FastAPI service parses resumes (PDF/DOCX) using Groq LLM and returns structured JSON data.

## Setup

1. **Install dependencies:**
   ```bash
   cd resume_parser
   pip install -r requirements_fastapi.txt
   ```

2. **Set up environment variables:**
   Create a `.env` file in the `resume_parser` directory:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Run the FastAPI service:**
   ```bash
   python fastapi_app.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn fastapi_app:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### 1. Health Check
- **URL:** `GET http://localhost:8000/`
- **Response:**
  ```json
  {
    "service": "Resume Parser API",
    "status": "running",
    "version": "1.0.0"
  }
  ```

### 2. Parse Resume
- **URL:** `POST http://localhost:8000/parse-resume`
- **Request Body:**
  ```json
  {
    "filename": "resume.pdf",
    "file_base64": "base64_encoded_file_content"
  }
  ```
- **Response:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "summary": "Experienced software engineer...",
    "education": [
      {
        "degree": "BS Computer Science",
        "institution": "MIT",
        "year": "2020",
        "details": ""
      }
    ],
    "skills": ["Python", "Java", "React"],
    "projects": [
      {
        "title": "E-commerce Platform",
        "description": "Built a full-stack e-commerce..."
      }
    ],
    "experience": [
      {
        "title": "Software Engineer",
        "company": "Tech Corp",
        "duration": "2020-2023",
        "description": "Developed microservices..."
      }
    ]
  }
  ```

## Integration with .NET Backend

The .NET Azure Function (`ResumeFunction.cs`) calls this FastAPI service at `http://localhost:8000/parse-resume`.

For production:
1. Deploy this FastAPI service to Azure App Service, AWS, or any cloud provider
2. Update `PYTHON_PARSER_URL` in `ResumeFunction.cs` to point to the deployed service URL
3. Update CORS settings in `fastapi_app.py` to allow only your .NET backend domain

## Testing

You can test the API using curl:

```bash
# Health check
curl http://localhost:8000/

# Parse resume (you need to provide actual base64 content)
curl -X POST http://localhost:8000/parse-resume \
  -H "Content-Type: application/json" \
  -d '{"filename": "resume.pdf", "file_base64": "..."}'
```

Or use the Swagger UI at: `http://localhost:8000/docs`
