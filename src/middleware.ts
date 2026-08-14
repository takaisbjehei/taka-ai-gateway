import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (per edge instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// Expired entries are cleaned up inline in isRateLimited when a stale entry is found

export function middleware(req: NextRequest) {
  const ip = getClientIP(req);
  const pathname = req.nextUrl.pathname;

  // Rate limit API endpoints more aggressively
  if (pathname.startsWith('/v1/') || pathname.startsWith('/api/')) {
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error: {
            message: 'Taka AI Security: Rate limit exceeded. Please slow down.',
            type: 'rate_limit_exceeded',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-Taka-Security': 'rate-limited',
          },
        }
      );
    }
  }

  // Block suspicious payload probes
  const ua = req.headers.get('user-agent') || '';
  const suspiciousPatterns = /sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz/i;
  if (suspiciousPatterns.test(ua)) {
    return NextResponse.json(
      { error: { message: '🛡️ Taka AI Threat Shield: Access denied.', type: 'forbidden' } },
      { status: 403 }
    );
  }

  const response = NextResponse.next();

  // Comprehensive Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('X-Taka-Shield', 'active');
  response.headers.set('X-Powered-By', 'Taka AI Neural Engine');

  // Remove default server identification
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  response.headers.set('X-Powered-By', 'Taka AI Neural Engine');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
