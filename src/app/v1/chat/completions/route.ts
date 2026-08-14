import { NextRequest, NextResponse } from 'next/server';
import { getNextGroqKey, markKeyCooldown } from '@/lib/key-manager';

export const runtime = 'edge';

// CORS response helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Taka-Master-Key',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(req: NextRequest) {
  // 1. Optional Master Auth Check
  const masterToken = process.env.PROXY_AUTH_TOKEN;
  if (masterToken) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('x-taka-master-key');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (!token || token !== masterToken) {
      return NextResponse.json(
        {
          error: {
            message: 'Unauthorized: Invalid or missing Master API token for Taka AI Gateway.',
            type: 'authentication_error',
            code: 'invalid_api_key',
          },
        },
        { status: 401, headers: corsHeaders() }
      );
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body in request.', type: 'invalid_request_error' } },
      { status: 400, headers: corsHeaders() }
    );
  }

  // Ensure default model if not specified
  if (!body.model) {
    body.model = 'llama-3.3-70b-versatile';
  }

  const isStream = Boolean(body.stream);
  const maxRetries = 5;
  let attempt = 0;
  let lastErrorMsg = 'Unknown error';

  while (attempt < maxRetries) {
    attempt++;
    let currentKey: { id: string; apiKey: string; label: string };

    try {
      currentKey = await getNextGroqKey();
    } catch (e: any) {
      return NextResponse.json(
        {
          error: {
            message: `Taka AI Key Pool Error: ${e.message || 'No available keys'}`,
            type: 'server_error',
          },
        },
        { status: 503, headers: corsHeaders() }
      );
    }

    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentKey.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TakaAIGateway/1.0',
        },
        body: JSON.stringify(body),
      });

      // Handle Rate Limit (HTTP 429) -> Auto Failover
      if (groqResponse.status === 429) {
        console.warn(`[Taka AI] Key ${currentKey.label} hit rate limit (429). Triggering automatic failover.`);
        await markKeyCooldown(currentKey.id, Number(process.env.RATE_LIMIT_COOLDOWN_SECONDS || 60));
        lastErrorMsg = `Key ${currentKey.label} rate limited (429)`;
        continue; // Retry with next key in pool
      }

      // Handle other non-200 errors that might be key-related (e.g. 401)
      if (groqResponse.status === 401) {
        console.error(`[Taka AI] Key ${currentKey.label} returned 401 Invalid Key. Marking cooldown.`);
        await markKeyCooldown(currentKey.id, 3600); // 1 hr cooldown
        lastErrorMsg = `Key ${currentKey.label} invalid (401)`;
        continue; // Retry with next key in pool
      }

      // If streaming response requested
      if (isStream && groqResponse.ok && groqResponse.body) {
        const maskedKey = `${currentKey.apiKey.slice(0, 8)}...${currentKey.apiKey.slice(-4)}`;
        return new Response(groqResponse.body, {
          status: 200,
          headers: {
            ...corsHeaders(),
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Taka-Key-Label': currentKey.label,
            'X-Taka-Key-Used': maskedKey,
            'X-Taka-Attempt': String(attempt),
          },
        });
      }

      // If standard JSON response
      const data = await groqResponse.json();
      const maskedKey = `${currentKey.apiKey.slice(0, 8)}...${currentKey.apiKey.slice(-4)}`;

      return NextResponse.json(data, {
        status: groqResponse.status,
        headers: {
          ...corsHeaders(),
          'X-Taka-Key-Label': currentKey.label,
          'X-Taka-Key-Used': maskedKey,
          'X-Taka-Attempt': String(attempt),
        },
      });
    } catch (fetchErr: any) {
      console.error(`[Taka AI] Network error calling Groq with key ${currentKey.label}:`, fetchErr);
      lastErrorMsg = fetchErr.message;
      // retry next key
    }
  }

  // If exhausted retries
  return NextResponse.json(
    {
      error: {
        message: `Taka AI Gateway failed after ${maxRetries} failover attempts. Last error: ${lastErrorMsg}`,
        type: 'rate_limit_exceeded',
        code: 'all_keys_busy',
      },
    },
    { status: 429, headers: corsHeaders() }
  );
}
