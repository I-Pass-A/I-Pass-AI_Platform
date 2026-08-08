"""
i-pass-AI Zero-Dependency Standalone Python Backend Server
Runs natively on any Python installation (No pip install required!)
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import math
import re
import urllib.parse
from typing import List, Dict, Any

# --- CURRICULUM VECTOR DATABASE ---
RAW_CHUNKS = [
    {
        "id": "ENG-G9-U1-C1", "grade": 9, "subject": "English", "unit": 1, "unit_title": "Learning to Learn",
        "topic": "Present Simple vs Present Continuous",
        "content": "Present Simple is used for habitual actions, facts, and permanent states (e.g., 'Abebe studies every evening'). Present Continuous is used for actions happening right now or around the present moment (e.g., 'Students are reading in the library now'). Signal words for Present Simple include: always, usually, often, every day. Signal words for Present Continuous include: now, right now, at the moment, currently."
    },
    {
        "id": "ENG-G9-U1-C2", "grade": 9, "subject": "English", "unit": 1, "unit_title": "Learning to Learn",
        "topic": "Dictionary Skills & Guide Words",
        "content": "Guide words at the top of a dictionary page show the first and last words on that page. Headwords are listed alphabetically. Part of speech labels (n., v., adj., adv.) tell how the word functions in a sentence."
    },
    {
        "id": "ENG-G9-U2-C1", "grade": 9, "subject": "English", "unit": 2, "unit_title": "Family Life & Relationships",
        "topic": "Past Simple vs Past Continuous",
        "content": "Past Simple expresses completed actions in the past (e.g., 'Chaltu arrived home at 6 PM'). Past Continuous expresses an ongoing background action in the past (e.g., 'Her brother was doing his homework when she arrived'). We often use 'when' before Past Simple and 'while' before Past Continuous."
    },
    {
        "id": "ENG-G9-U3-C1", "grade": 9, "subject": "English", "unit": 3, "unit_title": "Traffic Safety & Road Usage",
        "topic": "Modal Verbs of Obligation & Advice",
        "content": "Use 'must' and 'have to' for strong obligation or official rules (e.g., 'Pedestrians must cross at zebra crossings'). Use 'should' or 'ought to' for advice and recommendations (e.g., 'Drivers should check their mirrors before turning'). Use 'must not' (mustn't) for prohibition (e.g., 'You must not drive without a seatbelt')."
    },
    {
        "id": "ENG-G9-U4-C1", "grade": 9, "subject": "English", "unit": 4, "unit_title": "Health and Fitness",
        "topic": "First Conditional (Real Possibility)",
        "content": "First Conditional structure: If + Present Simple, Will + Base Verb. It describes real, probable future events based on a condition (e.g., 'If you eat balanced traditional Ethiopian food like teff and vegetables, you will maintain good health'). If the 'if clause' comes first, use a comma."
    },
    {
        "id": "ENG-G9-U5-C1", "grade": 9, "subject": "English", "unit": 5, "unit_title": "Technology and Innovation",
        "topic": "Passive Voice (Present & Past Simple)",
        "content": "Passive Voice focuses on the action or receiver rather than the doer. Present Passive: Object + am/is/are + Past Participle (V3) (e.g., 'Solar energy is used across rural Ethiopia'). Past Passive: Object + was/were + Past Participle (V3) (e.g., 'The innovation award was presented to the young engineer')."
    },
    {
        "id": "ENG-G9-U5-C2", "grade": 9, "subject": "English", "unit": 5, "unit_title": "Technology and Innovation",
        "topic": "Relative Pronouns (Who, Which, That, Where)",
        "content": "Use 'who' for people ('The student who won the award is in Grade 9'). Use 'which' or 'that' for things and animals ('The software which was developed in Addis Ababa is free'). Use 'where' for places ('The lab where we conduct science experiments is brand new')."
    },
    {
        "id": "ENG-G9-U6-C1", "grade": 9, "subject": "English", "unit": 6, "unit_title": "Natural Resources & Conservation",
        "topic": "Second Conditional (Hypothetical/Unreal)",
        "content": "Second Conditional structure: If + Past Simple, Would + Base Verb. Used for hypothetical or unlikely present/future situations (e.g., 'If we planted more indigenous trees, our local climate would improve'). Note: For the verb 'to be', use 'were' for all subjects in formal grammar (e.g., 'If I were the minister...')."
    },
    {
        "id": "ENG-G9-U6-C2", "grade": 9, "subject": "English", "unit": 6, "unit_title": "Natural Resources & Conservation",
        "topic": "Cause and Effect Connectors",
        "content": "Cause connectors: because, since, as, due to, owing to. Effect connectors: therefore, as a result, consequently, so. Note: 'due to' and 'owing to' are followed by a noun phrase or gerund."
    },
    {
        "id": "ENG-G9-U7-C1", "grade": 9, "subject": "English", "unit": 7, "unit_title": "Cultural Heritage & Traditions",
        "topic": "Reported Speech (Indirect Speech)",
        "content": "When reporting statements in the past, present tenses shift back one step into the past. Present Simple -> Past Simple ('I love Meskel' -> He said he loved Meskel). Present Continuous -> Past Continuous. Present Perfect -> Past Perfect. Pronouns and time expressions also change (e.g., 'today' becomes 'that day', 'now' becomes 'then')."
    },
    {
        "id": "ENG-G9-U8-C1", "grade": 9, "subject": "English", "unit": 8, "unit_title": "Indigenous Knowledge",
        "topic": "Comparatives & Superlatives",
        "content": "Comparative adjective (+er / more) compares 2 items. Superlative adjective (+est / most) compares 3 or more items. Irregular forms: good -> better -> best; bad -> worse -> worst; far -> farther/further -> farthest/furthest."
    },
    {
        "id": "ENG-G9-U9-C1", "grade": 9, "subject": "English", "unit": 9, "unit_title": "Environment and Climate Change",
        "topic": "Present Perfect Tense",
        "content": "Structure: Subject + have/has + Past Participle (V3). Used for actions that started in the past and continue to the present, or past actions with present relevance (e.g., 'Ethiopia has launched the Green Legacy initiative'). Time indicators: since (point in time), for (duration)."
    },
    {
        "id": "ENG-G9-U10-C1", "grade": 9, "subject": "English", "unit": 10, "unit_title": "Future Aspirations & Careers",
        "topic": "Future Expressions (Will vs Be Going To)",
        "content": "Use 'be going to' for prior plans, intentions, or clear present evidence (e.g., 'Look at the dark clouds, it is going to rain'). Use 'will' for instant decisions, promises, offers, or general predictions (e.g., 'I will help you with your English assignment')."
    }
]

QUESTION_BANK = [
    {
        "id": "EXAM-G9-01", "unit_id": 1, "topic": "Present Simple vs Continuous", "section": "Grammar & Usage",
        "question": "Choose the correct sentence to complete the conversation:\nAman: 'Where is Hawi?'\nBetelehem: 'She ________ in the library right now.'",
        "options": ["A) studied", "B) is studying", "C) studies", "D) has studied"],
        "correct_option": "B",
        "explanation": "The phrase 'right now' indicates an action in progress at the moment of speaking (Present Continuous)."
    },
    {
        "id": "EXAM-G9-02", "unit_id": 3, "topic": "Modal Verbs", "section": "Modal Verbs & Safety Rules",
        "question": "According to traffic regulations in Ethiopia, pedestrians ________ use zebra crossings when crossing busy highways.",
        "options": ["A) should not", "B) must", "C) might", "D) would"],
        "correct_option": "B",
        "explanation": "'Must' expresses strong legal obligation and official road safety rules."
    },
    {
        "id": "EXAM-G9-03", "unit_id": 4, "topic": "First Conditional", "section": "Conditionals",
        "question": "If students prepare consistently for the Grade 9 regional exams, they ________ high marks.",
        "options": ["A) will achieve", "B) achieved", "C) would achieve", "D) had achieved"],
        "correct_option": "A",
        "explanation": "First Conditional formula: If + Present Simple (prepare) -> Will + Base Verb (will achieve)."
    },
    {
        "id": "EXAM-G9-04", "unit_id": 5, "topic": "Passive Voice", "section": "Passive Voice",
        "question": "Identify the correct passive form of: 'The teacher corrected our test papers yesterday.'",
        "options": [
            "A) Our test papers are corrected yesterday by the teacher.",
            "B) Our test papers were corrected by the teacher yesterday.",
            "C) Our test papers have been corrected by the teacher.",
            "D) The teacher was corrected our test papers."
        ],
        "correct_option": "B",
        "explanation": "Past Simple Active ('corrected') becomes Past Simple Passive: Object + was/were + Past Participle ('were corrected')."
    }
]

# --- SIMPLE VECTOR SEARCH ENGINE ---
def tokenize(text: str) -> List[str]:
    return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())

def search_vector_db(query: str, top_k=2):
    q_tokens = set(tokenize(query))
    if not q_tokens:
        return []

    scored_chunks = []
    for chunk in RAW_CHUNKS:
        c_text = f"{chunk['topic']} {chunk['unit_title']} {chunk['content']}"
        c_tokens = set(tokenize(c_text))
        overlap = len(q_tokens.intersection(c_tokens))
        if overlap > 0:
            scored_chunks.append((overlap, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [c[1] for c in scored_chunks[:top_k]]

# --- TUTOR RESPONSE GENERATOR (5 OPERATIONAL RULES) ---
def process_tutor_query(query: str, lang: str = "EN") -> Dict[str, Any]:
    matched_chunks = search_vector_db(query)
    is_supported = len(matched_chunks) > 0

    if not is_supported:
        return {
            "direct_answer": "This general concept involves standard English language rules.",
            "step_by_step_explanation": "1. Standard Rules: Apply general English grammar principles.\n2. Note: While not explicitly listed in the Grade 9 textbook vector index, this general academic concept strengthens your overall proficiency.",
            "textbook_context": "Context retrieval returned 0 matching chunks for Grade 9 English Active Scope.",
            "metadata": {"grade": 9, "subject": "English", "unit": 0, "topic": "General Academic Knowledge"},
            "practice_question": {
                "question": "Which part of speech modifies a verb, adjective, or another adverb?",
                "options": ["A) Noun", "B) Adverb", "C) Preposition", "D) Conjunction"],
                "correct_option": "B",
                "explanation": "An adverb modifies verbs, adjectives, or other adverbs.",
                "section": "General Knowledge"
            },
            "is_curriculum_supported": False,
            "honesty_notice": "I couldn't find this specific topic in the grade 9 English textbook material but here is a general academic explanation.",
            "language": lang
        }

    top = matched_chunks[0]
    q_lower = query.lower()

    if "passive" in q_lower or "passive" in top["topic"].lower():
        direct = "Passive Voice is used when the focus is on the receiver of the action or the action itself."
        steps = "1. Object to Subject: Move object receiving action to start.\n2. Add 'Be': Match tense (is/are or was/were).\n3. Use Past Participle (V3): e.g. grow -> grown.\n4. Agent: Add 'by [doer]' if needed."
        pq = {
            "question": "Active: 'Farmers in Ethiopia grow teff.' -> Passive: 'Teff ________ in Ethiopia.'",
            "options": ["A) grew", "B) is grown", "C) was grown", "D) is growing"],
            "correct_option": "B",
            "explanation": "Present Simple Passive is formed with 'is' + Past Participle ('grown').",
            "section": "Passive Voice"
        }
    elif "conditional" in q_lower:
        direct = "First Conditional expresses real, possible future events dependent on a condition."
        steps = "1. If-clause: If + Present Simple (e.g. If you study hard...).\n2. Main Clause: Will + Base Verb (e.g. ...you will pass).\n3. Punctuation: Use comma after if-clause if first."
        pq = {
            "question": "If Aster ________ (work) hard, she will win the award.",
            "options": ["A) works", "B) worked", "C) will work", "D) work"],
            "correct_option": "A",
            "explanation": "First conditional uses Present Simple ('works') in the if-clause.",
            "section": "Conditionals"
        }
    else:
        direct = f"Regarding {top['topic']} in Unit {top['unit']} of Grade 9 English:"
        steps = f"1. Core Rule: {top['content']}\n2. Practice: Apply this concept when solving Grade 9 exam questions."
        pq = {
            "question": f"Which unit covers '{top['topic']}'?",
            "options": [f"A) Unit {top['unit']}", "B) Unit 12", "C) Unit 15", "D) Unit 20"],
            "correct_option": "A",
            "explanation": f"This chunk is retrieved directly from Unit {top['unit']}.",
            "section": "Curriculum Knowledge"
        }

    return {
        "direct_answer": direct,
        "step_by_step_explanation": steps,
        "textbook_context": top["content"],
        "metadata": {
            "grade": top["grade"],
            "subject": top["subject"],
            "unit": top["unit"],
            "topic": top["topic"]
        },
        "practice_question": pq,
        "is_curriculum_supported": True,
        "honesty_notice": None,
        "language": lang
    }

# --- HTTP REQUEST HANDLER ---
class IPassRequestHandler(BaseHTTPRequestHandler):

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/":
            self._set_headers(200)
            res = {
                "status": "online",
                "service": "i-pass-AI Zero-Dependency Backend Server",
                "active_scope": "Grade 9 English Curriculum (Ethiopia)"
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))

        elif path == "/api/v1/curriculum/units":
            self._set_headers(200)
            units_map = {}
            for c in RAW_CHUNKS:
                u = c["unit"]
                if u not in units_map:
                    units_map[u] = {"unit": u, "title": c["unit_title"], "topics": set()}
                units_map[u]["topics"].add(c["topic"])
            
            res = []
            for u in sorted(units_map.keys()):
                res.append({
                    "unit": u,
                    "title": units_map[u]["title"],
                    "topics": list(units_map[u]["topics"])
                })
            self.wfile.write(json.dumps(res).encode('utf-8'))

        elif path == "/api/v1/curriculum/chunks":
            self._set_headers(200)
            self.wfile.write(json.dumps(RAW_CHUNKS).encode('utf-8'))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Route not found"}).encode('utf-8'))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else "{}"
        
        try:
            body = json.loads(post_body)
        except Exception:
            body = {}

        if path == "/api/v1/tutor/query":
            query = body.get("query", "")
            lang = body.get("requested_language", "EN")
            if not query:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "Query string is required"}).encode('utf-8'))
                return

            res = process_tutor_query(query, lang)
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode('utf-8'))

        elif path == "/api/v1/exams/generate":
            count = body.get("count", 4)
            self._set_headers(200)
            self.wfile.write(json.dumps(QUESTION_BANK[:count]).encode('utf-8'))

        elif path == "/api/v1/exams/submit":
            answers = body.get("user_answers", {})
            total = len(answers)
            score = 0
            evals = []
            for q_id, chosen in answers.items():
                for item in QUESTION_BANK:
                    if item["id"] == q_id:
                        is_corr = (chosen.strip().upper() == item["correct_option"].strip().upper())
                        if is_corr:
                            score += 1
                        evals.append({
                            "question_id": q_id,
                            "chosen": chosen,
                            "correct": item["correct_option"],
                            "is_correct": is_corr,
                            "explanation": item["explanation"]
                        })
            percentage = (score / total * 100) if total > 0 else 0
            res = {"score": score, "total": total, "percentage": percentage, "evaluations": evals}
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode('utf-8'))

        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Route not found"}).encode('utf-8'))

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, IPassRequestHandler)
    print(f"🚀 i-pass-AI Backend Server running on http://localhost:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server(8000)





















