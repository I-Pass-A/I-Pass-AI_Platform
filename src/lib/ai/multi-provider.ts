/**
 * OpenRouter-Only AI Service
 * Uses OpenRouter with multiple models as fallbacks for speed and reliability
 */

interface AIProvider {
  name: string;
  model: string;
  call: (messages: any[]) => Promise<string>;
  timeout: number;
}

// OpenRouter API call with different models
async function callOpenRouter(messages: any[], model: string, providerName: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "I-Pass-A Tutor"
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 800,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${providerName} API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Provider configuration (ordered by speed and cost)
const AI_PROVIDERS: AIProvider[] = [
  {
    name: "OpenRouter-Llama-Fast",
    model: "meta-llama/llama-3.1-8b-instruct:free", // Fastest free model
    call: (messages) => callOpenRouter(messages, "meta-llama/llama-3.1-8b-instruct:free", "OpenRouter-Llama-Fast"),
    timeout: 8000 // 8 seconds
  },
  {
    name: "OpenRouter-Claude-Haiku",
    model: "anthropic/claude-3-haiku", // Fast paid model
    call: (messages) => callOpenRouter(messages, "anthropic/claude-3-haiku", "OpenRouter-Claude-Haiku"),
    timeout: 12000 // 12 seconds
  },
  {
    name: "OpenRouter-GPT-4o-Mini",
    model: "openai/gpt-4o-mini", // Reliable backup
    call: (messages) => callOpenRouter(messages, "openai/gpt-4o-mini", "OpenRouter-GPT-4o-Mini"),
    timeout: 15000 // 15 seconds
  }
];

/**
 * Generate AI response with OpenRouter fallback models
 */
export async function generateWithMultiProvider(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  let lastError: Error | null = null;

  // Debug: Check if OpenRouter API key is loaded
  console.log('🔑 OpenRouter API Key loaded:', !!process.env.OPENROUTER_API_KEY);

  // Try each model in order (fastest/cheapest first)
  for (const provider of AI_PROVIDERS) {
    try {
      console.log(`🚀 Trying ${provider.name} (${provider.model})...`);
      
      const response = await Promise.race([
        provider.call(messages),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${provider.name} timeout`)), provider.timeout)
        )
      ]);

      console.log(`✅ ${provider.name} succeeded in < ${provider.timeout}ms`);
      return response;

    } catch (error: any) {
      lastError = error;
      console.log(`❌ ${provider.name} failed: ${error.message}`);
      
      // Continue to next model
      continue;
    }
  }

  // All models failed - throw error
  console.error("🔥 All OpenRouter models failed");
  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

/**
 * Quick scope check (uses fastest OpenRouter model only)
 */
export async function quickScopeCheck(
  scopePrompt: string
): Promise<{ out_of_scope: boolean; explanation: string }> {
  try {
    const messages = [
      { 
        role: "system", 
        content: "You are a curriculum scope checker. Respond ONLY with valid JSON in format: {\"out_of_scope\": boolean, \"explanation\": \"text\"}" 
      },
      { role: "user", content: scopePrompt }
    ];

    // Use fastest free model for speed
    const response = await Promise.race([
      callOpenRouter(messages, "meta-llama/llama-3.1-8b-instruct:free", "OpenRouter-Scope-Check"),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Scope check timeout")), 5000)
      )
    ]);

    return JSON.parse(response);
  } catch (error) {
    console.log("Scope check failed, defaulting to in-scope");
    return { out_of_scope: false, explanation: "Scope check unavailable" };
  }
}

/**
 * Generate fallback response when all providers fail
 */
export function getFallbackResponse(
  query: string,
  subject: string,
  language: string
): string {
  if (language === "Afaan Oromo") {
    return `Dhiifama, yeroo ammaa tajaajilli AI cimaa jira. Gaaffii kee "${query}" jedhu mata-duree ${subject} irratti:\n\n• Kitaaba barumsa keessan ilaali\n• Barsiisaa kee gaafadhu\n• Yeroo muraasa booda deebi'ii yaali\n\nGaafannoon kee barbaachisaa dha, garuu tajaajilli AI yeroo kana hin jiru.`;
  } else {
    return `Sorry, the AI tutoring service is currently unavailable. For your question "${query}" about ${subject}:\n\n• Check your textbook or course materials\n• Ask your teacher for guidance\n• Try again in a few minutes\n\nYour question is important, but our AI service is temporarily unavailable.`;
  }
}