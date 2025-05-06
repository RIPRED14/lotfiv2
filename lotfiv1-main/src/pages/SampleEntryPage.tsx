import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Save, DownloadCloud, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BatchNumbers from '@/components/BatchNumbers';
import SamplesTable from '@/components/SamplesTable';
import SamplePageHeader from '@/components/SamplePageHeader';
import SampleActionButtons from '@/components/SampleActionButtons';
import { useSamples } from '@/hooks/useSamples';
import { supabase } from '@/integrations/supabase/client';

const SampleEntryPage = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Récupérer les paramètres d'URL si présents
  const [searchParams] = useSearchParams();
  const bacterieParam = searchParams.get('bacterie');
  const jourParam = searchParams.get('jour');
  const delaiParam = searchParams.get('delai');
  const siteParam = searchParams.get('site');
  
  console.log("Paramètres d'URL détectés:", { bacterieParam, jourParam, delaiParam, siteParam });
  
  // Générer un titre de rapport basé sur les paramètres URL si disponibles
  const generatedReportTitle = bacterieParam && delaiParam
    ? `Analyse de ${bacterieParam} (${delaiParam}) - ${jourParam || 'Non spécifié'}`
    : '';
  
  // Combiner les paramètres de state et d'URL
  const { 
    reportTitle = generatedReportTitle, 
    samples: savedSamples = [], 
    brand = '', 
    site = siteParam || '', 
    sampleDate = '', 
    reference = '',
    bacterie = bacterieParam || '',
    jour = jourParam || '',
    delai = delaiParam || '',
    isNew = false,
    fromPendingPage = bacterieParam ? true : false,
    GF_PRODUCTS = ['Crème dessert vanille', 'Crème dessert chocolat', 'Crème dessert caramel'] // Valeur par défaut
  } = location.state || {};

  const [waterPeptone, setWaterPeptone] = useState<string>('');
  const [petriDishes, setPetriDishes] = useState<string>('');
  const [VRBGGel, setVRBGGel] = useState<string>('');
  const [YGCGel, setYGCGel] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // État pour suivre si on vient de la page de lecture
  const [comingFromReadingPage, setComingFromReadingPage] = useState<boolean>(fromPendingPage);

  // Move the useSamples hook initialization BEFORE the useEffect that depends on addSample
  const { 
    samples, 
    addSample, 
    updateSample, 
    toggleConformity, 
    validateSamples, 
    addChangeHistory, 
    sendToTechnician,
    deleteSample 
  } = useSamples({
    savedSamples,
    brand
  });

  useEffect(() => {
    // Fonction pour ajouter un échantillon avec des paramètres
    const createSampleWithParams = async (bacterie, jour, delai, site) => {
      console.log("DÉMARRAGE CRÉATION ÉCHANTILLONS pour:", bacterie);
      
      // Valeurs par défaut si nécessaire
      const defaultProduct = 'Crème dessert vanille';
      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      
      // Ajouter 3 échantillons
      try {
        for (let i = 0; i < 3; i++) {
          console.log(`Création de l'échantillon ${i+1}/3 pour ${bacterie}...`);
          
          // Attendre que l'échantillon soit ajouté avant de passer au suivant
          const result = await addSample(defaultProduct, {
            enterobacteria: bacterie === 'Entérobactéries' ? '' : null,
            yeastMold: bacterie.includes('levure') || bacterie.includes('moisissure') ? '' : null,
            site: site || 'R1',
            analysisType: bacterie,
            analysisDelay: delai || '24h',
            readingDay: jour || 'Lundi',
            fabrication: formattedDate
          });
          
          console.log(`Résultat création échantillon ${i+1}:`, result);
          
          // Pause courte entre les ajouts
          await new Promise(resolve => setTimeout(resolve, 700));
        }
        
        // Message de confirmation après tous les échantillons
        toast({
          title: "Échantillons créés",
          description: `3 échantillons pour ${bacterie} (${delai || 'délai non spécifié'}) ont été ajoutés automatiquement`,
          duration: 5000
        });
        
        console.log("Tous les échantillons ont été créés avec succès!");
      } catch (error) {
        console.error("Erreur lors de la création des échantillons:", error);
        toast({
          title: "Erreur",
          description: "Impossible de créer tous les échantillons automatiquement. Veuillez utiliser le bouton 'Ajouter un échantillon'.",
          variant: "destructive",
          duration: 5000
        });
      }
    };

    // Obtenir les paramètres directement de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlBacterie = urlParams.get('bacterie');
    const urlJour = urlParams.get('jour');
    const urlDelai = urlParams.get('delai');
    const urlSite = urlParams.get('site');
    
    console.log("URL COMPLÈTE:", window.location.href);
    console.log("Paramètres URL détectés:", {
      bacterie: urlBacterie,
      jour: urlJour,
      delai: urlDelai,
      site: urlSite
    });

    // Si des paramètres sont trouvés dans l'URL, créer des échantillons
    if (urlBacterie) {
      console.log("Paramètres de bactérie détectés, création d'échantillons...");
      
      // Notification
      toast({
        title: "Création d'échantillons",
        description: `Préparation de l'analyse pour ${urlBacterie} (${urlDelai || 'délai non spécifié'})`,
        duration: 3000
      });
      
      // Créer les échantillons après un petit délai
      setTimeout(() => {
        createSampleWithParams(urlBacterie, urlJour, urlDelai, urlSite);
        setComingFromReadingPage(true);
      }, 1500);
    }
  }, [toast, addSample]); // Ajout de toast et addSample comme dépendances

  const handleSave = async () => {
    if (!validateSamples()) return;
    
    setIsLoading(true);

    try {
      // Créer un identifiant unique pour le formulaire s'il n'existe pas déjà
      const formId = reportTitle || `Formulaire-${new Date().toISOString().slice(0, 10)}`;
      
      // Save batch numbers
      const { error: batchError } = await supabase
        .from('batch_numbers')
        .insert([{
          report_id: formId,
          water_peptone: waterPeptone,
          petri_dishes: petriDishes,
          vrbg_gel: VRBGGel,
          ygc_gel: YGCGel
        }]);

      if (batchError) throw batchError;
      
      // Statut global du formulaire - sera mis à jour en fonction des échantillons
      let samplesUpdated = 0;

      // Mettre à jour le statut des échantillons en fonction du rôle et de l'étape
      if (user?.role === 'technician') {
        // Si c'est un technicien qui sauvegarde, vérifiez l'état de chaque échantillon
        for (const sample of samples) {
          let updates = {};
          
          // Première sauvegarde par le technicien après le coordinateur
          if ((sample.status === 'in_progress' || sample.status === 'pending') && !sample.enterobacteria && !sample.yeastMold) {
            console.log("Échantillon initial rempli, en attente d'entérobactéries:", sample.id);
            
            // Calculer les dates d'échéance pour les lectures microbiologiques
            const now = new Date();
            const enteroReadingDue = new Date(now);
            enteroReadingDue.setHours(now.getHours() + 24); // +24h pour entérobactéries
            
            const yeastReadingDue = new Date(now);
            yeastReadingDue.setDate(now.getDate() + 5); // +5 jours pour levures/moisissures
            
            updates = {
              status: 'in_progress', // Utilisez les valeurs de status qui existent dans le type
              entero_reading_due: enteroReadingDue.toISOString(),
              yeast_reading_due: yeastReadingDue.toISOString(),
              report_title: reportTitle
            };
          } 
          // Mise à jour avec les résultats d'entérobactéries
          else if (sample.status === 'in_progress' && sample.enterobacteria && !sample.yeastMold) {
            console.log("Enterobactéries remplies, en attente de levures/moisissures:", sample.id);
            
            updates = {
              status: 'in_progress', // Utilisez les valeurs de status qui existent dans le type
              enterobacteria: sample.enterobacteria,
              report_title: reportTitle
            };
          }
          // Mise à jour avec les résultats de levures/moisissures (analyse complète)
          else if (sample.status === 'in_progress' && 
                   sample.enterobacteria && sample.yeastMold) {
            console.log("Échantillon complètement rempli:", sample.id);
            
            updates = {
              status: 'completed',
              enterobacteria: sample.enterobacteria,
              yeast_mold: sample.yeastMold,
              report_title: reportTitle
            };
          }
          
          // Si des mises à jour sont nécessaires, envoyer à Supabase
          if (Object.keys(updates).length > 0) {
            // Ajouter le site et la marque aux mises à jour
            updates = {
              ...updates,
              site: site,
              brand: brand,
              modified_at: new Date().toISOString(),
              modified_by: user?.name
            };
            
            console.log("Mise à jour de l'échantillon:", sample.id, updates);
            
            try {
              // Convertir l'ID en string si c'est un nombre
              const sampleId = typeof sample.id === 'number' ? String(sample.id) : sample.id;
              
              const { error } = await supabase
                .from('samples')
                .update(updates)
                .eq('id', sampleId);
                
              if (error) {
                console.error('Erreur lors de la mise à jour du statut:', error);
                throw error;
              }
              
              // Incrémenter le compteur d'échantillons mis à jour
              samplesUpdated++;
            } catch (updateError) {
              console.error('Erreur lors de la mise à jour de l\'échantillon:', updateError);
            }
          }
        }
      } else if (user?.role === 'coordinator') {
        // Si c'est un coordinateur qui sauvegarde, initialiser les échantillons
        for (const sample of samples) {
          try {
            // Extraire l'ID de l'échantillon
            const sampleId = typeof sample.id === 'number' ? String(sample.id) : sample.id;
            
            // Vérifier si l'ID est valide
            const idExists = sampleId && sampleId !== "undefined" && sampleId.length > 5;
            
            // Préparer les données de l'échantillon en s'assurant que tous les champs ont des valeurs valides
            const sampleData = {
              number: sample.number || '',
              product: sample.product || '',
              ready_time: sample.readyTime || '',
              fabrication: sample.fabrication || '',
              dlc: sample.dlc || '',
              smell: sample.smell || 'N',
              texture: sample.texture || 'N',
              taste: sample.taste || 'N',
              aspect: sample.aspect || 'N',
              ph: typeof sample.ph === 'number' ? String(sample.ph) : (sample.ph || ''),
              enterobacteria: sample.enterobacteria || '',
              yeast_mold: sample.yeastMold || '',
              status: 'in_progress',
              brand: brand || '',
              report_title: reportTitle || '',
              modified_at: new Date().toISOString(),
              modified_by: user?.name || 'Utilisateur'
            };
            
            console.log("Données de l'échantillon à sauvegarder:", { id: sampleId, data: sampleData });
            
            if (idExists) {
              // Mettre à jour l'échantillon existant
              const { error } = await supabase
                .from('samples')
                .update(sampleData)
                .eq('id', sampleId);
                
              if (error) {
                console.error('Erreur mise à jour échantillon:', error);
                throw error;
              }
            } else {
              // Insérer un nouvel échantillon
              const { error } = await supabase
                .from('samples')
                .insert({
                  ...sampleData,
                  created_at: new Date().toISOString()
                });
                
              if (error) {
                console.error('Erreur création échantillon:', error);
                throw error;
              }
            }
            
            // Incrémenter le compteur d'échantillons mis à jour
            samplesUpdated++;
          } catch (sampleError) {
            console.error('Erreur lors de la sauvegarde de l\'échantillon:', sampleError);
          }
        }
      }

      // Sauvegarder l'analyse en local
      localStorage.setItem('savedAnalysis', JSON.stringify({
        reportTitle,
        formId,
        samples,
        date: new Date().toISOString(),
        brand,
        site: site,
        batchNumbers: {
          waterPeptone,
          petriDishes,
          VRBGGel,
          YGCGel
        }
      }));

      // Enregistrer la sauvegarde dans l'historique
      addChangeHistory({
        action: 'save',
        user: user?.name || 'Unknown',
        role: user?.role || 'guest'
      });

      toast({
        title: "Analyse sauvegardée",
        description: `${samplesUpdated} échantillon(s) enregistré(s) avec succès.`,
      });
      
      // Si le technicien vient de remplir les données initiales, afficher un message
      if (user?.role === 'technician' && samples.some(s => s.status === 'in_progress')) {
        toast({
          title: "Incubation en cours",
          description: "Les échantillons sont en incubation. Vous recevrez une notification lorsqu'il sera temps de saisir les résultats microbiologiques.",
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'analyse",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkLockStatus = () => {
      const storedAnalysis = localStorage.getItem('savedAnalysis');
      if (storedAnalysis) {
        const { lockedByCoordinator } = JSON.parse(storedAnalysis);
        if (lockedByCoordinator) setIsLocked(true);
      }
    };
    
    checkLockStatus();
  }, []); // Only run once on mount

  const handleSendToTechnician = async () => {
    if (!validateSamples()) return;
    
    setIsLoading(true);
    
    // Convertir les IDs numériques en chaînes
    const selectedSampleIds = selectedSamples.length > 0 
      ? selectedSamples.map(id => id.toString()) 
      : undefined;
      
    const success = await sendToTechnician(selectedSampleIds);
    setIsLoading(false);
    
    if (success) {
      // Rediriger vers la page de contrôle de qualité après envoi au technicien
      setTimeout(() => {
        navigate('/quality-control');
      }, 1500);
    }
  };

  const handleToggleSelectSample = (sampleId: number) => {
    if (selectedSamples.includes(sampleId)) {
      setSelectedSamples(selectedSamples.filter(id => id !== sampleId));
    } else {
      setSelectedSamples([...selectedSamples, sampleId]);
    }
  };

  // Modification de la fonction pour utiliser deleteSample du hook
  const handleDeleteSample = (sampleId: number) => {
    // Demander confirmation à l'utilisateur
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'échantillon sélectionné ?`)) {
      try {
        console.log("Tentative de suppression de l'échantillon avec ID:", sampleId);
        
        // Convertir l'ID en string pour le deleteSample
        const sampleIdStr = typeof sampleId === 'number' ? String(sampleId) : sampleId;
        
        // Appeler la fonction de suppression
        deleteSample(sampleIdStr);
        
        // Si l'échantillon était sélectionné, le retirer de la sélection
        if (selectedSamples.includes(sampleId)) {
          setSelectedSamples(selectedSamples.filter(id => id !== sampleId));
        }
        
        // Notification de succès
        toast({
          title: "Échantillon supprimé",
          description: "L'échantillon a été supprimé avec succès.",
          duration: 3000
        });
      } catch (error) {
        console.error("Erreur lors de la suppression de l'échantillon:", error);
        
        // Notification d'erreur
        toast({
          title: "Erreur de suppression",
          description: "Un problème est survenu lors de la suppression de l'échantillon.",
          variant: "destructive",
          duration: 5000
        });
      }
    }
  };

  // Fonction pour gérer l'annulation des modifications
  const handleCancel = () => {
    // Réinitialiser les sélections
    setSelectedSamples([]);
    
    toast({
      title: "Opération annulée",
      description: "Les modifications ont été annulées."
    });
  };

  const handleDownload = () => {
    try {
      // Créer un objet avec toutes les données
      const dataToExport = {
        reportTitle,
        brand,
        site,
        sampleDate,
        reference,
        samples,
        batchNumbers: {
          waterPeptone,
          petriDishes,
          VRBGGel,
          YGCGel
        }
      };
      
      // Convertir en JSON
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportTitle.replace(/\s+/g, '_')}_export.json`;
      document.body.appendChild(a);
      a.click();
      
      // Nettoyer
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export réussi",
        description: "Les données ont été exportées avec succès",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  const isGrandFrais = brand === '1';
  const isCoordinator = user?.role === 'coordinator';
  const isTechnician = user?.role === 'technician';

  // Fonction pour revenir à la page des lectures en attente
  const handleReturnToPendingReadings = () => {
    navigate('/lecture-details');
  };

  // Fonction pour ajouter un échantillon avec un produit par défaut
  const handleAddSample = () => {
    // Définir un produit par défaut, en s'assurant qu'il existe toujours
    const defaultProduct = GF_PRODUCTS && GF_PRODUCTS.length > 0 ? GF_PRODUCTS[0] : 'Crème dessert vanille';
    
    // Obtenir les paramètres d'URL de manière plus robuste
    const urlParams = new URLSearchParams(window.location.search);
    const urlBacterie = urlParams.get('bacterie');
    const urlJour = urlParams.get('jour');
    const urlDelai = urlParams.get('delai');
    const urlSite = urlParams.get('site');
    
    // Afficher les paramètres pour débogage
    console.log("FONCTION HANDLEADDSAMPLE - Paramètres URL détectés:", {
      bacterie: urlBacterie,
      jour: urlJour,
      delai: urlDelai,
      site: urlSite
    });
    
    // Utiliser les paramètres d'URL ou de state, ou des valeurs par défaut hardcodées
    const bact = urlBacterie || bacterie || 'Entérobactéries';
    const day = urlJour || jour || 'Lundi';
    const delay = urlDelai || delai || '24h';
    const siteVal = urlSite || site || 'R1';
    
    // Toujours créer un échantillon, qu'il y ait des paramètres ou non
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    // Créer un nouvel échantillon avec des valeurs préremplies ou hardcodées
    try {
      addSample(defaultProduct, {
        enterobacteria: bact === 'Entérobactéries' ? '' : null,
        yeastMold: bact.includes('levure') || bact.includes('moisissure') ? '' : null,
        site: siteVal,
        analysisType: bact,
        analysisDelay: delay,
        readingDay: day,
        fabrication: formattedDate
      });
      
      console.log("SUCCÈS - Échantillon ajouté pour:", bact);
      
      // Afficher une confirmation
      toast({
        title: "Échantillon ajouté",
        description: `Échantillon préparé pour l'analyse de ${bact} (${delay}) - Site: ${siteVal}`,
        duration: 5000
      });
    } catch (error) {
      console.error("ERREUR lors de l'ajout de l'échantillon:", error);
      
      // Afficher un message d'erreur à l'utilisateur
      toast({
        title: "Erreur d'ajout d'échantillon",
        description: "Un problème est survenu lors de l'ajout de l'échantillon. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fadeIn">
      <SamplePageHeader title={reportTitle || `Analyse de ${bacterie} (${delai})`} />

      <main className="container mx-auto px-4 py-8">
        {comingFromReadingPage && (
          <div className="mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReturnToPendingReadings}
              className="flex items-center gap-2 text-[#0091CA] border-[#0091CA] hover:bg-[#e6f7ff]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au planning
            </Button>
          </div>
        )}

        {comingFromReadingPage && samples.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-green-800 font-medium mb-2">Échantillons créés automatiquement</h3>
            <p className="text-green-700">
              {samples.length} échantillon(s) ont été créés automatiquement pour cette analyse. 
              Vous pouvez maintenant les compléter et les enregistrer.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all duration-300 hover:shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Saisie des Échantillons</h2>
              {reportTitle ? (
                <p className="text-gray-500 mt-1">{reportTitle}</p>
              ) : bacterie && delai ? (
                <p className="text-gray-500 mt-1">Analyse de {bacterie} ({delai}) - {jour}</p>
              ) : null}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>Site: {site}</span>
                {jour && <><span>•</span><span>Jour: {jour}</span></>}
                {reference && <><span>•</span><span>Référence: {reference}</span></>}
                {sampleDate && <><span>•</span><span>Date: {sampleDate}</span></>}
              </div>
              {bacterie && delai && (
                <div className="mt-2 text-sm">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {bacterie} - Délai: {delai}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SampleActionButtons 
                onSave={handleSave}
                onAdd={handleAddSample}
                showAddButton={isCoordinator && !isLocked}
                selectedSamples={selectedSamples.length}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
            {samples.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun échantillon</h3>
                <p className="text-gray-500 max-w-md mb-6">Ajoutez des échantillons pour commencer l'analyse.</p>
                {isCoordinator && !isLocked && (
                  <Button
                    onClick={handleAddSample}
                    className="bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un échantillon
                  </Button>
                )}
              </div>
            ) : (
              <SamplesTable
                samples={samples}
                isGrandFrais={isGrandFrais}
                GF_PRODUCTS={GF_PRODUCTS}
                updateSample={updateSample}
                toggleConformity={toggleConformity}
                isLocked={isLocked}
                userRole={user?.role || 'guest'}
                selectedSamples={selectedSamples}
                onToggleSelectSample={handleToggleSelectSample}
                onDeleteSample={handleDeleteSample}
              />
            )}
          </div>

          {samples.length > 0 && isCoordinator && !isLocked && (
            <div className="flex justify-center mb-8">
              <Button
                variant="outline"
                onClick={handleAddSample}
                className="w-full md:w-auto max-w-xs mx-auto border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un échantillon
              </Button>
            </div>
          )}

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md">
            <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">Info</span>
              Informations sur les lots
            </h3>
            <BatchNumbers 
              waterPeptone={waterPeptone}
              setWaterPeptone={setWaterPeptone}
              petriDishes={petriDishes}
              setPetriDishes={setPetriDishes}
              VRBGGel={VRBGGel}
              setVRBGGel={setVRBGGel}
              YGCGel={YGCGel}
              setYGCGel={setYGCGel}
            />
          </div>

          {samples.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  <span className="font-medium">{samples.length}</span> échantillon{samples.length > 1 ? 's' : ''} au total
                </div>
                {selectedSamples.length > 0 && (
                  <div>
                    <span className="font-medium">{selectedSamples.length}</span> sélectionné{selectedSamples.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SampleEntryPage;
