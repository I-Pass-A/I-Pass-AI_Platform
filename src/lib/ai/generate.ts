/**
 * AI Generation with automatic fallback chain
 * =============================================
 * Tries models in order until one succeeds:
 *   1. Gemini gemini-flash-latest  (primary — best quality)
 *   2. Gemini gemini-2.5-flash     (fallback — usually available)
 *   3. Gemini gemini-3.5-flash     (fallback)
 *   4. OpenRouter free model       (last resort — always available)
 *
 * This means the tutor and exam generator always return an answer
 * even when Gemini is overloaded (503 / UNAVAILABLE).
 */

import { GoogleGenAI } from "@google/genai";

// ── OpenRouter fallback via fetch (no SDK needed — uses OpenAI-compatible API)

const OPENROUTER_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",  // 550B — best free model available
  "nvidia/nemotron-3-super-120b-a12b:free",  // 120B — strong fallback
  "liquid/lfm-2.5-2.6b:free",                // lightweight last resort
];

async function callOpenRouter(
  prompt: string,
  systemInstruction: string,
  jsonMode: boolean = false
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  for (const model of OPENROUTER_MODELS) {
    try {
      const body = JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user",   content: prompt },
        ],
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        max_tokens: 2000,
        temperature: 0.3,
      });

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://i-pass-a.vercel.app",
          "X-Title": "I-Pass-A Educational Platform",
        },
        body,
      });

      if (!res.ok) {
        const err = await res.text();
        console.warn(`OpenRouter model ${model} failed (${res.status}):`, err.slice(0, 100));
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      if (text) return text;

    } catch (e: any) {
      console.warn(`OpenRouter model ${model} error:`, e.message);
      continue;
    }
  }

  throw new Error("All OpenRouter models failed");
}

// ── Gemini with retry across multiple model names

const GEMINI_GENERATION_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
];

function isOverloadError(err: any): boolean {
  const msg = String(err?.message || "");
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("overload") ||
    msg.includes("high demand") ||
    msg.includes("temporarily") ||
    msg.includes("no longer available") ||  // deprecated model
    msg.includes("404")                      // model not found on this key
  );
}

// ── Main exported function ─────────────────────────────────────────────────────

export interface GenerateOptions {
  prompt: string;
  systemInstruction: string;
  jsonMode?: boolean;
}

export async function generateWithFallback(opts: GenerateOptions): Promise<string> {
  const { prompt, systemInstruction, jsonMode = false } = opts;
  const apiKey = process.env.GEMINI_API_KEY;
  let lastError: any = null;

  // 1. Try all Gemini models
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });

    for (const model of GEMINI_GENERATION_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        });
        const text = response.text || "";
        if (text) return text;
      } catch (err: any) {
        lastError = err;
        if (isOverloadError(err)) {
          console.warn(`Gemini model ${model} overloaded — trying next...`);
          continue;
        }
        // Non-recoverable Gemini error (auth, bad request etc.) — skip to OpenRouter
        console.warn(`Gemini model ${model} non-retryable error:`, err.message?.slice(0, 100));
        break;
      }
    }
  }

  // 2. Fall back to OpenRouter
  console.log("All Gemini models failed — falling back to OpenRouter");
  try {
    return await callOpenRouter(prompt, systemInstruction, jsonMode);
  } catch (orErr: any) {
    // 3. Everything failed — return a user-friendly message
    console.error("All AI providers failed. Last Gemini error:", lastError?.message);
    console.error("OpenRouter error:", orErr.message);
    throw new Error("AI_UNAVAILABLE");
  }
}
