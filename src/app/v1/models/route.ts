import { NextResponse } from 'next/server';
import { getNextGroqKey } from '@/lib/key-manager';

export const runtime = 'edge';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET() {
  try {
    const keyInfo = await getNextGroqKey();
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${keyInfo.apiKey}`,
        'User-Agent': 'TakaAIGateway/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { headers: corsHeaders() });
    }
  } catch {
    // fallback
  }

  // Curated list of top Groq models fallback
  const fallbackModels = [
    { id: 'llama-3.3-70b-versatile', object: 'model', owned_by: 'meta', active: true },
    { id: 'llama-3.1-8b-instant', object: 'model', owned_by: 'meta', active: true },
    { id: 'llama-3.1-70b-versatile', object: 'model', owned_by: 'meta', active: true },
    { id: 'deepseek-r1-distill-llama-70b', object: 'model', owned_by: 'deepseek', active: true },
    { id: 'mixtral-8x7b-32768', object: 'model', owned_by: 'mistralai', active: true },
    { id: 'gemma2-9b-it', object: 'model', owned_by: 'google', active: true },
    { id: 'whisper-large-v3', object: 'model', owned_by: 'openai', active: true },
  ];

  return NextResponse.json({ object: 'list', data: fallbackModels }, { headers: corsHeaders() });
}
