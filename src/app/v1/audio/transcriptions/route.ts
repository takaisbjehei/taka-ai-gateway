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
  const isValidKey = await validateAndTrackTakaKey(token);

  if (!isValidKey) {
    return NextResponse.json(
      { error: { message: 'Taka AI Security: Invalid or missing API key.', type: 'authentication_error' } },
      { status: 401, headers: corsHeaders() }
    );
  }

  // 2. Parse Multipart Form Data
  let incomingFormData: FormData;
  try {
    incomingFormData = await req.formData();
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: 'Failed to parse multipart/form-data: ' + (err.message || 'invalid form'), type: 'invalid_request_error' } },
      { status: 400, headers: corsHeaders() }
    );
  }

  const file = incomingFormData.get('file');
  if (!file) {
    return NextResponse.json(
      { error: { message: 'Missing required field: "file"', type: 'invalid_request_error' } },
      { status: 400, headers: corsHeaders() }
    );
  }

  // 3. Map Model ID to Backend Model
  const requestedModel = (incomingFormData.get('model') as string) || 'taka-transcribe-turbo';
  const backendModel = MODEL_MAP[requestedModel] || (requestedModel.includes('whisper') ? requestedModel : 'whisper-large-v3-turbo');

  // 4. Build Outgoing FormData
  const outgoingFormData = new FormData();
  incomingFormData.forEach((value, key) => {
    if (key === 'model') {
      outgoingFormData.append('model', backendModel);
    } else {
      outgoingFormData.append(key, value);
    }
  });
  if (!incomingFormData.has('model')) {
    outgoingFormData.append('model', backendModel);
  }

  // 5. Retry Loop with Key Rotation on 429
  const maxRetries = 5;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyRecord = await getNextGroqKey();
    if (!keyRecord) {
      return NextResponse.json(
        { error: { message: 'Taka AI: All cluster nodes are currently busy in cooldown. Please retry in a few seconds.', type: 'cluster_exhausted' } },
        { status: 503, headers: corsHeaders() }
      );
    }

    try {
      const upstreamResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keyRecord.apiKey}`,
        },
        body: outgoingFormData,
      });

      // Handle Rate Limits (429) -> mark node in cooldown and failover
      if (upstreamResponse.status === 429) {
        markKeyCooldown(keyRecord.id);
        continue;
      }

      const contentType = upstreamResponse.headers.get('content-type') || 'application/json';
      const responseData = await upstreamResponse.text();

      if (!upstreamResponse.ok) {
        return new NextResponse(responseData, {
          status: upstreamResponse.status,
          headers: {
            ...corsHeaders(),
            'Content-Type': contentType,
          },
        });
      }

      // Record telemetry usage
      await recordTokenUsage(token, 25, 75);

      return new NextResponse(responseData, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': contentType,
          'X-Taka-Engine': 'Taka Neural Audio Matrix',
          'X-Taka-Model': requestedModel,
        },
      });
    } catch (err: any) {
      lastError = err;
    }
  }

  return NextResponse.json(
    { error: { message: 'Transcription processing failed: ' + (lastError?.message || 'Cluster error'), type: 'api_error' } },
    { status: 500, headers: corsHeaders() }
  );
}
