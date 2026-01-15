# app/db.py
import pymysql
import os
import json
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port =3306,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

print("User:", os.getenv("DB_USER"))
print("Password:", os.getenv("DB_PASSWORD"))
print("Host:", os.getenv("DB_HOST"))
print("DB:", os.getenv("DB_NAME"))

DEFAULT_PARSED_JSON = {
    "name": "",
    "email": "",
    "phone": "",
    "summary": "",
    "education": [],
    "skills": [],
    "projects": [],
    "experience": []
}

def get_default_parsed_json():
    return DEFAULT_PARSED_JSON.copy()

def get_parsed_resume(freelancer_id):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT parsed_json FROM freelancers WHERE id=%s", (freelancer_id,))
        result = cursor.fetchone()
    conn.close()
    return json.loads(result['parsed_json']) if result and result['parsed_json'] else None

import json
import pymysql  # or your preferred import style


def _normalize_scalar(value):
    """
    Ensure values going into simple VARCHAR/TEXT columns are strings,
    even if Groq returns dicts/lists instead of plain text.
    """
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        # Store a compact JSON string rather than a Python dict
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def save_parsed_json(freelancer_id, parsed_json):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # First check if freelancer exists
            cursor.execute("SELECT id FROM freelancers WHERE id = %s", (freelancer_id,))
            freelancer_exists = cursor.fetchone()
            
            if not freelancer_exists:
                print(f"Creating new freelancer entry with ID: {freelancer_id}")
                cursor.execute("""
                    INSERT INTO freelancers (id) 
                    VALUES (%s)
                """, (freelancer_id,))
            
            # Extract and normalize fields from parsed JSON
            name = _normalize_scalar(parsed_json.get('name', ''))
            email = _normalize_scalar(parsed_json.get('email', ''))
            phone = _normalize_scalar(parsed_json.get('phone', ''))
            summary = _normalize_scalar(parsed_json.get('summary', ''))
            
            # Update freelancer record
            cursor.execute("""
                UPDATE freelancers 
                SET 
                    name = %s,
                    email = %s,
                    phone = %s,
                    summary = %s,
                    parsed_json = %s,
                    parsed_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                name,
                email,
                phone,
                summary,
                json.dumps(parsed_json),
                freelancer_id
            ))

            if cursor.rowcount == 0:
                print(f"Warning: No rows updated for freelancer ID: {freelancer_id}")
            else:
                print(f"Successfully updated freelancer profile for ID: {freelancer_id}")
                print(f"Updated fields: name='{name}', email='{email}', phone='{phone}', summary='{summary[:50]}...'")
        
        conn.commit()

    except pymysql.MySQLError as e:
        print(f"Database error: {e}")
        conn.rollback()
        raise
    except Exception as e:
        print(f"Error saving parsed JSON: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def is_email_duplicate(email, freelancer_id):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM freelancers WHERE email=%s AND id!=%s
        """, (email, freelancer_id))
        result = cursor.fetchone()
    conn.close()
    return result['cnt'] > 0

# Manual Insertions

def add_skill_manual(freelancer_id, skill_name):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM skills WHERE freelancer_id=%s AND skill_name=%s
        """, (freelancer_id, skill_name))
        if cursor.fetchone()['cnt'] == 0:
            cursor.execute("""
                INSERT INTO skills (freelancer_id, skill_name, source) VALUES (%s, %s, 'manual')
            """, (freelancer_id, skill_name))

            parsed_json = get_parsed_resume(freelancer_id) or get_default_parsed_json()
            if skill_name not in parsed_json.get("skills", []):
                parsed_json["skills"].append(skill_name)
                save_parsed_json(freelancer_id, parsed_json)
    conn.commit()
    conn.close()

def add_project_manual(freelancer_id, title, description):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM projects WHERE freelancer_id=%s AND title=%s
        """, (freelancer_id, title))
        if cursor.fetchone()['cnt'] == 0:
            cursor.execute("""
                INSERT INTO projects (freelancer_id, title, description, source) VALUES (%s, %s, %s, 'manual')
            """, (freelancer_id, title, description))

            parsed_json = get_parsed_resume(freelancer_id) or get_default_parsed_json()
            if title not in {p["title"] for p in parsed_json.get("projects", [])}:
                parsed_json["projects"].append({
                    "title": title,
                    "description": description
                })
                save_parsed_json(freelancer_id, parsed_json)
    conn.commit()
    conn.close()

def add_experience_manual(freelancer_id, title, company, duration, description):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM experience WHERE freelancer_id=%s AND title=%s AND company=%s
        """, (freelancer_id, title, company))
        if cursor.fetchone()['cnt'] == 0:
            cursor.execute("""
                INSERT INTO experience (freelancer_id, title, company, duration, description, source)
                VALUES (%s, %s, %s, %s, %s, 'manual')
            """, (freelancer_id, title, company, duration, description))

            parsed_json = get_parsed_resume(freelancer_id) or get_default_parsed_json()
            existing = {(e["title"], e["company"]) for e in parsed_json.get("experience", [])}
            if (title, company) not in existing:
                parsed_json["experience"].append({
                    "title": title,
                    "company": company,
                    "duration": duration,
                    "description": description
                })
                save_parsed_json(freelancer_id, parsed_json)
    conn.commit()
    conn.close()

# Parsed Insert Helpers

def insert_skill_if_not_exists(cursor, freelancer_id, skill, source='parsed'):
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM skills WHERE freelancer_id=%s AND skill_name=%s
    """, (freelancer_id, skill))
    if cursor.fetchone()['cnt'] == 0:
        cursor.execute("""
            INSERT INTO skills (freelancer_id, skill_name, source) VALUES (%s, %s, %s)
        """, (freelancer_id, skill, source))

def insert_project_if_not_exists(cursor, freelancer_id, project, source='parsed'):
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM projects WHERE freelancer_id=%s AND title=%s
    """, (freelancer_id, project["title"]))
    if cursor.fetchone()['cnt'] == 0:
        cursor.execute("""
            INSERT INTO projects (freelancer_id, title, description, source)
            VALUES (%s, %s, %s, %s)
        """, (freelancer_id, project["title"], project["description"], source))

def insert_experience_if_not_exists(cursor, freelancer_id, experience, source='parsed'):
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM experience
        WHERE freelancer_id=%s AND title=%s AND company=%s
    """, (freelancer_id, experience["title"], experience["company"]))
    if cursor.fetchone()['cnt'] == 0:
        cursor.execute("""
            INSERT INTO experience (freelancer_id, title, company, duration, description, source)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            freelancer_id,
            experience["title"],
            experience["company"],
            experience["duration"],
            experience["description"],
            source
        ))

# Resume Updater

def update_resume(freelancer_id, new_parsed_json):
    """
    Merge old and new resumes.
    Insert only new skills, projects, and experience into tables.
    """

    old_parsed = get_parsed_resume(freelancer_id) or get_default_parsed_json()

    # Summary
    summary = new_parsed_json.get("summary") or old_parsed.get("summary", "")

    # Skills
    new_skills = set(new_parsed_json.get("skills", []))
    old_skills = set(old_parsed.get("skills", []))
    skills_to_add = new_skills - old_skills
    combined_skills = list(old_skills.union(new_skills))

    # Projects (robust to missing keys / string entries)
    old_proj_titles = {
        p.get("title")
        for p in old_parsed.get("projects", [])
        if isinstance(p, dict) and p.get("title")
    }
    combined_projects = [
        p for p in old_parsed.get("projects", []) if isinstance(p, dict)
    ]
    projects_to_add = []
    for proj in new_parsed_json.get("projects", []):
        # Allow project entries to be either dicts or plain strings
        if isinstance(proj, dict):
            proj_obj = {
                "title": proj.get("title") or "",
                "description": proj.get("description") or "",
            }
        else:
            proj_obj = {"title": str(proj), "description": ""}

        title = proj_obj.get("title", "").strip()
        if not title:
            continue

        if title not in old_proj_titles:
            combined_projects.append(proj_obj)
            projects_to_add.append(proj_obj)
            old_proj_titles.add(title)

    # Experience (robust to missing keys / string entries)
    old_exp_keys = {
        (e.get("title"), e.get("company"))
        for e in old_parsed.get("experience", [])
        if isinstance(e, dict) and e.get("title") and e.get("company")
    }
    combined_experience = [
        e for e in old_parsed.get("experience", []) if isinstance(e, dict)
    ]
    experience_to_add = []
    for exp in new_parsed_json.get("experience", []):
        if isinstance(exp, dict):
            exp_obj = {
                "title": exp.get("title") or "",
                "company": exp.get("company") or "",
                "duration": exp.get("duration") or "",
                "startDate": exp.get("startDate") or exp.get("start_date") or "",
                "endDate": exp.get("endDate") or exp.get("end_date") or "",
                "description": exp.get("description") or "",
            }
        else:
            # If we only get a string, treat it as a title with unknown company
            exp_obj = {
                "title": str(exp),
                "company": "",
                "duration": "",
                "startDate": "",
                "endDate": "",
                "description": "",
            }

        key = (exp_obj.get("title"), exp_obj.get("company"))
        if not exp_obj.get("title"):
            continue

        if key not in old_exp_keys:
            combined_experience.append(exp_obj)
            experience_to_add.append(exp_obj)
            old_exp_keys.add(key)

    # Final JSON
    merged_json = {
        "name": new_parsed_json.get("name", old_parsed.get("name", "")),
        "email": new_parsed_json.get("email", old_parsed.get("email", "")),
        "phone": new_parsed_json.get("phone", old_parsed.get("phone", "")),
        "summary": summary,
        "education": new_parsed_json.get("education", old_parsed.get("education", [])),
        "skills": combined_skills,
        "projects": combined_projects,
        "experience": combined_experience
    }

    # Save JSON back
    save_parsed_json(freelancer_id, merged_json)

    # Insert new data
    conn = get_connection()
    with conn.cursor() as cursor:

        for skill in skills_to_add:
            cursor.execute("""
                INSERT INTO skills (freelancer_id, skill_name, source)
                VALUES (%s, %s, 'parsed')
            """, (freelancer_id, skill))

        for proj in projects_to_add:
            cursor.execute("""
                INSERT INTO projects (freelancer_id, title, description, source)
                VALUES (%s, %s, %s, 'parsed')
            """, (freelancer_id, proj.get("title", ""), proj.get("description", "")))

        for exp in experience_to_add:
            # Use only duration (not startDate/endDate) to match database schema
            cursor.execute("""
                INSERT INTO experience (freelancer_id, title, company, duration, description, source)
                VALUES (%s, %s, %s, %s, %s, 'parsed')
            """, (
                freelancer_id,
                exp.get("title", ""),
                exp.get("company", ""),
                exp.get("duration", ""),
                exp.get("description", "")
            ))

    conn.commit()
    conn.close()

    return merged_json

def save_resume_file(freelancer_id, filename, file_data):
    from app.db import get_connection
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("""
            UPDATE freelancers 
            SET resume_filename=%s, resume_filedata=%s, uploaded_at=CURRENT_TIMESTAMP
            WHERE id=%s
        """, (filename, file_data, freelancer_id))
    conn.commit()
    conn.close()

def update_summary(freelancer_id, new_summary):
    """
    Update only the summary field in both the 'freelancers' table and parsed_json.
    """

    conn = get_connection()
    with conn.cursor() as cursor:
        # Update summary in main table
        cursor.execute("""
            UPDATE freelancers
            SET summary=%s
            WHERE id=%s
        """, (new_summary, freelancer_id))

    conn.commit()
    conn.close()

    # Update summary in parsed_json
    parsed_json = get_parsed_resume(freelancer_id) or get_default_parsed_json()
    parsed_json["summary"] = new_summary
    save_parsed_json(freelancer_id, parsed_json)

    return {"freelancer_id": freelancer_id, "summary": new_summary}

def ensure_freelancer_exists(freelancer_id):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as cnt FROM freelancers WHERE id=%s", (freelancer_id,))
        result = cursor.fetchone()
        if result['cnt'] == 0:
            # Insert a new row with the given freelancer_id
            cursor.execute(
                "INSERT INTO freelancers (id) VALUES (%s)",
                (freelancer_id,)
            )
    conn.commit()
    conn.close()
