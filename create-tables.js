// Script pour créer les tables manquantes dans Supabase
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = "https://bkdcbrnfzgnafjwnryme.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrZGNicm5memduYWZqd25yeW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2ODA1MTAsImV4cCI6MjA2MTI1NjUxMH0.cdzP9f_Bg1TlrBs-v1DsOb5Iv-tfK0KURPwZn1hwYMU";

// Créer le client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Scripts SQL pour la création des tables
const createAnalysesTables = `
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Création de la table pour les analyses planifiées
CREATE TABLE IF NOT EXISTS analyses_planifiees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bacterie TEXT NOT NULL,
  delai TEXT NOT NULL,
  jour TEXT NOT NULL,
  semaine INTEGER NOT NULL,
  date_analyse DATE NOT NULL,
  site TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la table pour les analyses en cours
CREATE TABLE IF NOT EXISTS analyses_en_cours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bacterie TEXT NOT NULL,
  delai TEXT NOT NULL,
  date_analyse DATE NOT NULL,
  site TEXT NOT NULL,
  status TEXT DEFAULT 'En cours',
  sample_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création d'un déclencheur pour mettre à jour la date de modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le déclencheur aux deux tables
CREATE TRIGGER set_updated_at_analyses_planifiees
BEFORE UPDATE ON analyses_planifiees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_analyses_en_cours
BEFORE UPDATE ON analyses_en_cours
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Création d'index pour optimiser les recherches
CREATE INDEX idx_analyses_planifiees_semaine ON analyses_planifiees(semaine);
CREATE INDEX idx_analyses_planifiees_jour ON analyses_planifiees(jour);
CREATE INDEX idx_analyses_en_cours_status ON analyses_en_cours(status);
`;

const addSampleFields = `
-- Migration pour ajouter les champs liés aux analyses bactériologiques
ALTER TABLE IF EXISTS samples
ADD COLUMN IF NOT EXISTS analysis_type TEXT NULL,
ADD COLUMN IF NOT EXISTS analysis_delay TEXT NULL,
ADD COLUMN IF NOT EXISTS reading_day TEXT NULL,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reading_due_date TIMESTAMP WITH TIME ZONE NULL;

-- Mettre à jour les index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_samples_analysis_type ON samples(analysis_type);
CREATE INDEX IF NOT EXISTS idx_samples_reading_day ON samples(reading_day);
CREATE INDEX IF NOT EXISTS idx_samples_reading_due_date ON samples(reading_due_date);

-- Fonction pour automatiser les notifications lorsque les délais d'analyses sont atteints
CREATE OR REPLACE FUNCTION check_bacteria_readings()
RETURNS TRIGGER AS $$
BEGIN
  -- Déterminer la date de lecture en fonction du type d'analyse
  IF NEW.analysis_delay = '24h' THEN
    NEW.reading_due_date := NEW.created_at + INTERVAL '24 hours';
  ELSIF NEW.analysis_delay = '48h' THEN
    NEW.reading_due_date := NEW.created_at + INTERVAL '48 hours';
  ELSIF NEW.analysis_delay = '5j' THEN
    NEW.reading_due_date := NEW.created_at + INTERVAL '5 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencher la fonction lors de la création ou mise à jour d'un échantillon
DROP TRIGGER IF EXISTS set_bacteria_reading_dates ON samples;
CREATE TRIGGER set_bacteria_reading_dates
BEFORE INSERT OR UPDATE ON samples
FOR EACH ROW
WHEN (NEW.analysis_type IS NOT NULL AND NEW.analysis_delay IS NOT NULL)
EXECUTE FUNCTION check_bacteria_readings();
`;

// Données initiales pour les tests (optionnel)
const initialData = `
-- Ajouter quelques données initiales pour les tests
INSERT INTO analyses_planifiees (bacterie, delai, jour, semaine, date_analyse, site)
VALUES
  ('Entérobactéries', '24h', 'Lundi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE, 'R1'),
  ('Coliformes totaux', '5j', 'Mercredi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE + INTERVAL '2 days', 'R2'),
  ('Listeria', '48h', 'Vendredi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE + INTERVAL '4 days', 'BAIKO');

-- Ajouter quelques données initiales pour les analyses en cours
INSERT INTO analyses_en_cours (bacterie, delai, date_analyse, site, status)
VALUES
  ('Entérobactéries', '24h', CURRENT_DATE - INTERVAL '1 day', 'R1', 'En cours'),
  ('Coliformes totaux', '5j', CURRENT_DATE - INTERVAL '3 days', 'R2', 'En cours');
`;

// Fonction pour exécuter les requêtes SQL
async function executeSql(sql, description) {
  console.log(`\n🔄 Exécution: ${description}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Essayer une approche différente si la première échoue
      try {
        console.log("Tentative avec PostgreSQL brut...");
        const { error: rawError } = await supabase.rpc('pg_execute', { command: sql });
        
        if (rawError) {
          // Troisième tentative avec une approche plus basique (par morceaux)
          const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
          let failedStatements = 0;
          
          for (const statement of statements) {
            if (statement.trim() === '') continue;
            
            const cleanedStatement = statement.trim() + ';';
            console.log(`Exécution séparée: ${cleanedStatement.substring(0, 50)}...`);
            
            try {
              const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: cleanedStatement });
              if (stmtError) {
                console.warn(`⚠️ Échec d'exécution partielle:`, stmtError);
                failedStatements++;
              }
            } catch (stmtErr) {
              console.warn(`⚠️ Exception lors de l'exécution partielle:`, stmtErr);
              failedStatements++;
            }
          }
          
          if (failedStatements > 0) {
            console.warn(`⚠️ ${failedStatements} instruction(s) ont échoué`);
            throw new Error(`Échec partiel: ${failedStatements} instruction(s) ont échoué`);
          }
        }
      } catch (rawErr) {
        console.error(`❌ Échec de l'exécution de la migration: ${description}`, error);
        console.error("Détails:", error.message);
        throw error;
      }
    }
    
    console.log(`✅ Migration exécutée avec succès: ${description}`);
    return true;
    
  } catch (err) {
    console.error(`❌ Exception lors de l'exécution: ${description}`, err);
    return false;
  }
}

// Création des tables et des fonctions
async function createTables() {
  let success = true;
  
  // Méthode alternative: créer les tables individuellement via l'API REST
  try {
    console.log("🔄 Création des tables via l'API REST...");
    
    // 1. Création de la table analyses_planifiees
    console.log("\n🔄 Création de la table 'analyses_planifiees'...");
    const planifiees = await fetch(`${SUPABASE_URL}/rest/v1/analyses_planifiees?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    
    if (planifiees.status === 404) {
      // La table n'existe pas, nous devons la créer via SQL
      console.log("Table 'analyses_planifiees' non trouvée, création nécessaire via SQL");
    } else if (planifiees.ok) {
      console.log("✅ Table 'analyses_planifiees' existe déjà");
    }
    
    // 2. Création de la table analyses_en_cours
    console.log("\n🔄 Création de la table 'analyses_en_cours'...");
    const enCours = await fetch(`${SUPABASE_URL}/rest/v1/analyses_en_cours?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    
    if (enCours.status === 404) {
      // La table n'existe pas, nous devons la créer via SQL
      console.log("Table 'analyses_en_cours' non trouvée, création nécessaire via SQL");
    } else if (enCours.ok) {
      console.log("✅ Table 'analyses_en_cours' existe déjà");
    }
    
    // 3. Tester si nous avons accès au SQL via des RPC personnalisées
    console.log("\n🔄 Test des fonctions SQL...");
    const { data: rpcData, error: rpcError } = await supabase.rpc('version');
    if (rpcError) {
      console.warn("⚠️ Les fonctions RPC ne sont pas disponibles:", rpcError);
      console.log("Création de SQL via l'interface Supabase requise.");
      
      // Afficher les instructions pour créer manuellement
      console.log("\n📋 INSTRUCTIONS POUR CRÉATION MANUELLE:");
      console.log("1. Connectez-vous à votre projet Supabase: https://app.supabase.com");
      console.log("2. Allez à la section 'Table Editor'");
      console.log("3. Créez deux nouvelles tables avec les structures suivantes:");
      console.log("\n--- STRUCTURE DE LA TABLE 'analyses_planifiees' ---");
      console.log(`
CREATE TABLE analyses_planifiees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bacterie TEXT NOT NULL,
  delai TEXT NOT NULL,
  jour TEXT NOT NULL,
  semaine INTEGER NOT NULL,
  date_analyse DATE NOT NULL,
  site TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
      
      console.log("\n--- STRUCTURE DE LA TABLE 'analyses_en_cours' ---");
      console.log(`
CREATE TABLE analyses_en_cours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bacterie TEXT NOT NULL,
  delai TEXT NOT NULL,
  date_analyse DATE NOT NULL,
  site TEXT NOT NULL,
  status TEXT DEFAULT 'En cours',
  sample_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`);
      
      return false;
    }
    
    console.log("✅ Accès SQL disponible, version PostgreSQL:", rpcData);
    
  } catch (restErr) {
    console.error("❌ Erreur lors de l'accès à l'API REST:", restErr);
  }
  
  console.log("\n🚀 Exécution des migrations SQL...");
  
  // 1. Créer les tables d'analyses
  success = await executeSql(createAnalysesTables, "Création des tables d'analyses") && success;
  
  // 2. Ajouter les champs à la table samples
  success = await executeSql(addSampleFields, "Ajout des champs d'analyse aux échantillons") && success;
  
  // 3. Ajouter des données initiales (optionnel)
  const addInitialData = false; // Modifier à true pour ajouter des données de test
  if (addInitialData) {
    success = await executeSql(initialData, "Ajout de données initiales") && success;
  }
  
  return success;
}

// Vérifier les tables après création
async function verifyTables() {
  console.log("\n🔍 Vérification des tables après création...");
  
  // Vérifier les tables
  const tables = ['analyses_planifiees', 'analyses_en_cours'];
  
  for (const table of tables) {
    console.log(`\n🔍 Vérification de la table '${table}'...`);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count');
        
      if (error) {
        console.error(`❌ La table '${table}' n'a pas été créée correctement:`, error);
      } else {
        console.log(`✅ Table '${table}' créée avec succès.`);
        console.log(`   Nombre d'enregistrements:`, data[0]?.count || 0);
      }
    } catch (err) {
      console.error(`❌ Erreur lors de la vérification de '${table}':`, err);
    }
  }
}

// Exécution du script
async function main() {
  console.log("🚀 Début de la création des tables Supabase...");
  
  try {
    const success = await createTables();
    
    if (success) {
      console.log("\n✅ Tables créées avec succès!");
      await verifyTables();
    } else {
      console.log("\n⚠️ Création des tables partiellement réussie ou échouée.");
      console.log("Veuillez consulter les instructions ci-dessus pour la création manuelle.");
    }
  } catch (err) {
    console.error("\n❌ Erreur lors de la création des tables:", err);
  }
}

main().catch(err => {
  console.error("❌ Erreur fatale:", err);
}); 