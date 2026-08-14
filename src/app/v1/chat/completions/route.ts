import { NextRequest, NextResponse } from 'next/server';
import { getNextGroqKey, markKeyCooldown } from '@/lib/key-manager';
import { validateAndTrackTakaKey, recordTokenUsage } from '@/lib/taka-keys';
import { MODEL_MAP } from '@/lib/models';

export const runtime = 'edge';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Taka-Key',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function POST(req: NextRequest) {
  // 1. Authenticate / Track Taka Client Key
  const authHeader = req.headers.get('Authorization') || req.headers.get('x-taka-key') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  await validateAndTrackTakaKey(token);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body in request.', type: 'invalid_request_error' } },
      { status: 400, headers: corsHeaders() }
    );
  }

  const requestedModel = body.model || 'taka-ultra-70b';
  const backendModel = MODEL_MAP[requestedModel] || requestedModel;

  // Clone payload with backend model name
  const upstreamPayload = {
    ...body,
    model: backendModel,
  };

  const isStream = Boolean(body.stream);
  const maxRetries = 5;
  let attempt = 0;
  let lastErrorMsg = 'Internal Gateway Error';
  const startTime = Date.now();

  while (attempt < maxRetries) {
    attempt++;
    let currentKey: { id: string; apiKey: string; label: string };

    try {
      currentKey = await getNextGroqKey();
    } catch (e: any) {
      return NextResponse.json(
        {
          error: {
            message: `Taka AI Gateway: All compute clusters are currently at peak capacity. Please retry shortly.`,
            type: 'server_error',
          },
        },
        { status: 503, headers: corsHeaders() }
      );
    }

    try {
      const upstreamResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentKey.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TakaAIEngine/1.0',
        },
        body: JSON.stringify(upstreamPayload),
      });

      // Handle Rate Limit (HTTP 429) -> Auto Failover to next node
      if (upstreamResponse.status === 429) {
        await markKeyCooldown(currentKey.id, Number(process.env.RATE_LIMIT_COOLDOWN_SECONDS || 60));
        lastErrorMsg = 'Cluster node rebalancing';
        continue;
      }

      if (upstreamResponse.status === 401) {
        await markKeyCooldown(currentKey.id, 3600);
        lastErrorMsg = 'Cluster node sync';
        continue;
      }

      const latencyMs = Date.now() - startTime;

      // If streaming response
      if (isStream && upstreamResponse.ok && upstreamResponse.body) {
        return new Response(upstreamResponse.body, {
          status: 200,
          headers: {
            ...corsHeaders(),
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Taka-Model': requestedModel,
            'X-Taka-Engine': 'active',
            'X-Taka-Latency-Ms': String(latencyMs),
          },
        });
      }

      // If standard JSON response
      const data = await upstreamResponse.json();

      // Track token telemetry
      if (data?.usage) {
        await recordTokenUsage(token, data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
      }

      // Cleanse proprietary branding
      if (data && typeof data === 'object') {
        data.model = requestedModel;
        data.system_fingerprint = 'fp_taka_neural_v1';
      }

      return NextResponse.json(data, {
        status: upstreamResponse.status,
        headers: {
          ...corsHeaders(),
          'X-Taka-Model': requestedModel,
          'X-Taka-Engine': 'active',
          'X-Taka-Latency-Ms': String(latencyMs),
        },
      });
    } catch (fetchErr: any) {
      lastErrorMsg = fetchErr.message;
    }
  }

  return NextResponse.json(
    {
      error: {
        message: `Taka AI Gateway: Temporary load capacity reached. Please try again. (${lastErrorMsg})`,
        type: 'rate_limit_exceeded',
      },
    },
    { status: 429, headers: corsHeaders() }
  );
}
