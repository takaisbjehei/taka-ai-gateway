import { NextRequest, NextResponse } from 'next/server';
import { getNextGroqKey, markKeyCooldown } from '@/lib/key-manager';
import { validateAndTrackTakaKey, recordTokenUsage } from '@/lib/taka-keys';
import { MODEL_MAP } from '@/lib/models';

export const runtime = 'edge';

// Security: Max payload size (128KB)
const MAX_PAYLOAD_BYTES = 131072;
// Security: Max messages per request
const MAX_MESSAGES = 100;
// Security: Max content length per message (32KB)
const MAX_MESSAGE_LENGTH = 32768;

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

function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/groq\/compound-mini/gi, 'taka-search-mini')
    .replace(/groq\/compound/gi, 'taka-search-v1')
    .replace(/\bCompound\s+AI\b/gi, 'Taka AI')
    .replace(/\bCompound\b/g, 'Taka AI')
    .replace(/\bGroq\b/gi, 'Taka AI');
}

function createSanitizerStream(originalStream: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const cleansed = sanitizeText(text);
      controller.enqueue(encoder.encode(cleansed));
    },
  });

  return originalStream.pipeThrough(transform);
}

export async function POST(req: NextRequest) {
  // 1. Authenticate / Track Taka Client Key
  const authHeader = req.headers.get('Authorization') || req.headers.get('x-taka-key') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const isValidKey = await validateAndTrackTakaKey(token);

  if (!isValidKey) {
    return NextResponse.json(
      { error: { message: 'Taka AI Security: Invalid or missing API key.', type: 'authentication_error' } },
      { status: 401, headers: corsHeaders() }
    );
  }
  // Security: Check content length
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: { message: 'Taka AI Security: Payload too large.', type: 'invalid_request_error' } },
      { status: 413, headers: corsHeaders() }
    );
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

  // Security: Validate messages array
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: { message: 'Taka AI Security: messages array is required.', type: 'invalid_request_error' } },
      { status: 400, headers: corsHeaders() }
    );
  }
  if (body.messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: { message: 'Taka AI Security: Too many messages in request.', type: 'invalid_request_error' } },
      { status: 400, headers: corsHeaders() }
    );
  }
  // Security: Sanitize each message content length
  for (const msg of body.messages) {
    if (typeof msg.content === 'string' && msg.content.length > MAX_MESSAGE_LENGTH) {
      msg.content = msg.content.slice(0, MAX_MESSAGE_LENGTH);
    }
  }

  const requestedModel = body.model || 'taka-ultra-70b';
  const backendModel = MODEL_MAP[requestedModel] || requestedModel;

  // 2. Inject Strict Taka AI Identity System Prompt
  const TAKA_SYSTEM_IDENTITY =
    "You are Taka AI, an advanced autonomous neural super-intelligence engineered by Takadori. When performing live web searches, you are the Taka Search Engine. You must ALWAYS identify yourself exclusively as Taka AI. Never refer to yourself as Compound, Groq, Meta, or OpenAI.";

  let cleanMessages = Array.isArray(body.messages) ? [...body.messages] : [];
  const systemIndex = cleanMessages.findIndex((m: any) => m.role === 'system');

  if (systemIndex >= 0) {
    cleanMessages[systemIndex] = {
      ...cleanMessages[systemIndex],
      content: `${TAKA_SYSTEM_IDENTITY}\n\n${cleanMessages[systemIndex].content || ''}`,
    };
  } else {
    cleanMessages.unshift({
      role: 'system',
      content: TAKA_SYSTEM_IDENTITY,
    });
  }

  // Clone payload with backend model name & sanitized system prompt
  const upstreamPayload = {
    ...body,
    model: backendModel,
    messages: cleanMessages,
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

      // If streaming response -> pipe through real-time sanitizer stream
      if (isStream && upstreamResponse.ok && upstreamResponse.body) {
        const sanitizedStream = createSanitizerStream(upstreamResponse.body);

        return new Response(sanitizedStream, {
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

      // Cleanse proprietary branding and identity
      if (data && typeof data === 'object') {
        data.model = requestedModel;
        data.system_fingerprint = 'fp_taka_neural_v1';

        if (data.choices?.[0]?.message?.content) {
          data.choices[0].message.content = sanitizeText(data.choices[0].message.content);
        }
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
