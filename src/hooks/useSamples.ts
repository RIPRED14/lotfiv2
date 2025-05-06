import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sample, SupabaseSample } from '@/types/samples';

interface UseSamplesProps {
  savedSamples?: Sample[];
  brand?: string;
}

// Clé pour le stockage local des échantillons
const LOCAL_STORAGE_KEY = 'lotfiv1_samples';

export const useSamples = ({ savedSamples = [], brand = '' }: UseSamplesProps) => {
  const [samples, setSamples] = useState<Sample[]>(savedSamples);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Fonction pour sauvegarder les échantillons localement
  const saveLocally = (newSamples: Sample[]) => {
    try {
      // Filtrer par marque si nécessaire
      const samplesForBrand = brand 
        ? newSamples.filter(s => s.brand === brand) 
        : newSamples;
      
      // Sauvegarder dans localStorage
      const allSamples = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      
      // Fusionner les échantillons existants avec les nouveaux
      const otherBrandSamples = brand 
        ? allSamples.filter((s: Sample) => s.brand !== brand)
        : [];
      
      const updatedSamples = [...otherBrandSamples, ...samplesForBrand];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSamples));
      
      console.log(`💾 ${samplesForBrand.length} échantillons sauvegardés localement`);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde locale des échantillons:', err);
    }
  };
  
  // Fonction pour charger les échantillons localement
  const loadLocally = (): Sample[] => {
    try {
      const allSamples = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const samplesForBrand = brand 
        ? allSamples.filter((s: Sample) => s.brand === brand)
        : allSamples;
      
      console.log(`📂 ${samplesForBrand.length} échantillons chargés localement`);
      return samplesForBrand;
    } catch (err) {
      console.error('Erreur lors du chargement local des échantillons:', err);
      return [];
    }
  };

  useEffect(() => {
    // Si des savedSamples sont fournis, on les utilise directement
    if (savedSamples && savedSamples.length > 0) {
      setSamples(savedSamples);
      return;
    }
    
    // Sinon, on charge depuis Supabase
    const loadSamples = async () => {
      try {
        setLoading(true);
        
        // Essayer d'abord de charger depuis Supabase
        const { data, error } = await supabase
          .from('samples')
          .select('*')
          .eq('brand', brand)
          .order('created_at', { ascending: false });

        if (error) {
          // En cas d'erreur, passer en mode hors ligne
          console.error('Error fetching samples from Supabase:', error);
          setIsOfflineMode(true);
          
          // Charger à partir du stockage local
          const localSamples = loadLocally();
          setSamples(localSamples);
          
          toast({
            title: "Mode hors ligne activé",
            description: "Impossible de récupérer les échantillons depuis la base de données",
            variant: "destructive"
          });
          
          return;
        }

        if (data) {
          const mappedSamples: Sample[] = data.map(sample => {
            let status = sample.status;
            if (status === 'inProgress') {
              status = 'in_progress';
            }
            
            return {
              id: sample.id,
              number: sample.number || '',
              product: sample.product || '',
              readyTime: sample.ready_time || '',
              fabrication: sample.fabrication || '',
              dlc: sample.dlc || '',
              smell: sample.smell || '',
              texture: sample.texture || '',
              taste: sample.taste || '',
              aspect: sample.aspect || '',
              ph: sample.ph || '',
              enterobacteria: sample.enterobacteria || '',
              yeastMold: sample.yeast_mold || '',
              createdAt: sample.created_at || '',
              modifiedAt: sample.modified_at || '',
              modifiedBy: sample.modified_by || '',
              status: status as 'pending' | 'in_progress' | 'completed' | 'rejected',
              assignedTo: sample.assigned_to || '',
              reportTitle: sample.report_title || '',
              brand: sample.brand || ''
            };
          });
          
          setSamples(mappedSamples);
          
          // Sauvegarder localement pour avoir une copie offline
          saveLocally(mappedSamples);
          setIsOfflineMode(false);
        }
      } catch (error) {
        console.error('Exception fetching samples:', error);
        
        // En cas d'erreur, passer en mode hors ligne
        setIsOfflineMode(true);
        
        // Charger à partir du stockage local
        const localSamples = loadLocally();
        setSamples(localSamples);
        
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les échantillons. Mode hors ligne activé.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    // Ne charger depuis Supabase que si brand est fourni
    if (brand) {
      loadSamples();
    }
  }, [brand, savedSamples]);

  // Wrapper pour addSample qui persiste localement en cas d'erreur
  const addSample = async (defaultProduct?: string, additionalData?: Record<string, any>) => {
    setLoading(true);
    console.log("=========== DÉBUT AJOUT ÉCHANTILLON ===========");

    // Définir les champs par défaut pour éviter les nulls
    console.log("Définition des champs par défaut...");
    const currentDate = new Date().toISOString();
    // Inclure les échantillons locaux dans le compte
    const allSamples = [...samples, ...loadLocally().filter(ls => 
      !samples.some(s => s.id === ls.id))];
    const nextNumber = (allSamples.length + 1).toString().padStart(3, '0');
    
    // LOG DES INFORMATIONS SUPABASE (pour débogage)
    console.log("CONFIGURATION SUPABASE:");
    try {
      const supabaseUrl = (supabase as any).supabaseUrl;
      const supabaseKey = (supabase as any).supabaseKey;
      console.log("URL Supabase:", supabaseUrl);
      // Masquer la clé pour la sécurité, en n'affichant que les 5 premiers caractères
      console.log("Clé Supabase (début):", supabaseKey ? supabaseKey.substring(0, 5) + "..." : "non définie");
      
      // Vérifier si l'objet supabase est correctement initialisé
      console.log("Client Supabase initialisé:", !!supabase);
      console.log("Type du client Supabase:", typeof supabase);
      console.log("Mode hors ligne:", isOfflineMode);
    } catch (configError) {
      console.error("Erreur lors de l'accès à la configuration Supabase:", configError);
    }
    
    try {
      // Créer les données essentielles pour l'échantillon
      console.log("Création données d'échantillon...");
      const sample = {
        number: nextNumber,
        product: defaultProduct || 'Crème dessert vanille',
        ready_time: additionalData?.readyTime || '12:00',  // Valeur par défaut ajoutée
        fabrication: additionalData?.fabrication || currentDate.split('T')[0],
        dlc: additionalData?.dlc || currentDate.split('T')[0],  // Valeur par défaut ajoutée
        smell: 'N',
        texture: 'N',
        taste: 'N',
        aspect: 'N',
        ph: '',
        enterobacteria: additionalData?.enterobacteria || null,
        yeast_mold: additionalData?.yeastMold || null,
        status: 'pending',
        brand: brand || '',
        created_at: currentDate,
        modified_at: currentDate,
        modified_by: additionalData?.modifiedBy || 'Utilisateur',
        site: additionalData?.site || 'R1',
        analysis_type: additionalData?.analysisType || null,
        analysis_delay: additionalData?.analysisDelay || null,
        reading_day: additionalData?.readingDay || null
      };

      console.log("Données de l'échantillon à insérer:", sample);

      // VÉRIFICATIONS PRÉLIMINAIRES COMPLÈTES DE SUPABASE
      let insertionId = '';
      let supabaseError = null;
      
      // Si pas en mode hors ligne, essayer d'insérer dans Supabase
      if (!isOfflineMode) {
        // Test 2: Vérifier si Supabase est disponible avec un ping simple
        console.log("Ping Supabase...");
        try {
          const { error: pingError } = await supabase
            .from('samples')
            .select('id')
            .limit(1);
          
          if (pingError) {
            console.error("Échec du ping Supabase:", pingError);
            supabaseError = pingError;
            setIsOfflineMode(true);
          }
        } catch (pingError) {
          console.error("Exception lors du ping Supabase:", pingError);
          supabaseError = pingError;
          setIsOfflineMode(true);
        }
        
        // Uniquement si le ping a réussi
        if (!isOfflineMode) {
          // INSERTION RÉELLE DE L'ÉCHANTILLON
          console.log("Tentative d'insertion dans Supabase...");
          let insertStartTime = Date.now();
          try {
            const { data, error } = await supabase
              .from('samples')
              .insert([sample])
              .select()
              .single();
              
            let insertEndTime = Date.now();
            console.log(`Durée de l'opération d'insertion: ${insertEndTime - insertStartTime}ms`);

            if (error) {
              console.error("Erreur lors de l'insertion Supabase:", error);
              supabaseError = error;
              setIsOfflineMode(true);
            } else if (data) {
              console.log("Insertion Supabase réussie, ID:", data.id);
              insertionId = data.id;
              
              // Créer l'objet Sample mappé pour l'UI
              const mappedSample: Sample = {
                id: data.id,
                number: data.number || '',
                product: data.product || '',
                readyTime: data.ready_time || '',
                fabrication: data.fabrication || '',
                dlc: data.dlc || '',
                smell: data.smell || '',
                texture: data.texture || '',
                taste: data.taste || '',
                aspect: data.aspect || '',
                ph: data.ph || '',
                enterobacteria: data.enterobacteria || '',
                yeastMold: data.yeast_mold || '',
                createdAt: data.created_at || '',
                modifiedAt: data.modified_at || '',
                modifiedBy: data.modified_by || '',
                status: data.status as 'pending' | 'in_progress' | 'completed' | 'rejected',
                assignedTo: data.assigned_to || '',
                reportTitle: data.report_title || '',
                brand: data.brand || ''
              };
              
              // Mettre à jour l'état
              const updatedSamples = [...samples, mappedSample];
              setSamples(updatedSamples);
              saveLocally(updatedSamples);
              
              toast({
                title: "Succès",
                description: "Échantillon ajouté avec succès",
                variant: "default"
              });
              
              setLoading(false);
              return data.id;
            }
          } catch (error) {
            console.error("Exception lors de l'insertion Supabase:", error);
            supabaseError = error;
            setIsOfflineMode(true);
          }
        }
      }
      
      // Si on arrive ici, c'est qu'on est en mode hors ligne ou que l'insertion a échoué
      // Créer un ID local
      const localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Créer l'objet Sample pour l'UI
      const localSample: Sample = {
        id: localId,
        number: sample.number,
        product: sample.product,
        readyTime: sample.ready_time,
        fabrication: sample.fabrication,
        dlc: sample.dlc,
        smell: sample.smell,
        texture: sample.texture,
        taste: sample.taste,
        aspect: sample.aspect,
        ph: sample.ph || '',
        enterobacteria: sample.enterobacteria || '',
        yeastMold: sample.yeast_mold || '',
        createdAt: sample.created_at,
        modifiedAt: sample.modified_at,
        modifiedBy: sample.modified_by,
        status: sample.status as 'pending' | 'in_progress' | 'completed' | 'rejected',
        assignedTo: '',
        reportTitle: '',
        brand: sample.brand,
        isLocalOnly: true  // Marquer comme local uniquement
      };
      
      // Mettre à jour l'état
      const updatedSamples = [...samples, localSample];
      setSamples(updatedSamples);
      
      // Sauvegarder localement
      saveLocally(updatedSamples);
      
      toast({
        title: "Échantillon ajouté (mode local)",
        description: "Échantillon enregistré localement. Synchronisez plus tard quand la connexion sera rétablie.",
        variant: "default"
      });
      
      return localId;
      
    } catch (error) {
      console.error("Erreur générale lors de l'ajout d'échantillon:", error);
      
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'échantillon",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    samples,
    loading,
    isOfflineMode,
    addSample,
    // ... les autres fonctions restent identiques
    // ... copiez toutes les autres fonctions du hook telles quelles
    // ... avec leurs types et fonctionnalités existants
  };
};
