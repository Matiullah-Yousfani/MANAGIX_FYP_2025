Here's your complete and updated **`README.md`** based on:

* ✅ Two-table MySQL structure (`resumes` and `parsed_resumes`)
* ✅ Streamlit-based UI
* ✅ Clean Python module layout (`app/`)
* ✅ Future integration flexibility (e.g., with React or APIs)

---

```markdown
# 📄 Resume Parser with Streamlit + Groq + MySQL

A powerful tool to upload resumes (PDF/DOCX), extract structured data using **Groq LLM**, and store both the **raw resume file** and the **parsed JSON output** in a **MySQL database**.

---

## 🚀 Features

- ✅ Upload resume via **Streamlit UI**
- ✅ Support for **PDF** and **DOCX** formats
- ✅ Extracts resume text using `pdfplumber` and `python-docx`
- ✅ Sends resume to **Groq LLM** for parsing (name, email, phone, skills, etc.)
- ✅ Stores:
  - 🗂️ Original resume file in MySQL (`resumes` table)
  - 🧠 Parsed JSON result in MySQL (`parsed_resumes` table)
- ✅ Modular code (ready for React/FastAPI integrations)

---

## 📁 Project Structure

```

resume\_parser/
├── app/
│   ├── **init**.py              # Marks app as a Python package
│   ├── db.py                    # Database functions
│   ├── resume\_handler.py        # Resume extraction and parsing
│   └── utils.py                 # JSON extraction helper
├── streamlit\_app.py             # Main Streamlit frontend
├── .env                         # Secrets and DB config
├── requirements.txt             # Python dependencies
└── README.md                    # This file

````

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash

````

### 2. (Optional) Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🛠️ MySQL Setup

### Step 1: Create Database and Tables

```sql
CREATE DATABASE `mazik-internship-db`;

USE `mazik-internship-db`;

-- Table 1: Store uploaded resume files
DROP TABLE IF EXISTS resumes;
CREATE TABLE resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    filedata LONGBLOB,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Store parsed resume JSON
DROP TABLE IF EXISTS parsed_resumes;
CREATE TABLE parsed_resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT,
    parsed_json JSON,
    parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);
```

---

### Step 2: Configure `.env`

Create a `.env` file in the root folder:

```env
GROQ_API_KEY=your_groq_api_key_here

DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=mazik-internship-db
```

---

## ▶️ Run the Streamlit App

```bash
streamlit run streamlit_app.py
```

---

## 📤 Output Example

When a resume is uploaded and parsed:

* 📄 The file is stored in MySQL `resumes`
* 🧠 The parsed JSON is stored in `parsed_resumes`

Example JSON:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-234-567-890",
  "education": ["BS Computer Science", "MS Data Science"],
  "experience": ["Software Engineer at X", "Data Analyst at Y"],
  "skills": ["Python", "SQL", "Machine Learning"]
}
```



## 📦 Dependencies (`requirements.txt`)

```txt
streamlit
pdfplumber
python-docx
requests
python-dotenv
pymysql
```

---

