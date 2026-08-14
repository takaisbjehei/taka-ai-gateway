import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

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

// In-memory fallback
let inMemoryAccessCodes = [
  { id: '1', code: 'TAKA-VIP-8899', label: 'VIP One-Time Pass', is_one_time: true, is_used: false, created_at: new Date().toISOString() },
  { id: '2', code: 'TAKA-VIP-7722', label: 'VIP One-Time Pass', is_one_time: true, is_used: false, created_at: new Date().toISOString() },
  { id: '3', code: 'TAKA-VIP-3344', label: 'VIP One-Time Pass', is_one_time: true, is_used: false, created_at: new Date().toISOString() },
  { id: '4', code: 'TAKA-MASTER-2026', label: 'Permanent Admin Pass', is_one_time: false, is_used: false, created_at: new Date().toISOString() },
];

export async function GET() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ success: true, codes: data }, { headers: corsHeaders() });
      }
    } catch {
      // fallback
    }
  }

  return NextResponse.json({ success: true, codes: inMemoryAccessCodes }, { headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customCode = body.code ? body.code.trim().toUpperCase() : null;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = customCode || `TAKA-VIP-${randomSuffix}`;
    const label = body.label || 'Client One-Time Pass';
    const isOneTime = body.isOneTime !== false;

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('access_codes')
          .insert([
            {
              code,
              label,
              is_one_time: isOneTime,
              is_used: false,
            },
          ])
          .select();

        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, code: data[0] }, { headers: corsHeaders() });
        }
      } catch {
        // fallback
      }
    }

    const newMem = {
      id: String(Date.now()),
      code,
      label,
      is_one_time: isOneTime,
      is_used: false,
      created_at: new Date().toISOString(),
    };
    inMemoryAccessCodes.unshift(newMem);
    return NextResponse.json({ success: true, code: newMem }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders() });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing code id' }, { status: 400, headers: corsHeaders() });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('access_codes').delete().eq('id', id);
      } catch {
        // ignore
      }
    }

    inMemoryAccessCodes = inMemoryAccessCodes.filter((c) => c.id !== id);
    return NextResponse.json({ success: true }, { headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders() });
  }
}
