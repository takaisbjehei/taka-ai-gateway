import { NextResponse } from 'next/server';

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
  const takaModels = [
    {
      id: 'taka-ultra-v1',
      object: 'model',
      created: 1715000000,
      owned_by: 'taka-ai',
      permission: [],
      root: 'taka-ultra-v1',
      description: 'Taka AI Flagship Ultra-Intelligence Model (128k Context)',
    },
    {
      id: 'taka-flash-v1',
      object: 'model',
      created: 1715000000,
      owned_by: 'taka-ai',
      permission: [],
      root: 'taka-flash-v1',
      description: 'Taka AI Ultra-Low Latency Instant Model',
    },
    {
      id: 'taka-reasoning-v1',
      object: 'model',
      created: 1715000000,
      owned_by: 'taka-ai',
      permission: [],
      root: 'taka-reasoning-v1',
      description: 'Taka AI Deep Reasoning & Problem Solving Model',
    },
    {
      id: 'taka-core-v1',
      object: 'model',
      created: 1715000000,
      owned_by: 'taka-ai',
      permission: [],
      root: 'taka-core-v1',
      description: 'Taka AI Balanced Multi-Task Model',
    },
    {
      id: 'taka-voice-v1',
      object: 'model',
      created: 1715000000,
      owned_by: 'taka-ai',
      permission: [],
      root: 'taka-voice-v1',
      description: 'Taka AI Speech-to-Text Audio Model',
    },
  ];

  return NextResponse.json(
    {
      object: 'list',
      data: takaModels,
    },
    { headers: corsHeaders() }
  );
}
