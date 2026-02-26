from fastapi import FastAPI
from pydantic import BaseModel
import spacy

# Load small English NLP model
nlp = spacy.load("en_core_web_sm")

app = FastAPI()

class Transcript(BaseModel):
    text: str

@app.post("/extract-tasks")
def extract_tasks(transcript: Transcript):
    doc = nlp(transcript.text)
    tasks = []

    # Very simple heuristic: any sentence with a verb becomes a task
    for sent in doc.sents:
        has_verb = any(token.pos_ == "VERB" for token in sent)
        if has_verb:
            tasks.append(sent.text.strip())

    return {"tasks": tasks}
