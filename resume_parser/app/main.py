from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Body
from fastapi.responses import JSONResponse
from .resume_handler import handle_resume_upload
from .db import save_parsed_json, get_parsed_resume
from .Embedding import process_freelancer
from .Recommender import recommend_freelancers
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env!")

vector_folder = os.getenv("VECTOR_FOLDER_PATH")
if not vector_folder:
    raise ValueError("VECTOR_FOLDER_PATH not found in .env!")



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/get-parsed-json/{freelancer_id}")
async def get_parsed_json_endpoint(freelancer_id: int):
    try:
        parsed_json = get_parsed_resume(freelancer_id)
        if parsed_json is None:
            raise HTTPException(status_code=404, detail="No parsed JSON found for this freelancer")
        return parsed_json
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/parse-resume/")
async def parse_resume(file: UploadFile = File(...), freelancer_id: int = Form(...)):
    try:
        api_key = os.getenv('GROQ_API_KEY')
        print(api_key)
        parsed_data, error = handle_resume_upload(file, api_key, freelancer_id)
        if error:
                print("error:", error)
                raise HTTPException(status_code=400, detail=error)
        
        return parsed_data
    except HTTPException as e:
            raise e  # Pass along our custom error to frontend
    except Exception as e:
        import traceback
        print("UNHANDLED ERROR in /api/parse-resume/:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
 
@app.post("/api/update-parsed-json/")
async def update_parsed_json(
    freelancer_id: int = Body(...),
    parsed_json: dict = Body(...)
):
    try:
        save_parsed_json(freelancer_id, parsed_json)
        process_freelancer({
        "freelancer_id": str(freelancer_id),
        "parsed_resume": parsed_json,
        "hourly_rate": parsed_json.get("hourly_rate", 0),
        "location": parsed_json.get("location", ""),
        "availability": parsed_json.get("availability", "Unknown")
    }, api_key)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/suggest-freelancers/")
async def suggest_freelancers(
    project_summary: str = Body(..., embed=True),
):
    try:
        collection_list = os.listdir(vector_folder)
        results = recommend_freelancers(project_summary, collection_list)
        filtered_results = [
            {
                "summary": r.get("summary"),
                "freelancer_id": r.get("freelancer_id"),
                "skills": r.get("skills", []),
                "availability": r.get("availability")
            }
            for r in results
        ]
        print(results)
        return {"suggestions": filtered_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
 #uvicorn app.main:app --reload