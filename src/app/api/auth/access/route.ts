import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessCode } from '@/lib/access-auth';

export const runtime = 'edge';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = body.code;
    const result = await verifyAccessCode(code);

    if (result.valid) {
      // Create session response
      const sessionToken = `taka_sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const response = NextResponse.json({
        success: true,
        message: result.message,
        sessionToken,
      }, { headers: corsHeaders() });

      // Set cookie for web browser session
      response.cookies.set('taka_auth_session', sessionToken, {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json({
      success: false,
      error: result.message,
    }, { status: 401, headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Internal Server Error',
    }, { status: 500, headers: corsHeaders() });
  }
}
