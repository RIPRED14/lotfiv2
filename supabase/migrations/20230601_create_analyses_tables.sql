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

-- Ajouter quelques données initiales pour les tests
INSERT INTO analyses_planifiees (bacterie, delai, jour, semaine, date_analyse, site)
VALUES
  ('Entérobactéries', '24h', 'Lundi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE, 'R1'),
  ('Coliformes totaux', '5j', 'Mercredi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE + INTERVAL '2 days', 'R2'),
  ('Listeria', '48h', 'Vendredi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE + INTERVAL '4 days', 'BAIKO'),
  ('E. coli', '24h', 'Samedi', EXTRACT(WEEK FROM CURRENT_DATE), CURRENT_DATE + INTERVAL '5 days', 'R1');

-- Ajouter quelques données initiales pour les analyses en cours
INSERT INTO analyses_en_cours (bacterie, delai, date_analyse, site, status)
VALUES
  ('Entérobactéries', '24h', CURRENT_DATE - INTERVAL '1 day', 'R1', 'En cours'),
  ('Coliformes totaux', '5j', CURRENT_DATE - INTERVAL '3 days', 'R2', 'En cours'),
  ('Staphylococcus aureus', '48h', CURRENT_DATE - INTERVAL '2 days', 'BAIKO', 'En cours'); 