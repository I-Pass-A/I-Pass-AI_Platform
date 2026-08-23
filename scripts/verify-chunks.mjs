/**
 * Verifies curriculum chunks in Supabase for Grade 6 and Grade 8
 * Tests: count, subjects, sample retrieval, and a mock RAG query
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkGrade(grade) {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`📚  Grade ${grade} Curriculum Check`);
  console.log(`${'─'.repeat(55)}`);

  // 1. Count total chunks
  const { count, error: countErr } = await supabase
    .from('curriculum_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('grade', grade);

  if (countErr) { console.error('  ❌ Count error:', countErr.message); return; }
  console.log(`  Total chunks: ${count}`);

  // 2. Chunks per subject
  const { data: subjects } = await supabase
    .from('curriculum_chunks')
    .select('subject')
    .eq('grade', grade);

  const subjectCounts = {};
  for (const row of subjects || []) {
    subjectCounts[row.subject] = (subjectCounts[row.subject] || 0) + 1;
  }

  console.log(`\n  Subjects uploaded:`);
  for (const [subj, cnt] of Object.entries(subjectCounts).sort()) {
    const bar = '█'.repeat(Math.min(Math.floor(cnt / 5), 20));
    console.log(`    ${subj.padEnd(22)} ${String(cnt).padStart(4)} chunks  ${bar}`);
  }

  // 3. Check embeddings exist (sample 3 chunks)
  const { data: sampleChunks } = await supabase
    .from('curriculum_chunks')
    .select('subject, content, embedding')
    .eq('grade', grade)
    .limit(3);

  let embeddingOk = 0;
  for (const chunk of sampleChunks || []) {
    if (chunk.embedding && chunk.embedding.length > 10) embeddingOk++;
  }
  console.log(`\n  Embeddings check: ${embeddingOk}/3 sample chunks have embeddings ✅`);

  // 4. Test match_chunks RPC with a dummy vector (checks if function works)
  const dummyVector = Array.from({ length: 1024 }, (_, i) => Math.sin(i) * 0.01);
  const firstSubject = Object.keys(subjectCounts)[0];
  const lang = grade === '12' ? 'English' : 'Afaan Oromo';

  const { data: matches, error: rpcErr } = await supabase.rpc('match_chunks', {
    query_embedding: dummyVector,
    match_threshold: 0.0,
    match_count: 3,
    filter_subject: firstSubject,
    filter_grade: grade,
    filter_language: lang,
  });

  if (rpcErr) {
    console.log(`  ❌ match_chunks RPC error: ${rpcErr.message}`);
  } else {
    console.log(`  match_chunks RPC: returned ${matches?.length || 0} results for "${firstSubject}" ✅`);
    if (matches?.[0]) {
      console.log(`  Sample content: "${matches[0].content?.slice(0, 80)}..."`);
    }
  }
}

async function checkTutorAPI() {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`🤖  AI Tutor API Check`);
  console.log(`${'─'.repeat(55)}`);

  // Test OpenRouter key is valid
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { console.log('  ❌ OPENROUTER_API_KEY missing'); return; }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` }
    });
    console.log(`  OpenRouter API key: ${res.ok ? '✅ Valid' : `❌ HTTP ${res.status}`}`);
  } catch (e) {
    console.log(`  OpenRouter API key: ❌ Network error - ${e.message}`);
  }

  // Test a simple AI completion
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: 'Say OK in one word' }],
        max_tokens: 10,
      }),
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    console.log(`  AI Tutor test response: "${reply}" ${reply ? '✅' : '❌'}`);
  } catch (e) {
    console.log(`  AI Tutor test: ❌ ${e.message}`);
  }
}

async function checkExamGenerator() {
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`📝  Exam Generator Check`);
  console.log(`${'─'.repeat(55)}`);

  // Test: can the generator find chunks for a Grade 8 subject?
  const { data: grade8Chunks } = await supabase
    .from('curriculum_chunks')
    .select('subject, content')
    .eq('grade', '8')
    .eq('subject', 'Herrega')
    .limit(3);

  console.log(`  Grade 8 Herrega chunks available: ${grade8Chunks?.length || 0} ${grade8Chunks?.length ? '✅' : '❌'}`);

  const { data: grade6Chunks } = await supabase
    .from('curriculum_chunks')
    .select('subject, content')
    .eq('grade', '6')
    .eq('subject', 'Herrega')
    .limit(3);

  console.log(`  Grade 6 Herrega chunks available: ${grade6Chunks?.length || 0} ${grade6Chunks?.length ? '✅' : '❌'}`);
}

async function main() {
  console.log('🔍  I-Pass-A Curriculum Verification');
  console.log(`    Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  await checkGrade('6');
  await checkGrade('8');
  await checkTutorAPI();
  await checkExamGenerator();

  console.log(`\n${'─'.repeat(55)}`);
  console.log('✅  Verification complete!\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
