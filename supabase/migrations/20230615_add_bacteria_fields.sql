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