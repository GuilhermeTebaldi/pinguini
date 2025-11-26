// src/services/scores.ts
export type Score = {
    id: string;
    player_name: string | null;
    distance: number;
    power: number;
    angle: number;
    created_at: string;
  };
  
  // carrega supabase-js só se as envs existirem e se a lib estiver instalada
  let cached: any = null;
  async function getClient() {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    try {
      if (!cached) {
        const mod: any = await import('@supabase/supabase-js'); // só tenta se estiver instalada
        cached = mod.createClient(url, key);
      }
      return cached;
    } catch {
      return null; // sem lib instalada ⇒ no-op
    }
  }
  
  export async function saveScore(distance: number, power: number, angle: number, playerName?: string) {
    const supabase = await getClient();
    if (!supabase) return; // no-op
    const { error } = await supabase.from('scores').insert({
      distance, power, angle, player_name: playerName ?? null,
    });
    if (error) throw error;
  }
  
  export async function fetchTopScores(limit = 20): Promise<Score[]> {
    const supabase = await getClient();
    if (!supabase) return []; // ranking vazio
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('distance', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Score[]) ?? [];
  }
  