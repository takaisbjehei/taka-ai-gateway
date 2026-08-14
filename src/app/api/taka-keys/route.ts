import { NextRequest, NextResponse } from 'next/server';
import { getAllTakaKeys, createTakaKey, deleteTakaKey } from '@/lib/taka-keys';

export const runtime = 'edge';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  try {
    const keys = await getAllTakaKeys();
    return NextResponse.json({ success: true, keys }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const newKey = await createTakaKey(body.name || 'New Taka Key');
    return NextResponse.json({ success: true, key: newKey }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing key id' }, { status: 400, headers: corsHeaders() });
    }
    await deleteTakaKey(id);
    return NextResponse.json({ success: true }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
