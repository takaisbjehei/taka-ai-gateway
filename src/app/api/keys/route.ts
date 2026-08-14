import { NextRequest, NextResponse } from 'next/server';
import { getAllKeysStats, resetAllCooldowns } from '@/lib/key-manager';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    const keys = await getAllKeysStats();
    return NextResponse.json({ success: true, keys });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, label } = await req.json();
    if (!apiKey || !apiKey.startsWith('gsk_')) {
      return NextResponse.json({ success: false, error: 'Invalid Groq API key format (must start with gsk_)' }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('groq_keys')
        .insert([{ api_key: apiKey, label: label || 'Custom Key' }])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({
      success: true,
      message: 'Key accepted into current session. Configure Supabase for persistent cloud storage.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === 'reset_cooldowns') {
      await resetAllCooldowns();
      return NextResponse.json({ success: true, message: 'All key cooldowns have been cleared.' });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
