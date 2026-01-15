import os

import streamlit as st

from app.db import ensure_freelancer_exists
from app.resume_handler import handle_resume_upload


st.set_page_config(page_title="Resume Parser Test", layout="centered")
st.title("Resume Parser Test 🚀")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    st.error("GROQ_API_KEY is not set in your environment/.env file.")


# --- Step 1: Freelancer ID Input ---
freelancer_id = st.number_input("Enter Freelancer ID", min_value=1, step=1)

if st.button("Initialize Freelancer"):
    ensure_freelancer_exists(freelancer_id)
    st.success(f"Freelancer {freelancer_id} initialized successfully!")


# --- Step 2: Upload Resume ---
uploaded_file = st.file_uploader("Upload Resume (PDF or DOCX)", type=["pdf", "docx"])

if uploaded_file is not None and GROQ_API_KEY:
    with st.spinner("Uploading and parsing resume with Groq..."):
        merged_json, err = handle_resume_upload(uploaded_file, GROQ_API_KEY, freelancer_id)

    if err:
        st.error(f"Error: {err}")
    else:
        st.success("Resume parsed and saved to database successfully!")
        st.subheader("Parsed Resume JSON")
        st.json(merged_json)
