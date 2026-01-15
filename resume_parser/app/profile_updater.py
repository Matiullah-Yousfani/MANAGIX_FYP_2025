from app.db import get_connection

def create_freelancer():
    conn = get_connection()
    cursor = conn.cursor()

    sql = """
    INSERT INTO freelancers (name, email, phone, summary)
    VALUES (NULL, NULL, NULL, NULL)
    """
    cursor.execute(sql)
    freelancer_id = cursor.lastrowid

    conn.commit()
    cursor.close()
    conn.close()

    return freelancer_id


def update_freelancer_contact(freelancer_id, name, email, phone):
    conn = get_connection()
    cursor = conn.cursor()

    sql = """
    UPDATE freelancers
    SET name = %s,
        email = %s,
        phone = %s
    WHERE id = %s
    """
    cursor.execute(sql, (name, email, phone, freelancer_id))

    conn.commit()
    cursor.close()
    conn.close()

def update_freelancer_summary(freelancer_id, summary):
    conn = get_connection()
    cursor = conn.cursor()
    sql = """
    UPDATE freelancers SET summary = %s WHERE id = %s
    """
    cursor.execute(sql, (summary, freelancer_id))
    conn.commit()
    cursor.close()
    conn.close()

def save_or_update_resume(freelancer_id, filename, filedata):
    conn = get_connection()
    cursor = conn.cursor()
    sql = """
    INSERT INTO resumes (freelancer_id, filename, filedata)
    VALUES (%s, %s, %s)
    ON DUPLICATE KEY UPDATE 
        filename = VALUES(filename),
        filedata = VALUES(filedata),
        uploaded_at = CURRENT_TIMESTAMP
    """
    cursor.execute(sql, (freelancer_id, filename, filedata))
    conn.commit()
    cursor.close()
    conn.close()

def insert_skills(freelancer_id, skills, source='parsed'):
    conn = get_connection()
    cursor = conn.cursor()
    for skill in skills:
        cursor.execute("""
            INSERT INTO skills (freelancer_id, skill_name, source)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE source = VALUES(source)
        """, (freelancer_id, skill, source))
    conn.commit()
    cursor.close()
    conn.close()

def insert_projects(freelancer_id, projects, source='parsed'):
    conn = get_connection()
    cursor = conn.cursor()
    for p in projects:
        cursor.execute("""
            INSERT INTO projects (freelancer_id, title, description, source)
            VALUES (%s, %s, %s, %s)
        """, (freelancer_id, p['title'], p['description'], source))
    conn.commit()
    cursor.close()
    conn.close()

def insert_experience(freelancer_id, experience, source='parsed'):
    conn = get_connection()
    cursor = conn.cursor()
    for exp in experience:
        cursor.execute("""
            INSERT INTO experience (freelancer_id, title, company, startDate, endDate, description, source)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (freelancer_id, exp['title'], exp['company'], exp['startDate'], exp['endDate'], exp['description'], source))
    conn.commit()
    cursor.close()
    conn.close()
