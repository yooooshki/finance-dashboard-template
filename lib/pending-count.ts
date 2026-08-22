import { supabase } from '@/lib/supabase';

export async function getPendingCount(): Promise<number> {
  try {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    return count ?? 0;
  } catch {
    // non-critical — badge defaults to 0
    return 0;
  }
}
