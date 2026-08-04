import os
import json
import numpy as np
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from sqlmodel import Session
from backend.app.models import CurriculumChunk
from pypdf import PdfReader
from io import BytesIO

# Initialize Gemini Client if API key is provided
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Error initializing Gemini client: {e}")

def get_embedding(text: str) -> List[float]:
    """Generates 1536-dim vector embedding for text using Gemini, or a mock vector if no API key."""
    if not client:
        # Mock embedding (random deterministic vector based on text length)
        np.random.seed(len(text) % 1000)
        return np.random.randn(1536).tolist()
    
    try:
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
        )
        return response.embeddings[0].values
    except Exception as e:
        print(f"Error generating embedding: {e}")
        # Fallback to deterministic random vector on failure
        np.random.seed(len(text) % 1000)
        return np.random.randn(1536).tolist()

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Computes cosine similarity between two vectors."""
    a_arr, b_arr = np.array(a), np.array(b)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
    """Splits text into chunks of clean size with an overlap."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return chunks

def process_file_to_chunks(
    file_bytes: bytes, filename: str, subject: str, topic: str, grade: str, language: str
) -> List[CurriculumChunk]:
    """Extracts text from PDF or TXT, chunks it, and creates CurriculumChunk models with embeddings."""
    text = ""
    if filename.lower().endswith(".pdf"):
        try:
            reader = PdfReader(BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {e}")
    else:
        try:
            text = file_bytes.decode("utf-8")
        except Exception as e:
            text = file_bytes.decode("latin-1")
            
    if not text.strip():
        raise ValueError("Document has no text content")
        
    text_chunks = chunk_text(text)
    chunks = []
    for index, txt in enumerate(text_chunks):
        embedding = get_embedding(txt)
        chunk = CurriculumChunk(
            subject=subject,
            topic=topic,
            grade=grade,
            language=language,
            source_document=filename,
            content=txt,
            embedding_json=json.dumps(embedding),
            version=1
        )
        chunks.append(chunk)
    return chunks

def retrieve_context(
    query: str, subject: str, grade: str, language: str, session: Session, top_k: int = 3
) -> List[Dict[str, Any]]:
    """Retrieves relevant curriculum chunks using local Cosine Similarity over metadata-filtered database records."""
    # Filter chunks by subject, grade, and language
    query_results = session.query(CurriculumChunk).filter(
        CurriculumChunk.subject == subject,
        CurriculumChunk.grade == grade,
        CurriculumChunk.language == language
    ).all()
    
    if not query_results:
        return []
        
    query_vector = get_embedding(query)
    
    scored_chunks = []
    for chunk in query_results:
        try:
            chunk_vector = json.loads(chunk.embedding_json)
            if not chunk_vector:
                continue
            sim = cosine_similarity(query_vector, chunk_vector)
            scored_chunks.append((sim, chunk))
        except Exception as e:
            print(f"Error parsing embedding for chunk {chunk.id}: {e}")
            continue
            
    # Sort by similarity descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    return [
        {
            "content": chunk.content,
            "source": chunk.source_document,
            "topic": chunk.topic,
            "similarity": score
        }
        for score, chunk in scored_chunks[:top_k]
    ]

def is_out_of_scope(query: str, subject: str, grade: str, context_texts: List[str]) -> tuple[bool, str]:
    """Determines if a student query is outside the curriculum scope for the grade and subject."""
    if not client:
        # Mock scope check: reject programming if subject is English or biology
        programming_keywords = ["python", "javascript", "code", "programming", "sql", "html"]
        if subject.lower() in ["english", "biology", "maths"] and any(kw in query.lower() for kw in programming_keywords):
            return True, f"This question appears to be about programming/coding, which is outside the scope of Grade {grade} {subject}."
        return False, ""

    prompt = f"""
You are an curriculum gatekeeper for I-Pass-A, an educational tutoring system.
Your job is to determine if the student's question is OUT OF SCOPE for Grade {grade} {subject}.

Curriculum Grounding context:
{chr(10).join(context_texts[:3])}

Student Query: "{query}"

Analyze if the query is relevant to Grade {grade} {subject} or standard school syllabus for this subject.
If it is clearly unrelated (e.g. asking for coding in an English class, asking for unrelated personal advice, or adult topics), classify it as OUT OF SCOPE.
Otherwise, classify it as IN SCOPE.

Respond in JSON format:
{{
  "out_of_scope": true/false,
  "explanation": "Brief explanation of why it is out of scope and redirect to the correct topic, or empty if in scope. Write explanation in the language of the subject (English for Grade 9-12, Afaan Oromo for Grade 1-8)."
}}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        res_data = json.loads(response.text)
        return res_data.get("out_of_scope", False), res_data.get("explanation", "")
    except Exception as e:
        print(f"Error checking scope with Gemini: {e}")
        return False, ""

def generate_tutor_response(
    query: str, subject: str, grade: str, language: str, history: List[Dict[str, str]], session: Session
) -> Dict[str, Any]:
    """Generates a step-by-step tutoring response grounded in curriculum RAG context."""
    # Retrieve relevant context
    retrieved = retrieve_context(query, subject, grade, language, session)
    context_texts = [c["content"] for c in retrieved]
    
    # Check out-of-scope
    out_of_scope_flag, redirection = is_out_of_scope(query, subject, grade, context_texts)
    if out_of_scope_flag:
        return {
            "content": redirection or f"This question is outside the scope of Grade {grade} {subject}.",
            "sources": [],
            "out_of_scope": True
        }
        
    if not client:
        # Mock tutoring response when Gemini is not active
        sources = list(set([c["source"] for c in retrieved]))
        mock_content = f"**(Mock AI Tutor)** Thank you for asking about **{query}**.\n\nHere is a step-by-step explanation:\n1. Since the Gemini API key is not configured, this is a simulated response.\n2. In a live system, this response would be generated using your curriculum documents: *{', '.join(sources) if sources else 'No documents uploaded yet'}*.\n3. Make sure to upload curriculum text files in the admin dashboard and configure the `GEMINI_API_KEY`."
        return {
            "content": mock_content,
            "sources": retrieved,
            "out_of_scope": False
        }
        
    # Prepare Prompt with Context and History
    context_block = "\n---\n".join(context_texts)
    
    history_block = ""
    for msg in history[-5:]:  # Include last 5 messages
        role = "Student" if msg["sender"] == "student" else "Tutor"
        history_block += f"{role}: {msg['content']}\n"
        
    system_instruction = f"""
You are an expert, friendly AI Tutor for Grade {grade} in {subject}. The language of instruction is {language}.
All your explanations must be:
1. Grounded in the provided curriculum content. Do not make up facts not mentioned in context unless it's basic background math/grammar.
2. Formatted step-by-step, making it easy for a student to follow.
3. Engaging, clear, and age-appropriate (Grade {grade} level).
4. Written entirely in {language}.
"""

    prompt = f"""
Curriculum Context Chunks:
{context_block}

Recent Chat History:
{history_block}

Current Question: "{query}"

Provide your step-by-step tutoring explanation below in {language}:
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        return {
            "content": response.text,
            "sources": retrieved,
            "out_of_scope": False
        }
    except Exception as e:
        print(f"Error generating tutor response: {e}")
        return {
            "content": f"Sorry, there was an error generating the tutoring response. Please try again. ({e})",
            "sources": retrieved,
            "out_of_scope": False
        }
