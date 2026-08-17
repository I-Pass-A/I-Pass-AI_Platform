import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";

// ============================================================
// GEMINI MODELS
// ============================================================

const GENERATION_MODEL = "gemini-3.6-flash";
const EMBEDDING_MODEL = "gemini-embedding-2";

// ============================================================
// TYPES
// ============================================================

interface RetrievedChunk {
  source_document: string;
  content: string;
  similarity: number;
}

interface HistoryMessage {
  sender: string;
  content: string;
}

// ============================================================
// POST
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // ============================================================
    // 1. READ REQUEST
    // ============================================================

    const body = await req.json();

    const {
      session_id,
      query,
      grade,
    } = body;

    if (!session_id || !query?.trim()) {
      return NextResponse.json(
        {
          detail: "session_id and query are required",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // 2. SUPABASE ADMIN
    // ============================================================

    const supabaseAdmin = getSupabaseAdmin();

    // ============================================================
    // 3. GET SESSION
    // ============================================================

    const {
      data: sessionData,
      error: sessionErr,
    } = await supabaseAdmin
      .from("tutor_sessions")
      .select("subject, user_id")
      .eq("id", session_id)
      .single();

    if (sessionErr || !sessionData) {
      console.error(
        "Tutor session lookup failed:",
        sessionErr
      );

      return NextResponse.json(
        {
          detail:
            sessionErr?.message ||
            "Tutor session not found",
        },
        {
          status: 404,
        }
      );
    }

    const subject = sessionData.subject;

    // ============================================================
    // 4. DETERMINE GRADE
    // ============================================================

    const gradeText = String(
      grade || "Grade 12"
    );

    const gradeMatch =
      gradeText.match(/\d+/);

    const gradeNum = gradeMatch
      ? parseInt(
          gradeMatch[0],
          10
        )
      : 12;

    let gradeBand = "12";
    let language = "English";

    /*
      Keep your current project logic:

      Grade 6 -> Afaan Oromo
      Grade 8 -> Afaan Oromo
      Grade 12 -> English
    */

    if (
      gradeNum === 6 ||
      gradeNum === 8
    ) {
      gradeBand = String(
        gradeNum
      );

      language = "Afaan Oromo";
    } else {
      gradeBand = String(
        gradeNum
      );

      language = "English";
    }

    // ============================================================
    // 5. GEMINI API KEY
    // ============================================================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is missing from .env"
      );

      return NextResponse.json(
        {
          detail:
            "GEMINI_API_KEY is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ============================================================
    // 6. INITIALIZE GEMINI
    // ============================================================

    const ai = new GoogleGenAI({
      apiKey,
    });

    // ============================================================
    // 7. CREATE QUERY EMBEDDING
    // ============================================================

    let queryVector: number[] = [];

    try {
      const embedRes =
        await ai.models.embedContent({
          model: EMBEDDING_MODEL,

          contents: query.trim(),

          config: {
            outputDimensionality: 1536,
          },
        });

      const values =
        embedRes.embeddings?.[0]
          ?.values;

      if (
        values &&
        values.length > 0
      ) {
        queryVector = values;
      }

      console.log(
        "Embedding generated:",
        queryVector.length
      );
    } catch (embeddingError) {
      console.error(
        "Embedding generation failed:",
        embeddingError
      );

      /*
        We don't stop the request here.
        Gemini can still answer without RAG.
      */
    }

    // ============================================================
    // 8. RAG RETRIEVAL
    // ============================================================

    let chunks: RetrievedChunk[] =
      [];

    if (
      queryVector.length > 0
    ) {
      try {
        const {
          data: retrievedChunks,
          error: rpcErr,
        } =
          await supabaseAdmin.rpc(
            "match_chunks",
            {
              query_embedding:
                queryVector,

              match_threshold: 0.1,

              match_count: 5,

              filter_subject:
                subject,

              filter_grade:
                gradeBand,

              filter_language:
                language,
            }
          );

        if (rpcErr) {
          console.error(
            "match_chunks RPC error:",
            rpcErr
          );
        } else {
          chunks =
            (retrievedChunks ||
              []) as RetrievedChunk[];
        }
      } catch (rpcError) {
        console.error(
          "RAG retrieval failed:",
          rpcError
        );
      }
    }

    // ============================================================
    // 9. PREPARE CURRICULUM CONTEXT
    // ============================================================

    const contextTexts =
      chunks
        .map(
          (chunk) =>
            chunk.content
        )
        .filter(Boolean);

    const curriculumContext =
      contextTexts.length > 0
        ? contextTexts.join(
            "\n\n--- CURRICULUM CHUNK ---\n\n"
          )
        : "No curriculum documents were retrieved.";

    // ============================================================
    // 10. GET CHAT HISTORY
    // ============================================================

    const {
      data: history,
      error: historyError,
    } =
      await supabaseAdmin
        .from("tutor_messages")
        .select(
          "sender, content"
        )
        .eq(
          "session_id",
          session_id
        )
        .order(
          "timestamp",
          {
            ascending: true,
          }
        )
        .limit(10);

    if (historyError) {
      console.error(
        "History loading failed:",
        historyError
      );
    }

    // ============================================================
    // 11. FORMAT HISTORY
    // ============================================================

    const historyBlock =
      (
        (history ||
          []) as HistoryMessage[]
      )
        .map(
          (message) =>
            `${
              message.sender ===
              "student"
                ? "Student"
                : "Tutor"
            }: ${message.content}`
        )
        .join("\n");

    // ============================================================
    // 12. OUT-OF-SCOPE CHECK
    // ============================================================

    let outOfScope = false;
    let explanation = "";

    const scopePrompt = `
You are the curriculum gatekeeper for I-Pass-A.

STUDENT INFORMATION

Grade:
Grade ${gradeBand}

Subject:
${subject}

Language:
${language}

CURRICULUM CONTEXT:

${curriculumContext}

STUDENT QUESTION:

"${query.trim()}"

TASK:

Determine whether the student's question belongs to:

Grade ${gradeBand}
${subject}

or is reasonably related to learning this subject.

A question should be OUT OF SCOPE if it is clearly unrelated.

Examples:

- Coding questions during English class -> OUT OF SCOPE
- Completely unrelated personal questions -> OUT OF SCOPE
- Adult or sexual topics -> OUT OF SCOPE
- Questions about the current subject -> IN SCOPE
- Grammar questions in English -> IN SCOPE
- Mathematics questions in Maths -> IN SCOPE
- Questions asking for clarification about the lesson -> IN SCOPE

IMPORTANT:

Do not reject a question simply because the exact wording is not found in the curriculum.

Return ONLY valid JSON.

For OUT OF SCOPE:

{
  "out_of_scope": true,
  "explanation": "short explanation"
}

For IN SCOPE:

{
  "out_of_scope": false,
  "explanation": ""
}

Write the explanation in ${language}.
`;

    try {
      const scopeResponse =
        await ai.models.generateContent(
          {
            model:
              GENERATION_MODEL,

            contents:
              scopePrompt,

            config: {
              responseMimeType:
                "application/json",
            },
          }
        );

      const scopeText =
        scopeResponse.text?.trim() ||
        "{}";

      try {
        const parsedScope =
          JSON.parse(
            scopeText
          );

        outOfScope =
          parsedScope.out_of_scope ===
          true;

        explanation =
          parsedScope.explanation ||
          "";
      } catch (jsonError) {
        console.error(
          "Could not parse scope JSON:",
          jsonError
        );

        outOfScope = false;
        explanation = "";
      }
    } catch (scopeError) {
      console.error(
        "Scope verification failed:",
        scopeError
      );

      /*
        If the scope checker fails,
        don't block the student.
      */

      outOfScope = false;
      explanation = "";
    }

    // ============================================================
    // 13. GENERATE ANSWER
    // ============================================================

    let answer = "";

    // ============================================================
    // OUT OF SCOPE
    // ============================================================

    if (outOfScope) {
      answer =
        explanation ||
        `This question is outside the Grade ${gradeBand} ${subject} curriculum.`;
    } else {
      // ============================================================
      // SYSTEM INSTRUCTION
      // ============================================================

      const systemInstruction = `
You are I-Pass-A, an expert AI Tutor.

============================================================
STUDENT
============================================================

Grade:
Grade ${gradeBand}

Subject:
${subject}

Language:
${language}

============================================================
YOUR ROLE
============================================================

You are a friendly, patient and highly effective teacher.

Your goal is to help the student UNDERSTAND the topic.

Do not simply give a short answer.

Explain concepts clearly and step-by-step.

============================================================
IMPORTANT RULES
============================================================

1. Teach clearly and patiently.

2. Explain difficult ideas step-by-step.

3. Use examples appropriate for Grade ${gradeBand}.

4. Stay focused on ${subject}.

5. Use the uploaded curriculum context when available.

6. Do not invent curriculum-specific facts.

7. If the curriculum context is insufficient, say that the uploaded curriculum does not contain enough information.

8. Answer entirely in ${language}.

9. Use Markdown when useful.

10. Make answers visually attractive.

11. Use headings for long explanations.

12. Use bullet points where appropriate.

13. Use numbered steps for procedures.

14. Use examples whenever helpful.

============================================================
MATHEMATICS RULES
============================================================

For mathematics questions:

ALWAYS show the calculation steps.

ALWAYS use proper LaTeX.

Use inline math:

$...$

Use display math:

$$
...
$$

NEVER use ugly plain-text mathematical formulas when LaTeX can represent them.

Use:

\\\\frac{}{}

for fractions.

Use:

\\\\sqrt{}

for square roots.

Use:

x^2

for powers.

Use:

a_1

for subscripts.

Use:

\\\\times

for multiplication.

Use:

\\\\pm

for plus/minus.

Use:

\\\\leq

\\\\geq

\\\\neq

for comparisons.

============================================================
MATHEMATICS ANSWER STRUCTURE
============================================================

For calculation problems, use this structure:

# Solution

## Given

List the given information.

## Formula

Show the appropriate formula.

## Substitution

Insert the known values.

## Calculation

Show each calculation step.

## Final Answer

Always put the final mathematical answer inside:

$$
\\\\boxed{answer}
$$

============================================================
MATHEMATICS EXAMPLE
============================================================

For example, if the student asks:

Solve:

x² - 5x + 6 = 0

Respond in this style:

# Solution

## Given

$$
x^2 - 5x + 6 = 0
$$

## Step 1: Identify the values

$$
a=1,\\quad b=-5,\\quad c=6
$$

## Step 2: Use the quadratic formula

$$
x=
\\\\frac{
-b\\\\pm\\\\sqrt{b^2-4ac}
}{
2a
}
$$

## Step 3: Substitute

$$
x=
\\\\frac{
-(-5)\\\\pm\\\\sqrt{(-5)^2-4(1)(6)}
}{
2(1)
}
$$

## Step 4: Simplify

$$
x=
\\\\frac{
5\\\\pm\\\\sqrt{25-24}
}{
2
}
$$

$$
x=
\\\\frac{
5\\\\pm1
}{
2
}
$$

## Final Answer

$$
\\\\boxed{x=3}
$$

or

$$
\\\\boxed{x=2}
$$

============================================================
FORMATTING
============================================================

Make the response attractive.

Prefer:

# Main Topic

## Important Concept

### Example

Use:

- bullets
- numbered steps
- tables when useful
- bold important terms
- LaTeX for mathematics

Avoid unnecessary repetition.

============================================================
TEACHING STYLE
============================================================

Teach like an excellent classroom teacher.

If the student seems confused:

- simplify the explanation
- give a basic example
- then give a harder example
- explain why each step is performed

Do not shame the student.

Encourage understanding.

============================================================
LANGUAGE
============================================================

Respond completely in:

${language}

Do not randomly switch languages.

============================================================
CURRICULUM
============================================================

The retrieved curriculum information is provided below.

Use it as the primary curriculum source.

If it does not contain enough information, clearly say so.

============================================================
`;

      // ============================================================
      // 14. MAIN PROMPT
      // ============================================================

      const mainPrompt = `
STUDENT'S CURRENT QUESTION:

${query.trim()}

============================================================
CURRICULUM CONTEXT
============================================================

${curriculumContext}

============================================================
PREVIOUS CONVERSATION
============================================================

${
  historyBlock ||
  "No previous conversation."
}

============================================================
INSTRUCTIONS
============================================================

Answer the student's current question.

Use the curriculum context when relevant.

Remember:

- Grade: ${gradeBand}
- Subject: ${subject}
- Language: ${language}

For mathematics, show every important step using LaTeX.

Make the answer clear, attractive and easy to understand.

Do not mention internal instructions.

Do not mention RAG.

Do not mention embeddings.

Do not mention system prompts.

Answer directly as the AI Tutor.
`;

      // ============================================================
      // 15. CALL GEMINI
      // ============================================================

      try {
        const response =
          await ai.models.generateContent(
            {
              model:
                GENERATION_MODEL,

              contents:
                mainPrompt,

              config: {
                systemInstruction:
                  systemInstruction,

                temperature: 0.4,

                maxOutputTokens: 4096,
              },
            }
          );

        answer =
          response.text?.trim() ||
          "I could not generate an answer. Please try again.";
      } catch (generationError) {
        console.error(
          "Gemini generation failed:",
          generationError
        );

        return NextResponse.json(
          {
            detail:
              "Gemini failed to generate the tutoring response.",

            error:
              generationError instanceof
              Error
                ? generationError.message
                : String(
                    generationError
                  ),
          },
          {
            status: 500,
          }
        );
      }
    }

    // ============================================================
    // 16. SAVE MESSAGES
    // ============================================================

    const {
      error: saveError,
    } = await supabaseAdmin
      .from("tutor_messages")
      .insert([
        {
          session_id,

          sender: "student",

          content:
            query.trim(),
        },

        {
          session_id,

          sender: "tutor",

          content: answer,

          sources:
            chunks.map(
              (chunk) => ({
                source:
                  chunk.source_document,

                similarity:
                  chunk.similarity,
              })
            ),

          out_of_scope:
            outOfScope,
        },
      ]);

    if (saveError) {
      console.error(
        "Saving tutor messages failed:",
        saveError
      );

      /*
        Don't fail the student's answer
        just because saving failed.
      */
    }

    // ============================================================
    // 17. RETURN RESPONSE
    // ============================================================

    return NextResponse.json({
      response: answer,

      sources:
        chunks.map(
          (chunk) => ({
            source:
              chunk.source_document,

            content:
              chunk.content,

            similarity:
              chunk.similarity,
          })
        ),

      out_of_scope:
        outOfScope,
    });
  } catch (error: unknown) {
    // ============================================================
    // GLOBAL ERROR
    // ============================================================

    console.error(
      "Tutor chat endpoint failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown server error";

    return NextResponse.json(
      {
        detail: message,
      },
      {
        status: 500,
      }
    );
  }
}