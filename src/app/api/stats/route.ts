import { NextResponse } from 'next/server';
import { getAllKeysStats } from '@/lib/key-manager';

export const runtime = 'edge';

export async function GET() {
  try {
    const keys = await getAllKeysStats();
    const totalKeys = keys.length;
    const activeKeys = keys.filter((k) => k.isActive && !k.isInCooldown).length;
    const cooldownKeys = keys.filter((k) => k.isInCooldown).length;
    const totalRequests = keys.reduce((acc, k) => acc + k.totalRequests, 0);
    const totalFailed = keys.reduce((acc, k) => acc + k.failedRequests, 0);
    const successRate = totalRequests > 0 ? (((totalRequests - totalFailed) / totalRequests) * 100).toFixed(1) : '100.0';

    return NextResponse.json({
      success: true,
      stats: {
        totalKeys,
        activeKeys,
        cooldownKeys,
        totalRequests,
        totalFailed,
        successRate: `${successRate}%`,
        isSupabaseConnected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        gatewayStatus: activeKeys > 0 ? 'Operational' : 'All Keys Cooldown',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
