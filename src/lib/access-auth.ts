import { getSupabase } from './supabase';

interface MemoryCode {
  code: string;
  label: string;
  isOneTime: boolean;
  isUsed: boolean;
}

const inMemoryCodes: MemoryCode[] = [
  { code: 'TAKA-VIP-8899', label: 'VIP One-Time Pass', isOneTime: true, isUsed: false },
  { code: 'TAKA-VIP-7722', label: 'VIP One-Time Pass', isOneTime: true, isUsed: false },
  { code: 'TAKA-VIP-3344', label: 'VIP One-Time Pass', isOneTime: true, isUsed: false },
  { code: 'TAKA-MASTER-2026', label: 'Master Admin Pass', isOneTime: false, isUsed: false },
];

export async function verifyAccessCode(inputCode: string): Promise<{ valid: boolean; message: string }> {
  const cleanCode = (inputCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Please enter an access code.' };
  }

  // 1. Check Master Admin Code from environment variable
  const adminCode = (process.env.ADMIN_ACCESS_CODE || 'TAKA-MASTER-2026').trim().toUpperCase();
  if (cleanCode === adminCode) {
    return { valid: true, message: 'Admin access granted.' };
  }

  // 2. Check Supabase
  const supabase = getSupabase();
  if (supabase) {
    // Try RPC function first
    try {
      const { data, error } = await supabase.rpc('verify_and_consume_access_code', {
        input_code: cleanCode,
      });

      if (!error && data && data.length > 0) {
        if (data[0].valid) {
          return {
            valid: true,
            message: data[0].is_one_time ? 'One-time access pass redeemed successfully.' : 'Access pass verified.',
          };
        } else {
          return { valid: false, message: 'This one-time access code is invalid or has already been used.' };
        }
      }
    } catch {
      // fallback to direct table query
    }

    // Try direct table query on access_codes table
    try {
      const { data: records, error: selectErr } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', cleanCode)
        .limit(1);

      if (!selectErr && records && records.length > 0) {
        const item = records[0];

        if (item.is_one_time && item.is_used) {
          return { valid: false, message: 'This one-time access code has already been redeemed.' };
        }

        // If one-time, mark it as used in Supabase database immediately
        if (item.is_one_time) {
          await supabase
            .from('access_codes')
            .update({
              is_used: true,
              used_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }

        return { valid: true, message: 'Access code verified.' };
      }
    } catch {
      // fallback
    }
  }

  // 3. Fallback in-memory verification
  const found = inMemoryCodes.find((c) => c.code.toUpperCase() === cleanCode);
  if (found) {
    if (found.isOneTime && found.isUsed) {
      return { valid: false, message: 'This one-time access code has already been redeemed.' };
    }
    if (found.isOneTime) {
      found.isUsed = true;
    }
    return { valid: true, message: 'Access granted.' };
  }

  return { valid: false, message: 'Invalid or expired access code.' };
}
