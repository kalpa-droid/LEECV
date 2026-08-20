import { supabase } from '../../../shared/core/lib/supabaseClient';

export async function listAgencyCandidates() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select(`
        cv_id,
        status,
        source,
        notes,
        updated_at,
        cvs (
          title,
          candidate_name,
          dni,
          cv_data
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error listando candidatos de la agencia:', err);
    return [];
  }
}

export async function updateCandidateStatus(cvId, status, notes = '') {
  if (!supabase) return { success: false, error: 'Sin cliente Supabase' };

  try {
    const { error } = await supabase
      .from('candidate_profiles')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('cv_id', cvId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error actualizando candidato:', err);
    return { success: false, error: err };
  }
}
