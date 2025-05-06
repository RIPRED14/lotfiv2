// Script simple pour tester la connexion Supabase
import { createClient } from '@supabase/supabase-js';

// Les mêmes paramètres que dans le fichier client.ts
const SUPABASE_URL = "https://bkdcbrnfzgnafjwnryme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memduYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODA1MTAsImV4cCI6MjA2MTI1NjUxMH0.cdzP9f_Bg1TlrBs-v1DsOb5Iv-tfK0KURPwZn1hwYMU";

// Créer le client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Test de connexion simple
async function testConnection() {
  console.log("Test de connexion à Supabase...");
  
  try {
    console.log("URL:", SUPABASE_URL);
    console.log("Clé (5 premiers caractères):", SUPABASE_PUBLISHABLE_KEY.substring(0, 5) + "...");
    
    // Tentative de requête simple
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('samples')
      .select('count');
    const endTime = Date.now();
    
    if (error) {
      console.error("❌ ERREUR DE CONNEXION:", error);
      return false;
    }
    
    console.log(`✅ Connexion réussie en ${endTime - startTime}ms`);
    console.log("Données:", data);
    return true;
    
  } catch (err) {
    console.error("❌ EXCEPTION:", err);
    return false;
  }
}

// Exécution du test
testConnection()
  .then(success => {
    if (success) {
      console.log("✅ Test de connexion Supabase réussi");
    } else {
      console.log("❌ Test de connexion Supabase échoué");
    }
  })
  .catch(err => {
    console.error("❌ Erreur inattendue:", err);
  }); 