// Script pour tester et résoudre les problèmes de mode hors ligne
// Exécuter avec: node offlineMode.js

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = "https://bkdcbrnfzgnafjwnryme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memduYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODA1MTAsImV4cCI6MjA2MTI1NjUxMH0.cdzP9f_Bg1TlrBs-v1DsOb5Iv-tfK0KURPwZn1hwYMU";

// Créer le client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Force l'activation des politiques de sécurité
async function activateRLS() {
  try {
    console.log("Activation des politiques de sécurité (RLS)...");
    
    // Tenter d'exécuter une requête SQL directe pour activer RLS sur la table samples
    const sql = `
      ALTER TABLE public.samples 
      ENABLE ROW LEVEL SECURITY;
      
      -- Créer une politique permettant à tous les utilisateurs anonymes de lire
      CREATE POLICY "Allow anonymous read" 
      ON public.samples 
      FOR SELECT 
      USING (true);
      
      -- Créer une politique permettant à tous les utilisateurs anonymes d'insérer
      CREATE POLICY "Allow anonymous insert" 
      ON public.samples 
      FOR INSERT 
      WITH CHECK (true);
      
      -- Créer une politique permettant à tous les utilisateurs anonymes de mettre à jour
      CREATE POLICY "Allow anonymous update" 
      ON public.samples 
      FOR UPDATE 
      USING (true) 
      WITH CHECK (true);
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.warn("⚠️ Impossible d'exécuter la requête SQL directe:", error);
      console.log("Note: Cette erreur est attendue car vous n'avez probablement pas les permissions admin.");
      console.log("Vous devrez activer les politiques manuellement dans l'interface Supabase.");
    } else {
      console.log("✅ Politiques de sécurité activées avec succès");
    }
  } catch (err) {
    console.error("❌ Erreur lors de l'activation des politiques:", err);
  }
}

// Teste l'insertion et la récupération
async function testSamplesAccessibility() {
  console.log("\n🔍 Test d'accessibilité de la table samples...");
  
  // Test de lecture
  console.log("Test de lecture...");
  const { data: readData, error: readError } = await supabase
    .from('samples')
    .select('*')
    .limit(5);
    
  if (readError) {
    console.error("❌ Échec de lecture:", readError);
  } else {
    console.log(`✅ Lecture réussie: ${readData.length} échantillons trouvés`);
  }
  
  // Test d'insertion
  console.log("\nTest d'insertion...");
  const testSample = {
    number: `TEST-${Date.now()}`,
    product: 'Test Offline Mode',
    ready_time: '12:00',
    fabrication: new Date().toISOString().split('T')[0],
    dlc: new Date().toISOString().split('T')[0],
    smell: 'N',
    texture: 'N',
    taste: 'N',
    aspect: 'N',
    status: 'pending',
    brand: 'TEST',
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  };
  
  const { data: insertData, error: insertError } = await supabase
    .from('samples')
    .insert([testSample])
    .select()
    .single();
    
  if (insertError) {
    console.error("❌ Échec d'insertion:", insertError);
  } else {
    console.log("✅ Insertion réussie:", insertData.id);
    
    // Test de récupération immédiate
    console.log("\nTest de récupération immédiate après insertion...");
    const { data: checkData, error: checkError } = await supabase
      .from('samples')
      .select('*')
      .eq('id', insertData.id)
      .single();
      
    if (checkError) {
      console.error("❌ Échec de récupération:", checkError);
    } else if (checkData) {
      console.log("✅ Récupération réussie:", checkData.id);
    } else {
      console.warn("⚠️ Aucun enregistrement trouvé immédiatement après l'insertion");
    }
    
    // Suppression de l'échantillon de test
    console.log("\nSuppression de l'échantillon de test...");
    const { error: deleteError } = await supabase
      .from('samples')
      .delete()
      .eq('id', insertData.id);
      
    if (deleteError) {
      console.warn("⚠️ Échec de suppression:", deleteError);
    } else {
      console.log("✅ Suppression réussie");
    }
  }
}

// Vérifier les paramètres RLS actuels
async function checkRLSStatus() {
  console.log("\n🔍 Vérification du statut RLS actuel...");
  
  try {
    // Vérifier si le RLS est activé (cette requête peut échouer sans droits d'admin)
    const { data, error } = await supabase.rpc('get_rls_status');
    
    if (error) {
      console.warn("⚠️ Impossible de vérifier le statut RLS:", error);
      
      // Plan B: Tester les opérations de base
      console.log("Tentative de détection RLS par comportement...");
      
      // Si la lecture fonctionne mais pas l'insertion, RLS est probablement activé sans politiques
      const { error: readError } = await supabase
        .from('samples')
        .select('count');
        
      const { error: insertError } = await supabase
        .from('samples')
        .insert([{ 
          number: 'TEST-RLS', 
          product: 'Test RLS', 
          ready_time: '12:00',
          fabrication: new Date().toISOString().split('T')[0],
          dlc: new Date().toISOString().split('T')[0],
          status: 'pending'
        }]);
        
      if (!readError && insertError) {
        console.log("⚠️ Diagnostic: RLS est probablement activé mais sans politiques d'insertion");
      } else if (readError) {
        console.log("⚠️ Diagnostic: RLS est probablement activé sans politiques de lecture");
      } else if (!insertError) {
        console.log("✅ Diagnostic: RLS est soit désactivé, soit configuré correctement");
      }
    } else {
      console.log("Statut RLS:", data);
    }
  } catch (err) {
    console.error("❌ Erreur lors de la vérification du statut RLS:", err);
  }
}

// Exécution
async function main() {
  console.log("🚀 Début du diagnostic du mode hors ligne...");
  
  // 1. Vérifier le statut RLS actuel
  await checkRLSStatus();
  
  // 2. Tester l'accessibilité de la table samples
  await testSamplesAccessibility();
  
  // 3. Tenter d'activer les politiques de sécurité
  await activateRLS();
  
  console.log("\n📋 Recommandations pour résoudre les problèmes de mode hors ligne:");
  console.log("1. Vérifiez que Row Level Security (RLS) est correctement configuré dans Supabase");
  console.log("2. Assurez-vous que les politiques permettent la lecture, l'insertion et la mise à jour");
  console.log("3. Pour appliquer les changements, allez dans l'interface Supabase:");
  console.log("   a. Authentification > Politiques");
  console.log("   b. Sélectionnez la table 'samples'");
  console.log("   c. Activez RLS si nécessaire");
  console.log("   d. Ajoutez des politiques pour permettre SELECT, INSERT et UPDATE avec la condition (true)");
  
  console.log("\n✅ Diagnostic terminé");
}

main().catch(err => {
  console.error("❌ Erreur fatale:", err);
}); 