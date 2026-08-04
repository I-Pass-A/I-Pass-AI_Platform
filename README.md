# I-Pass-A: AI-Powered Tutor & Sample Exam Prep

**I-Pass-A** is an AI-powered tutor and practice exam preparation web platform designed for Grades 1–12. It delivers curriculum-grounded learning across all subjects:
- **Grades 9–12**: Delivered in **English**.
- **Grades 1–6 & 7–8**: Delivered in **Afaan Oromo**.

The project uses a **Retrieval-Augmented Generation (RAG)** pipeline to ground AI responses in approved textbooks/materials and is built with **FastAPI** (Python backend) and **Next.js** (React frontend).

---

## Repository Structure

```
I-Pass-A/
├── backend/            # FastAPI Python API Server
│   ├── app/
│   │   ├── main.py     # Main application & routing (Auth, Tutor, Exam, Admin)
│   │   ├── models.py   # Database schema definitions (SQLModel)
│   │   ├── database.py # Dual SQLite/PostgreSQL connection switcher
│   │   ├── auth.py     # Local authentication (JWT, bcrypt encryption)
│   │   ├── rag.py      # PDF/Text parser, chunker, & Gemini RAG integration
│   │   ├── utils.py    # Exam generator prompts & evaluation
│   │   └── seed.py     # Database seeder (mock users & curriculum text)
│   ├── requirements.txt # Python dependencies
│   └── .env.example    # Configuration options template
├── frontend/           # Next.js React Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      # Landing page / Auth page (Student/Teacher/Admin login)
│   │   │   ├── tutor/page.tsx # AI Tutor Chat interface with RAG citations
│   │   │   ├── exams/page.tsx # Practice Exam generator, taker, & grading
│   │   │   ├── admin/page.tsx # Curriculum upload dashboard for PDFs/Texts
│   │   │   ├── globals.css   # Custom CSS Theme (Blue/Teal gradient, glassmorphism)
│   │   │   └── layout.tsx    # App shell wrapper
│   │   ├── components/
│   │   │   └── Sidebar.tsx   # Sidebar navigation and Grade switcher
│   │   └── context/
│   │       └── AuthContext.tsx # Authentication state (local user storage + JWT)
│   └── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- **Python**: version 3.10 or higher.
- **Node.js**: version 18.0 or higher.

---

### Step 1: Set Up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration file from the template:
   ```bash
   copy .env.example .env
   ```

5. **(Optional)** Open `.env` and add your `GEMINI_API_KEY` (obtained from Google AI Studio).
   *Note: If no API key is specified, the system will gracefully fall back to **simulated/mock responses**, allowing you to fully test the UI, login, exam generator, and admin panel without api charges.*

6. Initialize and seed the database with mock curriculum content for Grades 1–6 (Afaan Oromo), 7–8 (Afaan Oromo), and 9–12 (English):
   ```bash
   python -m app.seed
   ```
   *This seeds default testing accounts:*
   - **Student**: `student@ipassa.com` (Password: `student123`)
   - **Teacher**: `teacher@ipassa.com` (Password: `teacher123`)
   - **Admin**: `admin@ipassa.com` (Password: `admin123`)

7. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend API will run at `http://localhost:8000`.

---

### Step 2: Set Up the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd ..\frontend
   ```

2. Install Node packages:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

---

## Core Features Walkthrough

1. **Local Authentication**: Register as a Student (Grades 1–12) or login with the seeded accounts. Role-based access protects the admin dashboard from students.
2. **AI Tutor**: Select a grade. Grade 9–12 studies in English (English, Biology, Chemistry, Physics). Grade 1–8 studies in Afaan Oromo (Afaan Oromo, Saayinsii, Hawaasummaa). Type questions and receive step-by-step answers with document source links. Try asking out-of-scope questions (like coding help) to test the out-of-scope redirection filter.
3. **Practice Exam Prep**: Generate tests dynamically based on selected subjects and topics. Score answers immediately, receive correct answer explanations, or print/export the test sheet as a clean exam document.
4. **Curriculum Administration**: Upload school PDF/Textbooks. Chunks are automatically processed, embedded, and added to the RAG database instantly.
