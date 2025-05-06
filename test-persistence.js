// Script pour tester la persistance des données dans Supabase
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = "https://bkdcbrnfzgnafjwnryme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memduYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODA1MTAsImV4cCI6MjA2MTI1NjUxMH0.cdzP9f_Bg1TlrBs-v1DsOb5Iv-tfK0KURPwZn1hwYMU";

// Créer le client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Fonction pour ajouter un échantillon et vérifier qu'il est récupérable après
async function testPersistence() {
  // Générer un ID unique pour ce test
  const testId = Date.now().toString();
  const testProduct = `Test-Persistence-${testId}`;
  
  console.log(`🔍 Test de persistance avec ID: ${testId}`);
  console.log(`Produit: ${testProduct}`);
  
  try {
    // 1. Insérer un nouvel échantillon
    console.log("\n1. Insertion d'un échantillon...");
    const sample = {
      number: `TEST-${testId}`,
      product: testProduct,
      ready_time: '12:00',
      fabrication: new Date().toISOString().split('T')[0],
      dlc: new Date().toISOString().split('T')[0],
      smell: 'N',
      texture: 'N',
      taste: 'N',
      aspect: 'N',
      status: 'pending',
      brand: 'PERSISTENCE-TEST',
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('samples')
      .insert([sample])
      .select()
      .single();
      
    if (insertError) {
      console.error("❌ Échec d'insertion:", insertError);
      return;
    }
    
    const newId = insertData.id;
    console.log(`✅ Échantillon inséré avec succès. ID: ${newId}`);
    
    // 2. Vérifier immédiatement que l'échantillon est trouvable par ID
    console.log("\n2. Vérification immédiate par ID...");
    const { data: checkByIdData, error: checkByIdError } = await supabase
      .from('samples')
      .select('*')
      .eq('id', newId)
      .single();
      
    if (checkByIdError) {
      console.error("❌ Échec de récupération par ID:", checkByIdError);
    } else if (checkByIdData) {
      console.log(`✅ Échantillon retrouvé par ID: ${checkByIdData.id}`);
    } else {
      console.error("❌ Aucun échantillon trouvé par ID!");
    }
    
    // 3. Vérifier immédiatement que l'échantillon est trouvable par numéro
    console.log("\n3. Vérification immédiate par numéro...");
    const { data: checkByNumberData, error: checkByNumberError } = await supabase
      .from('samples')
      .select('*')
      .eq('number', sample.number)
      .single();
      
    if (checkByNumberError) {
      console.error("❌ Échec de récupération par numéro:", checkByNumberError);
    } else if (checkByNumberData) {
      console.log(`✅ Échantillon retrouvé par numéro: ${checkByNumberData.number}`);
    } else {
      console.error("❌ Aucun échantillon trouvé par numéro!");
    }
    
    // 4. Vérifier que l'échantillon apparaît dans une liste filtrée
    console.log("\n4. Vérification dans une liste filtrée...");
    const { data: listData, error: listError } = await supabase
      .from('samples')
      .select('*')
      .eq('brand', 'PERSISTENCE-TEST');
      
    if (listError) {
      console.error("❌ Échec de récupération de la liste:", listError);
    } else if (listData && listData.length > 0) {
      console.log(`✅ Échantillon trouvé dans la liste. Total: ${listData.length}`);
      const found = listData.find(item => item.id === newId);
      if (found) {
        console.log(`✅ L'échantillon spécifique est présent dans la liste`);
      } else {
        console.error("❌ L'échantillon n'est PAS présent dans la liste malgré le filtre!");
      }
    } else {
      console.error("❌ Aucun échantillon trouvé dans la liste filtrée!");
    }
    
    // 5. Vérifier avec un délai pour s'assurer que les données sont persistées
    console.log("\n5. Pause de 2 secondes pour s'assurer de la persistance...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Tentative de récupération après délai...");
    const { data: delayedData, error: delayedError } = await supabase
      .from('samples')
      .select('*')
      .eq('id', newId)
      .single();
      
    if (delayedError) {
      console.error("❌ Échec de récupération après délai:", delayedError);
    } else if (delayedData) {
      console.log(`✅ Échantillon toujours disponible après délai: ${delayedData.product}`);
    } else {
      console.error("❌ L'échantillon a disparu après le délai!");
    }
    
    // 6. Cleanup - supprimer l'échantillon de test
    console.log("\n6. Nettoyage - suppression de l'échantillon de test...");
    const { error: deleteError } = await supabase
      .from('samples')
      .delete()
      .eq('id', newId);
      
    if (deleteError) {
      console.warn("⚠️ Échec de suppression:", deleteError);
    } else {
      console.log("✅ Échantillon supprimé avec succès");
    }
    
  } catch (error) {
    console.error("❌ Erreur non prévue durant le test:", error);
  }
}

// Exécution du test
console.log("🚀 Début du test de persistance des données...");
testPersistence()
  .then(() => console.log("\n✅ Test de persistance terminé"))
  .catch(err => console.error("❌ Erreur fatale:", err)); 