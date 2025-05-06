import { createClient } from '@supabase/supabase-js';

// Configuration de Supabase
const SUPABASE_URL = "https://bkdcbrnfzgnafjwnryme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memduYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODA1MTAsImV4cCI6MjA2MTI1NjUxMH0.cdzP9f_Bg1TlrBs-v1DsOb5Iv-tfK0KURPwZn1hwYMU";

// Créer le client Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Fonction pour tester l'insertion dans la table samples
async function testSamplesTable() {
  console.log("🔍 Test de la table 'samples'...");
  
  // 1. Vérifier si la table existe
  console.log("\n1️⃣ Vérification de l'existence de la table 'samples'...");
  try {
    const { data, error } = await supabase
      .from('samples')
      .select('count');
      
    if (error) {
      console.error("❌ Erreur lors de l'accès à la table 'samples':", error);
      return false;
    }
    
    console.log("✅ La table 'samples' existe et est accessible.");
    console.log("Nombre d'enregistrements:", data[0]?.count || 0);
  } catch (err) {
    console.error("❌ Exception lors de l'accès à la table 'samples':", err);
    return false;
  }
  
  // 2. Vérifier les permissions d'insertion
  console.log("\n2️⃣ Test d'insertion dans la table 'samples'...");
  
  // Créer un échantillon de test
  const testSample = {
    number: `TEST-${Date.now()}`,
    product: 'Test Product',
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
    modified_at: new Date().toISOString(),
    site: 'R1'
  };
  
  try {
    console.log("Échantillon de test à insérer:", testSample);
    
    const { data, error } = await supabase
      .from('samples')
      .insert([testSample])
      .select();
      
    if (error) {
      console.error("❌ Erreur lors de l'insertion dans 'samples':", error);
      console.error("Code:", error.code);
      console.error("Message:", error.message);
      console.error("Détails:", error.details);
      return false;
    }
    
    console.log("✅ Insertion réussie dans 'samples':", data);
    
    // Supprimer l'échantillon de test
    const { error: deleteError } = await supabase
      .from('samples')
      .delete()
      .eq('number', testSample.number);
      
    if (deleteError) {
      console.warn("⚠️ Impossible de supprimer l'échantillon de test:", deleteError);
    } else {
      console.log("🧹 Échantillon de test supprimé.");
    }
    
    return true;
  } catch (err) {
    console.error("❌ Exception lors de l'insertion dans 'samples':", err);
    return false;
  }
}

// Fonction pour vérifier les RLS (Row Level Security) et politiques
async function checkRLS() {
  console.log("\n3️⃣ Vérification des politiques de sécurité (RLS)...");
  
  try {
    // Cette requête tente d'accéder aux métadonnées des politiques RLS
    // Note: Cette fonctionnalité peut ne pas être disponible avec une clé anonyme
    const { data, error } = await supabase
      .rpc('get_policies_info');
      
    if (error) {
      console.warn("⚠️ Impossible d'accéder aux informations sur les politiques RLS:", error);
      console.log("Note: Cela peut être normal avec une clé anonyme.");
      
      // Alternative: Essayons de vérifier si RLS est activé en lisant et écrivant
      console.log("🔄 Vérification alternative des permissions RLS...");
      
      // Test de lecture simple
      const { data: readData, error: readError } = await supabase
        .from('samples')
        .select('*')
        .limit(1);
        
      if (readError) {
        console.error("❌ RLS pourrait bloquer la lecture:", readError);
      } else {
        console.log("✅ Lecture autorisée par RLS.");
      }
      
      // Ne pas lancer l'exception
    } else {
      console.log("✅ Informations sur les politiques RLS:", data);
    }
  } catch (err) {
    console.warn("⚠️ Exception lors de la vérification des politiques RLS:", err);
    // Ne pas considérer cela comme un échec fatal
  }
}

// Fonction pour vérifier les relations entre tables
async function checkRelationships() {
  console.log("\n4️⃣ Vérification des relations entre tables...");
  
  // Vérifier les autres tables que nous avons créées
  const tables = ['analyses_planifiees', 'analyses_en_cours'];
  
  for (const table of tables) {
    console.log(`\n🔍 Vérification de la table '${table}'...`);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count');
        
      if (error) {
        console.error(`❌ Erreur lors de l'accès à la table '${table}':`, error);
      } else {
        console.log(`✅ La table '${table}' existe et est accessible.`);
        console.log(`Nombre d'enregistrements:`, data[0]?.count || 0);
      }
    } catch (err) {
      console.error(`❌ Exception lors de l'accès à la table '${table}':`, err);
    }
  }
}

// Fonction principale de diagnostic
async function runDiagnostics() {
  console.log("🚀 Démarrage des diagnostics de la base de données Supabase...");
  console.log("URL:", SUPABASE_URL);
  console.log("Clé API (5 premiers caractères):", SUPABASE_PUBLISHABLE_KEY.substring(0, 5) + "...");
  
  // Test 1: Table samples
  await testSamplesTable();
  
  // Test 2: Politiques RLS
  await checkRLS();
  
  // Test 3: Relations entre tables
  await checkRelationships();
  
  console.log("\n✅ Diagnostics terminés.");
}

// Exécuter les diagnostics
runDiagnostics().catch(err => {
  console.error("❌ Erreur fatale lors des diagnostics:", err);
}); 