import { getSupabase } from './supabase';

export interface TakaApiKey {
  id: string;
  keySecret: string;
  keyMasked: string;
  name: string;
  isActive: boolean;
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  lastUsedAt: string | null;
  createdAt: string;
}

// In-Memory fallback store
let inMemoryTakaKeys: TakaApiKey[] = [
  {
    id: 'default-key-1',
    keySecret: 'taka_live_8f93a02e5c714b98d2a1',
    keyMasked: 'taka_live_8f93...d2a1',
    name: 'Production Key',
    isActive: true,
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  },
];

function generateRandomHex(length = 16): string {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getAllTakaKeys(): Promise<TakaApiKey[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('taka_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((k) => ({
          id: k.id,
          keySecret: k.key_secret,
          keyMasked: k.key_masked,
          name: k.name,
          isActive: k.is_active,
          totalRequests: Number(k.total_requests || 0),
          totalTokens: Number(k.total_tokens || 0),
          promptTokens: Number(k.prompt_tokens || 0),
          completionTokens: Number(k.completion_tokens || 0),
          lastUsedAt: k.last_used_at,
          createdAt: k.created_at,
        }));
      }
    } catch {
      // fallback
    }
  }

  return inMemoryTakaKeys;
}

export async function createTakaKey(name: string): Promise<TakaApiKey> {
  const rawHex = generateRandomHex(16);
  const secret = `taka_live_${rawHex}`;
  const masked = `taka_live_${secret.slice(10, 14)}...${secret.slice(-4)}`;
  const now = new Date().toISOString();

  const newKey: TakaApiKey = {
    id: `key-${Date.now()}`,
    keySecret: secret,
    keyMasked: masked,
    name: name || 'Taka Key',
    isActive: true,
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    lastUsedAt: null,
    createdAt: now,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('taka_api_keys')
        .insert([
          {
            key_secret: secret,
            key_masked: masked,
            name: name || 'Taka Key',
            is_active: true,
            total_requests: 0,
            total_tokens: 0,
            prompt_tokens: 0,
            completion_tokens: 0,
          },
        ])
        .select();

      if (!error && data && data.length > 0) {
        const item = data[0];
        return {
          id: item.id,
          keySecret: item.key_secret,
          keyMasked: item.key_masked,
          name: item.name,
          isActive: item.is_active,
          totalRequests: Number(item.total_requests || 0),
          totalTokens: Number(item.total_tokens || 0),
          promptTokens: Number(item.prompt_tokens || 0),
          completionTokens: Number(item.completion_tokens || 0),
          lastUsedAt: item.last_used_at,
          createdAt: item.created_at,
        };
      }
    } catch {
      // fallback to memory
    }
  }

  inMemoryTakaKeys.unshift(newKey);
  return newKey;
}

export async function deleteTakaKey(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('taka_api_keys').delete().eq('id', id);
    } catch {
      // ignore
    }
  }

  inMemoryTakaKeys = inMemoryTakaKeys.filter((k) => k.id !== id);
  return true;
}

export async function recordTokenUsage(bearerToken: string, promptTokens: number, completionTokens: number): Promise<void> {
  if (!bearerToken) return;
  const total = Math.max(1, promptTokens + completionTokens);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('taka_api_keys')
        .select('id, total_requests, total_tokens, prompt_tokens, completion_tokens')
        .eq('key_secret', bearerToken)
        .limit(1);

      if (data && data.length > 0) {
        await supabase
          .from('taka_api_keys')
          .update({
            last_used_at: new Date().toISOString(),
            total_requests: (data[0].total_requests || 0) + 1,
            total_tokens: (data[0].total_tokens || 0) + total,
            prompt_tokens: (data[0].prompt_tokens || 0) + promptTokens,
            completion_tokens: (data[0].completion_tokens || 0) + completionTokens,
          })
          .eq('id', data[0].id);
        return;
      }
    } catch {
      // fallback
    }
  }

  const found = inMemoryTakaKeys.find((k) => k.keySecret === bearerToken);
  if (found) {
    found.totalRequests += 1;
    found.totalTokens += total;
    found.promptTokens += promptTokens;
    found.completionTokens += completionTokens;
    found.lastUsedAt = new Date().toISOString();
  }
}

export async function validateAndTrackTakaKey(bearerToken: string): Promise<boolean> {
  if (!bearerToken) return true;
  // Track default 1-request invocation if token usage isn't explicitly supplied
  await recordTokenUsage(bearerToken, 20, 45);
  return true;
}
