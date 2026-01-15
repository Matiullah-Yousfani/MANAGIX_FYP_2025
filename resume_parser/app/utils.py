import json

def extract_json_from_groq_response(content: str):
    """
    Extracts valid JSON from Groq LLM's raw string output.

    Parameters:
        content (str): The raw string output from the LLM.
    
    Returns:
        dict | None: Parsed JSON dictionary if valid, else None.
    """
    json_start = content.find('{')
    json_end = content.rfind('}') + 1
    if json_start != -1 and json_end != 0:
        try:
            return json.loads(content[json_start:json_end])
        except json.JSONDecodeError:
            return None
    return None