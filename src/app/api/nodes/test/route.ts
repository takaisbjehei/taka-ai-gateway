import { NextRequest, NextResponse } from 'next/server';
import { getAllKeysStats } from '@/lib/key-manager';
import { TAKA_MODELS } from '@/lib/models';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const keys = await getAllKeysStats();
    const { searchParams } = new URL(req.url);
    const targetIndex = searchParams.get('nodeIndex');
    
    const keysToTest = targetIndex 
      ? keys.filter((_, idx) => idx + 1 === parseInt(targetIndex, 10))
      : keys;

    const testPromises = keysToTest.map(async (k, index) => {
      const nodeNum = targetIndex ? parseInt(targetIndex, 10) : index + 1;
      const startTime = Date.now();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${k.apiKey}`,
          },
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - startTime;
        
        if (res.ok) {
          return {
            id: k.id,
            nodeIndex: nodeNum,
            label: `Taka Core Node 0${nodeNum}`,
            maskedKey: `taka_core_matrix_0${nodeNum}`,
            status: k.isInCooldown ? 'cooldown' : 'online',
            statusCode: res.status,
            latencyMs,
            isInCooldown: k.isInCooldown,
            cooldownRemainingSeconds: k.cooldownRemainingSeconds,
            totalRequests: k.totalRequests,
            failedRequests: k.failedRequests,
          };
        } else {
          return {
            id: k.id,
            nodeIndex: nodeNum,
            label: `Taka Core Node 0${nodeNum}`,
            maskedKey: `taka_core_matrix_0${nodeNum}`,
            status: res.status === 429 ? 'cooldown' : 'error',
            statusCode: res.status,
            latencyMs,
            isInCooldown: true,
            cooldownRemainingSeconds: k.cooldownRemainingSeconds || 60,
            totalRequests: k.totalRequests,
            failedRequests: k.failedRequests + 1,
            error: `HTTP ${res.status}: Rate limit or auth error`,
          };
        }
      } catch (err: any) {
        return {
          id: k.id,
          nodeIndex: nodeNum,
          label: `Taka Core Node 0${nodeNum}`,
          maskedKey: `taka_core_matrix_0${nodeNum}`,
          status: 'error',
          statusCode: 500,
          latencyMs: Date.now() - startTime,
          isInCooldown: false,
          cooldownRemainingSeconds: 0,
          totalRequests: k.totalRequests,
          failedRequests: k.failedRequests + 1,
          error: err.message || 'Connection timeout',
        };
      }
    });

    const results = await Promise.all(testPromises);
    const onlineNodes = results.filter(r => r.status === 'online').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalNodes: results.length,
        onlineNodes,
        cooldownNodes: results.filter(r => r.status === 'cooldown').length,
        errorNodes: results.filter(r => r.status === 'error').length,
        avgLatencyMs: Math.round(results.reduce((acc, r) => acc + r.latencyMs, 0) / Math.max(1, results.length)),
        healthStatus: onlineNodes > 0 ? 'OPERATIONAL' : 'DEGRADED',
      },
      nodes: results,
      models: TAKA_MODELS.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        contextWindow: m.contextWindow,
        isSearchEngine: Boolean(m.isSearchEngine),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
