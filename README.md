<p align="center">
  <img src="public/logo.png" alt="I-Pass-A Logo" width="160" style="border-radius: 16px;" />
</p>

# 🎓 I-Pass-A: AI-Powered Tutor & Exam Prep (Grades 6, 8, and 12) 🚀

**I-Pass-A** is an advanced AI-powered tutor and practice national exam preparation web platform designed for **Grades 6, 8, and 12**. It enables students to prepare for high-stakes examinations with curriculum-grounded learning:
- **Grade 12**: Delivered in **English**.
- **Grades 6 & 8**: Delivered in **Afaan Oromo**.

This platform utilizes a serverless unified **Next.js + Supabase** stack:
- **🔐 Supabase Auth**: Production-grade role-based user authentication.
- **💾 Supabase Database (PostgreSQL)**: Session and exam history logging.
- **🧬 pgvector**: Semantic vector similarity search for curriculum-grounded Retrieval-Augmented Generation (RAG).
- **🤖 Gemini API**: Advanced LLM for step-by-step tutoring explanations and practice test generation.
- **⚡ LocalStorage Mock Interceptor**: Automatic fallback mode allowing the entire application and dashboard to run fully interactive offline without configuring any server credentials!

---

## 📂 Repository Structure

```
I-Pass-A/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/upload/route.ts   # 📤 Parses PDFs/texts, generates embeddings (Gemini), and saves
│   │   │   ├── exams/generate/route.ts # 📝 Generates custom practice exams via Gemini
│   │   │   ├── exams/submit/route.ts   # 📊 Grades exams and logs student attempts
│   │   │   └── tutor/chat/route.ts     # 💬 Performs pgvector search and returns AI responses
│   │   ├── admin/page.tsx   # ⚙️ Curriculum upload dashboard
│   │   ├── exams/page.tsx   # ✍️ Practice exam module
│   │   ├── tutor/page.tsx   # 🤖 AI tutor conversational interface
│   │   ├── globals.css      # 🎨 Custom CSS variables & glassmorphism theme
│   │   ├── layout.tsx       # 📐 App layout wrapper with viewport configuration
│   │   └── page.tsx         # 🔑 Landing hero page and auth form
│   ├── components/
│   │   └── Sidebar.tsx      # 🧭 Navigation and Grade/Language settings
│   ├── context/
│   │   └── AuthContext.tsx  # 🔐 Session listener connecting to Supabase Auth
│   └── lib/
│       └── supabase.ts      # ⚙️ Connectors with local localStorage fallback DB
├── backend_app/             # 🐍 Python backend structure
│   ├── main.py              # 🚀 FastAPI application setup
│   ├── models/              # 🗂️ Data schemas
│   └── services/            # ⚙️ Python service engines (tutor, exams, vectors)
├── server.py                # 📡 Standalone zero-dependency Python backup server
├── supabase/
│   ├── schema.sql           # 🗄️ SQL script for vector extensions, tables, and triggers
│   └── seed.js              # 🌱 Seeding script for mock curriculum database
├── package.json             # 📦 NPM dependencies
├── tsconfig.json            # 🛠️ TypeScript configuration
└── README.md
```

---

## 🛠️ Getting Started

### 1️⃣ Step 1: Configure your Supabase Project 🗄️

1. Create a project at [supabase.com](https://supabase.com).
2. Once the project is created, navigate to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of [`supabase/schema.sql`](file:///e:/PERSONAL%20PROJECTS/I-Pass-A/supabase/schema.sql) into the SQL Editor and click **Run**.
   *This will enable the `vector` extension, create the required tables, establish RLS permissions, and create the `match_chunks` semantic search function.*

---

### 2️⃣ Step 2: Local Application Setup 💻

1. Navigate to the project directory:
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
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Project URL (e.g. `https://yrhaqfvqmkifnpjwdpnd.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Anon public API key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your secret service role key
   - `GEMINI_API_KEY`: Your Google Gemini API key (optional; if omitted, RAG searches and exams use local mock fallbacks)

---

### 3️⃣ Step 3: Seed the Database 🌱

Seed your Supabase PostgreSQL database with mock curriculum chunks for English, Biology, Chemistry, Afaan Oromo, Saayinsii, and Hawaasummaa:
```bash
node supabase/seed.js
```
*Note: Ensure your `.env.local` is configured correctly before running.*

---

### 4️⃣ Step 4: Run the Development Server 🚀

Start the local server:
```bash
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`**.

---

## 🌟 Key Features Walkthrough

1. **🔐 Authentication**: Register and sign in directly from the welcome screen. The role is automatically mapped, and the grade is set to Grade 6 (Afaan Oromo), Grade 8 (Afaan Oromo), or Grade 12 (English).
2. **💬 Conversational AI Tutor**: Study in Afaan Oromo for Grades 6 & 8, or English for Grade 12. The RAG pipeline fetches textbook snippets, displays citation sources, and answers step-by-step.
3. **📝 National Exam Prep**: Generate custom tests on any Grade 6, 8, or 12 topic. Supports multiple-choice, true/false, fill-in-the-blank, and definition question formats. Click **Print / Export** to export clean, printer-friendly test sheets!
4. **⚙️ Admin Dashboard**: Teachers and administrators can upload curriculum textbooks. Text is parsed, split into overlaps, embedded via Gemini, and saved to the vector database with an audit uploader trail.
