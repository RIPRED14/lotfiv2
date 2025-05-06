// Script pour vérifier les tables Supabase
import { createClient } from '@supabase/supabase-js';

// Les mêmes paramètres que dans le fichier client.ts
const SUPABASE_URL = "https://bkdcbrnfzgnafjwnryme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memduYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODA1MTAsImV4cCI6MjA2MTI1NjUxMH0.cdzP9f_Bg1TlrBs-v1DsOb5Iv-tfK0KURPwZn1hwYMU";

// Créer le client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Fonction pour vérifier la structure d'une table
async function checkTableStructure(tableName) {
  console.log(`\n🔍 Vérification de la table '${tableName}'...`);
  
  try {
    // Vérifier si la table existe en récupérant 0 enregistrements
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
      
    if (error) {
      console.error(`❌ ERREUR: Table '${tableName}' - ${error.message}`);
      if (error.code === '42P01') {
        console.error(`⚠️ La table '${tableName}' n'existe pas.`);
      }
      return false;
    }
    
    console.log(`✅ Table '${tableName}' existe.`);
    
    // Vérifier la structure de la table
    const { data: sampleRow, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.error(`❌ Impossible de récupérer un échantillon de la table '${tableName}': ${sampleError.message}`);
      return true; // La table existe, mais pas d'échantillon disponible
    }
    
    if (sampleRow && sampleRow.length > 0) {
      console.log(`✅ Structure de la table '${tableName}':`);
      const columnNames = Object.keys(sampleRow[0]);
      columnNames.forEach(column => {
        console.log(`   - ${column}: ${typeof sampleRow[0][column]}`);
      });
      console.log(`📊 Nombre de colonnes: ${columnNames.length}`);
    } else {
      console.log(`ℹ️ La table '${tableName}' existe mais est vide.`);
      
      // Tentons de récupérer la définition des colonnes
      try {
        const { data: definition, error: defError } = await supabase.rpc('get_table_definition', { table_name: tableName });
        
        if (defError) {
          console.error(`❌ Impossible de récupérer la définition de la table: ${defError.message}`);
        } else if (definition) {
          console.log(`📋 Définition de la table '${tableName}':`);
          console.log(definition);
        }
      } catch (defErr) {
        console.log(`ℹ️ Information sur la structure non disponible: ${defErr.message}`);
      }
    }
    
    return true;
    
  } catch (err) {
    console.error(`❌ EXCEPTION pour la table '${tableName}':`, err);
    return false;
  }
}

// Fonction pour tester l'insertion dans une table
async function testInsert(tableName) {
  console.log(`\n🧪 Test d'insertion dans la table '${tableName}'...`);
  
  const testRecord = {
    // Champs essentiels basés sur useSamples.ts
    number: 'TEST-' + Date.now(),
    product: 'Test Product',
    fabrication: new Date().toISOString().split('T')[0],
    dlc: new Date().toISOString().split('T')[0],
    ready_time: '12:00',
    smell: 'N',
    texture: 'N',
    taste: 'N',
    aspect: 'N',
    status: 'pending',
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
    brand: 'TEST'
  };
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert([testRecord])
      .select();
      
    if (error) {
      console.error(`❌ Échec de l'insertion dans '${tableName}':`, error);
      if (error.details?.includes('violates not-null constraint')) {
        console.error(`⚠️ Champs requis manquants. Détails:`, error.details);
      }
      return false;
    }
    
    console.log(`✅ Insertion réussie dans '${tableName}':`, data);
    
    // Supprimer l'enregistrement de test
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('number', testRecord.number);
      
    if (deleteError) {
      console.warn(`⚠️ Impossible de supprimer l'enregistrement de test:`, deleteError);
    } else {
      console.log(`🧹 Enregistrement de test supprimé.`);
    }
    
    return true;
    
  } catch (err) {
    console.error(`❌ EXCEPTION lors de l'insertion dans '${tableName}':`, err);
    return false;
  }
}

// Vérifier les tables principales
async function checkTables() {
  console.log("🔄 Vérification des tables Supabase...");
  
  // Liste des tables à vérifier
  const tables = ['samples', 'analyses_planifiees', 'analyses_en_cours'];
  
  for (const table of tables) {
    const exists = await checkTableStructure(table);
    
    if (exists && table === 'samples') {
      await testInsert(table);
    }
  }
  
  console.log("\n✅ Vérification des tables terminée.");
}

// Exécution
checkTables().catch(err => {
  console.error("❌ Erreur inattendue:", err);
}); 