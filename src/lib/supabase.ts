import { createClient } from '@supabase/supabase-js';

// Création du client Supabase avec les clés d'API
const supabaseUrl = 'https://bkdcbrnfzgnafjwnryme.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memdtYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODMwMTU5NTYsImV4cCI6MTk5ODU5MTk1Nn0.gI_Bs_RMjyHJycRvTxe4fs8yvcEj79ZJaOB0ECSUgqo';

// Créer et exporter le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour les tables Supabase
export interface AnalysePlanifiee {
  id: string;
  bacterie: string;
  delai: string;
  jour: string;
  semaine: number;
  date_analyse: string;
  site: string;
  created_at?: string;
  updated_at?: string;
}

export interface AnalyseEnCours {
  id: string;
  bacterie: string;
  delai: string;
  date_analyse: string;
  site: string;
  status: string;
  sample_data?: any;
  created_at?: string;
  updated_at?: string;
}

// Fonctions d'aide pour les opérations Supabase
export async function fetchAnalysesPlanifiees(semaine: number) {
  const { data, error } = await supabase
    .from('analyses_planifiees')
    .select('*')
    .eq('semaine', semaine);
  
  if (error) {
    console.error('Erreur lors de la récupération des analyses planifiées:', error);
    throw error;
  }
  
  return data as AnalysePlanifiee[];
}

export async function fetchAnalysesEnCours() {
  const { data, error } = await supabase
    .from('analyses_en_cours')
    .select('*');
  
  if (error) {
    console.error('Erreur lors de la récupération des analyses en cours:', error);
    throw error;
  }
  
  return data as AnalyseEnCours[];
}

export async function createAnalysePlanifiee(analyse: Omit<AnalysePlanifiee, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('analyses_planifiees')
    .insert([analyse])
    .select();
  
  if (error) {
    console.error('Erreur lors de la création de l\'analyse planifiée:', error);
    throw error;
  }
  
  return data[0] as AnalysePlanifiee;
}

export async function updateAnalysePlanifiee(id: string, updates: Partial<AnalysePlanifiee>) {
  const { data, error } = await supabase
    .from('analyses_planifiees')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erreur lors de la mise à jour de l\'analyse planifiée:', error);
    throw error;
  }
  
  return data[0] as AnalysePlanifiee;
}

export async function deleteAnalysePlanifiee(id: string) {
  const { error } = await supabase
    .from('analyses_planifiees')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erreur lors de la suppression de l\'analyse planifiée:', error);
    throw error;
  }
  
  return true;
}

export async function createAnalyseEnCours(analyse: Omit<AnalyseEnCours, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('analyses_en_cours')
    .insert([analyse])
    .select();
  
  if (error) {
    console.error('Erreur lors de la création de l\'analyse en cours:', error);
    throw error;
  }
  
  return data[0] as AnalyseEnCours;
}

export async function updateAnalyseEnCours(id: string, updates: Partial<AnalyseEnCours>) {
  const { data, error } = await supabase
    .from('analyses_en_cours')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erreur lors de la mise à jour de l\'analyse en cours:', error);
    throw error;
  }
  
  return data[0] as AnalyseEnCours;
}

export async function completerAnalyse(id: string) {
  const { data, error } = await supabase
    .from('analyses_en_cours')
    .update({ status: 'Terminé' })
    .eq('id', id)
    .select();
  
  if (error) {
    console.error('Erreur lors de la complétion de l\'analyse:', error);
    throw error;
  }
  
  return data[0] as AnalyseEnCours;
} 