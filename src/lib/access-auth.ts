import { getSupabase } from './supabase';

interface MemoryCode {
  code: string;
  label: string;
  isOneTime: boolean;
  isUsed: boolean;
}

let inMemoryCodes: MemoryCode[] = [
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
  const adminCode = process.env.ADMIN_ACCESS_CODE || 'TAKA-MASTER-2026';
  if (cleanCode === adminCode) {
    return { valid: true, message: 'Admin access granted.' };
  }

  // 2. Check Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('verify_and_consume_access_code', {
        input_code: cleanCode,
      });

      if (!error && data && data.length > 0 && data[0].valid) {
        return {
          valid: true,
          message: data[0].is_one_time ? 'One-time pass verified & redeemed.' : 'Access pass verified.',
        };
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
