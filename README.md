# I-Pass-A: AI-Powered Tutor & Sample Exam Prep (Supabase Version)

**I-Pass-A** is an AI-powered tutor and practice exam preparation web platform designed for Grades 1–12. It delivers curriculum-grounded learning across all subjects:
- **Grades 9–12**: Delivered in **English**.
- **Grades 1–6 & 7–8**: Delivered in **Afaan Oromo**.

This version of **I-Pass-A** uses a serverless unified **Next.js + Supabase** stack, utilizing:
- **Supabase Auth** for production-grade role-based user management.
- **Supabase Database (PostgreSQL)** for session and exam storage.
- **pgvector** for semantic vector similarity chunk retrieval in our RAG pipeline.

---

## Repository Structure

```
I-Pass-A/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/upload/route.ts # parses PDFs, chunks, embeds (Gemini), and saves
│   │   │   ├── exams/generate/route.ts # generates structured exams via Gemini
│   │   │   ├── exams/submit/route.ts # grades exams and logs attempts
│   │   │   └── tutor/chat/route.ts   # matching vector chunks + AI responses
│   │   ├── admin/page.tsx   # curriculum upload dashboard
│   │   ├── exams/page.tsx   # exam taker and printable assessment
│   │   ├── tutor/page.tsx   # chat tutor interface with RAG citations
│   │   ├── globals.css      # custom CSS variables & glassmorphism theme
│   │   ├── layout.tsx       # app layout wrapper
│   │   └── page.tsx         # landing page and login forms
│   ├── components/
│   │   └── Sidebar.tsx      # navigation and Grade / Language switcher
│   ├── context/
│   │   └── AuthContext.tsx  # session listener connecting to Supabase Auth
│   └── lib/
│   │   └── supabase.ts      # initializers for client-side and server-side connection
├── supabase/
│   ├── schema.sql           # SQL commands to initialize vector extensions and database tables
│   └── seed.js              # script to populate vectors and default structures
├── package.json             # NPM dependencies (Next.js, Supabase, Google GenAI)
├── tsconfig.json            # TypeScript configuration
└── README.md
```

---

## Getting Started

### Step 1: Configure your Supabase Project

1. Create a project at [supabase.com](https://supabase.com).
2. Once the project is created, navigate to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `supabase/schema.sql` into the SQL Editor and click **Run**.
   *This will enable the `vector` extension, create the required tables, establish RLS permissions, and create the `match_chunks` semantic search function.*

---

### Step 2: Local Application Setup

1. Clone or navigate to the project directory:
   ```bash
   cd "e:\PERSONAL PROJECTS\I-Pass-A"
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Create your `.env.local` configuration file:
   ```bash
   copy .env.example .env.local
   ```

4. Open `.env.local` in your editor and input the values found in your Supabase project settings (**Settings > API**):
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Anon public API key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your secret service role key (required for server-side seeding and bypass RLS)
   - `GEMINI_API_KEY`: Your Google Gemini API key (optional; if omitted, RAG searches and exams use local mock fallbacks)

---

### Step 3: Seed the Database

Seed your Supabase PostgreSQL database with mock curriculum chunks for English (Grades 9–12) and Afaan Oromo (Grades 1–8):
```bash
node supabase/seed.js
```
*Note: Ensure your `.env.local` (specifically `SUPABASE_SERVICE_ROLE_KEY`) is configured correctly before running.*

---

### Step 4: Run the Development Server

Start the local server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## Features Walkthrough

1. **Authentication (Supabase Auth)**: Register directly from the Home Screen or sign up as a Student. Roles and grade configurations sync automatically to your Supabase `profiles` table.
2. **AI Tutor (RAG)**: Select Grade 1–8 to ask questions in Afaan Oromo (Afaan Oromo, Saayinsii, Hawaasummaa), or select Grade 9–12 to study in English. The RAG pipeline retrieves relevant snippets and references the source files under the bubbles.
3. **Practice Exam Prep**: Create exams dynamically on any topic. Complete multiple-choice and short-answers, submit for instant grading, and review curriculum explanations. Click **Print / Export** to get a clean formatted exam sheet.
4. **Admin Dashboard**: Upload new textbooks. Text is parsed, chunked, embedded using Gemini, and saved in the vector database instantly.
