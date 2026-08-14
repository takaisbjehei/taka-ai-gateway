import { getSupabase } from './supabase';

export interface KeyRecord {
  id: string;
  apiKey: string;
  maskedKey: string;
  label: string;
  isActive: boolean;
  cooldownUntil: string | null;
  isInCooldown: boolean;
  cooldownRemainingSeconds: number;
  totalRequests: number;
  failedRequests: number;
  lastUsedAt: string | null;
}

function maskKey(key: string): string {
  if (!key || key.length < 14) return key;
  return `${key.slice(0, 8)}...${key.slice(-6)}`;
}

// In-Memory Fallback State (for ultra-fast performance & offline/local use)
interface MemoryKey {
  id: string;
  apiKey: string;
  label: string;
  isActive: boolean;
  cooldownUntil: number | null; // epoch ms
  totalRequests: number;
  failedRequests: number;
  lastUsedAt: number | null; // epoch ms
}

let inMemoryKeys: MemoryKey[] = [];
let memoryRotationIndex = 0;

function initMemoryKeys() {
  if (inMemoryKeys.length > 0) return;

  const envKeysRaw = process.env.GROQ_API_KEYS;
  const rawList = envKeysRaw
    ? envKeysRaw.split(',').map((k) => k.trim()).filter((k) => k.startsWith('gsk_'))
    : [];

  inMemoryKeys = rawList.map((key, idx) => ({
    id: `local-key-${idx + 1}`,
    apiKey: key,
    label: `Taka Key ${idx + 1}`,
    isActive: true,
    cooldownUntil: null,
    totalRequests: 0,
    failedRequests: 0,
    lastUsedAt: null,
  }));
}

// Get the next active key (Round-Robin with Cooldown bypass)
export async function getNextGroqKey(): Promise<{ id: string; apiKey: string; label: string }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('get_next_groq_key');
      if (!error && data && data.length > 0) {
        return {
          id: data[0].id,
          apiKey: data[0].api_key,
          label: data[0].label || 'Supabase Key',
        };
      }
      // If RPC returns no active key, fallback to direct query or memory
      const now = new Date().toISOString();
      const { data: directKeys } = await supabase
        .from('groq_keys')
        .select('*')
        .eq('is_active', true)
        .or(`cooldown_until.is.null,cooldown_until.lte.${now}`)
        .order('last_used_at', { ascending: true })
        .limit(1);

      if (directKeys && directKeys.length > 0) {
        const k = directKeys[0];
        await supabase
          .from('groq_keys')
          .update({
            last_used_at: new Date().toISOString(),
            total_requests: (k.total_requests || 0) + 1,
          })
          .eq('id', k.id);

        return { id: k.id, apiKey: k.api_key, label: k.label };
      }
    } catch {
      // fallback to memory
    }
  }

  // In-Memory Key Rotation
  initMemoryKeys();
  const now = Date.now();
  const activeKeys = inMemoryKeys.filter((k) => k.isActive);

  if (activeKeys.length === 0) {
    throw new Error('No active Groq API keys available in pool. Please configure Supabase or GROQ_API_KEYS env.');
  }

  // Filter keys not in cooldown
  const availableKeys = activeKeys.filter(
    (k) => !k.cooldownUntil || k.cooldownUntil <= now
  );

  let selected: MemoryKey;

  if (availableKeys.length > 0) {
    memoryRotationIndex = (memoryRotationIndex + 1) % availableKeys.length;
    selected = availableKeys[memoryRotationIndex];
  } else {
    selected = activeKeys.reduce((prev, curr) =>
      (prev.cooldownUntil || 0) < (curr.cooldownUntil || 0) ? prev : curr
    );
  }

  selected.totalRequests += 1;
  selected.lastUsedAt = now;

  return {
    id: selected.id,
    apiKey: selected.apiKey,
    label: selected.label,
  };
}

// Mark key in cooldown (e.g. after HTTP 429)
export async function markKeyCooldown(keyIdOrSecret: string, seconds = 60) {
  const cooldownMs = seconds * 1000;

  // Update In-Memory
  initMemoryKeys();
  const memKey = inMemoryKeys.find(
    (k) => k.id === keyIdOrSecret || k.apiKey === keyIdOrSecret
  );
  if (memKey) {
    memKey.cooldownUntil = Date.now() + cooldownMs;
    memKey.failedRequests += 1;
  }

  // Update Supabase if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.rpc('mark_key_cooldown', {
        target_key_id: keyIdOrSecret,
        cooldown_seconds: seconds,
      });
    } catch {
      // Ignore fallback errors
    }
  }
}

// Fetch all keys status for the live dashboard
export async function getAllKeysStats(): Promise<KeyRecord[]> {
  const supabase = getSupabase();
  const now = Date.now();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('groq_keys')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((k) => {
          const cooldownDate = k.cooldown_until ? new Date(k.cooldown_until).getTime() : 0;
          const isInCooldown = cooldownDate > now;
          return {
            id: k.id,
            apiKey: k.api_key,
            maskedKey: maskKey(k.api_key),
            label: k.label || 'Taka Key',
            isActive: k.is_active,
            cooldownUntil: k.cooldown_until,
            isInCooldown,
            cooldownRemainingSeconds: isInCooldown ? Math.ceil((cooldownDate - now) / 1000) : 0,
            totalRequests: Number(k.total_requests || 0),
            failedRequests: Number(k.failed_requests || 0),
            lastUsedAt: k.last_used_at,
          };
        });
      }
    } catch {
      // fallback to memory
    }
  }

  // Fallback to memory
  initMemoryKeys();
  return inMemoryKeys.map((k) => {
    const isInCooldown = (k.cooldownUntil || 0) > now;
    return {
      id: k.id,
      apiKey: k.apiKey,
      maskedKey: maskKey(k.apiKey),
      label: k.label,
      isActive: k.isActive,
      cooldownUntil: k.cooldownUntil ? new Date(k.cooldownUntil).toISOString() : null,
      isInCooldown,
      cooldownRemainingSeconds: isInCooldown ? Math.ceil(((k.cooldownUntil || 0) - now) / 1000) : 0,
      totalRequests: k.totalRequests,
      failedRequests: k.failedRequests,
      lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
    };
  });
}

// Reset all cooldowns
export async function resetAllCooldowns() {
  initMemoryKeys();
  inMemoryKeys.forEach((k) => {
    k.cooldownUntil = null;
  });

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('groq_keys').update({ cooldown_until: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      // ignore
    }
  }
}
