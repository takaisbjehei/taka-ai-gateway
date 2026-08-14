import { NextResponse } from 'next/server';
import { TAKA_MODELS } from '@/lib/models';

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
  const modelsData = TAKA_MODELS.map((m) => ({
    id: m.id,
    object: 'model',
    created: 1715000000,
    owned_by: 'taka-ai',
    permission: [],
    root: m.id,
    name: m.name,
    category: m.category,
    description: m.description,
    context_window: m.contextWindow,
    is_search_engine: Boolean(m.isSearchEngine),
  }));

  return NextResponse.json(
    {
      object: 'list',
      data: modelsData,
    },
    { headers: corsHeaders() }
  );
}
