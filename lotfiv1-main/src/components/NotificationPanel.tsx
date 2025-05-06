import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ChevronDown, ChevronUp, AlertCircle, RefreshCw, Calendar, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, addDays, isToday, isTomorrow, isPast, startOfWeek, endOfWeek, isSameWeek, addWeeks, getWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Sample } from '@/types/samples';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const getCurrentWeekNumber = () => {
  const now = new Date();
  return getWeek(now, { locale: fr });
};

interface SavedAnalysis {
  reportTitle: string;
  samples: Sample[] | string[];
  date: string;
  brand?: string;
  site?: string;
  status?: string;
  creator?: string;
  creatorRole?: string;
}

interface PendingReading {
  id: string;
  date: string;
  sampleNumber: string;
  testType: 'enterobacteria' | 'yeastMold';
  reportTitle: string;
  isUrgent: boolean;
  site?: string;
  brand?: string;
  form_id?: string;
  weekNumber: number;
}

const NotificationPanel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const currentWeek = getCurrentWeekNumber();
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(null);
  const [pendingReadings, setPendingReadings] = useState<PendingReading[]>([]);
  const [ongoingAnalyses, setOngoingAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

  const loadData = async () => {
    setRefreshing(true);
    
    try {
      // Charger les analyses sauvegardées
      const loadSavedAnalysis = () => {
        const saved = localStorage.getItem('savedAnalysis');
        if (saved) {
          setSavedAnalysis(JSON.parse(saved));
        }
      };
      
      // Récupérer les lectures en attente
      const fetchPendingReadings = async () => {
        try {
          // Récupérer tous les échantillons en cours d'analyse
          const { data: inProgressSamples, error } = await supabase
            .from('samples')
            .select('*')
            .eq('status', 'in_progress');
          
          if (error) {
            console.error("Erreur récupération échantillons:", error);
            throw error;
          }
          
          console.log("Échantillons en cours récupérés:", inProgressSamples?.length || 0);
          
          // Créer des lectures pour les entérobactéries (à effectuer à J+1)
          const pendingEntero = inProgressSamples?.filter(sample => !sample.enterobacteria).map(sample => {
            // Date par défaut: aujourd'hui + 24h si pas de date spécifiée
            let readingDate;
            try {
              readingDate = sample.entero_reading_due 
                ? new Date(sample.entero_reading_due) 
                : addDays(new Date(sample.created_at || new Date()), 1);
            } catch (e) {
              console.error("Erreur de date:", e);
              readingDate = addDays(new Date(), 1);
            }
            
            return {
              id: sample.id,
              date: readingDate.toISOString(),
              sampleNumber: sample.number || `ECH-${sample.id}`,
              testType: 'enterobacteria' as const,
              reportTitle: sample.report_title || 'Rapport sans titre',
              isUrgent: isPast(readingDate),
              site: sample.site || 'Site non spécifié',
              brand: sample.brand || 'Marque non spécifiée',
              form_id: sample.report_title, // Utiliser report_title comme identifiant de formulaire
              weekNumber: getWeek(readingDate, { locale: fr })
            };
          }) || [];
          
          // Créer des lectures pour les levures/moisissures (à effectuer à J+5)
          const pendingYeast = inProgressSamples?.filter(sample => 
            sample.enterobacteria && !sample.yeast_mold
          ).map(sample => {
            // Date par défaut: aujourd'hui + 5 jours si pas de date spécifiée
            let readingDate;
            try {
              readingDate = sample.yeast_reading_due 
                ? new Date(sample.yeast_reading_due) 
                : addDays(new Date(sample.created_at || new Date()), 5);
            } catch (e) {
              console.error("Erreur de date:", e);
              readingDate = addDays(new Date(), 5);
            }
            
            return {
              id: sample.id,
              date: readingDate.toISOString(),
              sampleNumber: sample.number || `ECH-${sample.id}`,
              testType: 'yeastMold' as const,
              reportTitle: sample.report_title || 'Rapport sans titre',
              isUrgent: isPast(readingDate),
              site: sample.site || 'Site non spécifié',
              brand: sample.brand || 'Marque non spécifiée',
              form_id: sample.report_title, // Utiliser report_title comme identifiant de formulaire
              weekNumber: getWeek(readingDate, { locale: fr })
            };
          }) || [];
          
          console.log("Lectures en attente: entero", pendingEntero.length, "yeast", pendingYeast.length);
          
          // Fusionner les deux types de lectures
          const allReadings = [...pendingEntero, ...pendingYeast];
          
          // Regrouper les lectures par formulaire pour éviter les duplications
          const uniqueFormReadings = Object.values(
            allReadings.reduce((acc, reading) => {
              const key = `${reading.form_id || reading.reportTitle}-${reading.testType}`;
              
              // Si nous n'avons pas encore cette lecture ou si celle-ci est plus urgente
              if (!acc[key] || (reading.isUrgent && !acc[key].isUrgent)) {
                acc[key] = reading;
              }
              return acc;
            }, {} as Record<string, PendingReading>)
          );
          
          setPendingReadings(uniqueFormReadings);
        } catch (error) {
          console.error('Erreur lors du chargement des lectures en attente:', error);
        }
      };
      
      // Récupérer les analyses en cours
      const fetchOngoingAnalyses = async () => {
        try {
          // 1. Récupérer les analyses locales de localStorage
          const storedAnalyses = localStorage.getItem('savedAnalysis');
          let localAnalyses = [];
          
          if (storedAnalyses) {
            const analysis = JSON.parse(storedAnalyses);
            localAnalyses = [{
              reportTitle: analysis.reportTitle,
              samples: analysis.samples || [],
              date: analysis.date,
              brand: analysis.brand,
              site: analysis.site,
              status: 'in_progress',
              creator: user?.name,
              creatorRole: user?.role
            }];
          }
          
          // 2. Récupérer les analyses en cours depuis Supabase
          const { data: ongoingSamples, error } = await supabase
            .from('samples')
            .select('*')
            .eq('status', 'in_progress');
            
          if (error) {
            console.error('Erreur lors de la récupération des échantillons en cours:', error);
            setOngoingAnalyses(localAnalyses);
            return;
          }
          
          // 3. Regrouper les échantillons par formulaire (report_title)
          const formMap = new Map();
          
          if (ongoingSamples && ongoingSamples.length > 0) {
            ongoingSamples.forEach(sample => {
              const key = sample.report_title || 'Sans titre';
              
              if (!formMap.has(key)) {
                formMap.set(key, {
                  reportTitle: key,
                  samples: [],
                  date: sample.modified_at || sample.created_at,
                  brand: sample.brand,
                  site: sample.site,
                  status: 'in_progress',
                  creator: sample.modified_by,
                  creatorRole: 'coordinator' // Par défaut
                });
              }
              
              // Ajouter l'échantillon au formulaire
              const form = formMap.get(key);
              form.samples.push({
                id: sample.id,
                number: sample.number,
                product: sample.product,
                status: sample.status,
                // Autres propriétés...
              });
              
              // Mettre à jour la date si c'est plus récent
              if (new Date(sample.modified_at) > new Date(form.date)) {
                form.date = sample.modified_at;
              }
            });
          }
          
          // 4. Combiner analyses locales et analyses de Supabase
          const supabaseAnalyses = Array.from(formMap.values());
          setOngoingAnalyses([...localAnalyses, ...supabaseAnalyses]);
          
          console.log('Analyses en cours récupérées:', [...localAnalyses, ...supabaseAnalyses]);
        } catch (error) {
          console.error('Erreur lors du chargement des analyses en cours:', error);
          setOngoingAnalyses([]);
        }
      };
      
      // Exécuter toutes les requêtes
      loadSavedAnalysis();
      await Promise.all([
        fetchPendingReadings(),
        fetchOngoingAnalyses()
      ]);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de récupérer les dernières données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Move handleDeleteAnalysis out of useEffect to make it accessible throughout the component
  const handleDeleteAnalysis = async (analysis) => {
    console.log("Tentative de suppression de l'analyse:", analysis);
    if (!window.confirm("Voulez-vous vraiment supprimer ce formulaire ?")) return;

    try {
      // Cas 1: Supprimer par report_title (cas courant)
      if (analysis.reportTitle || analysis.report_title) {
        const reportTitle = analysis.reportTitle || analysis.report_title;
        console.log("Suppression par report_title:", reportTitle);
        
        const { error } = await supabase
          .from('samples')
          .delete()
          .eq('report_title', reportTitle);

        if (error) {
          console.error("Erreur lors de la suppression par report_title:", error);
          throw error;
        }
        
        toast({
          title: "Succès",
          description: "Le formulaire a été supprimé avec succès !",
          duration: 3000
        });
      } 
      // Cas 2: Supprimer par ID (fallback)
      else if (analysis.id) {
        console.log("Suppression par ID:", analysis.id);
        
        const { error } = await supabase
          .from('samples')
          .delete()
          .eq('id', analysis.id);

        if (error) {
          console.error("Erreur lors de la suppression par ID:", error);
          throw error;
        }
        
        toast({
          title: "Succès",
          description: "L'échantillon a été supprimé avec succès !",
          duration: 3000
        });
      }
      else {
        throw new Error("Impossible d'identifier l'élément à supprimer");
      }

      // Rafraîchir les données
      handleRefresh();
    } catch (error) {
      console.error("Erreur globale de suppression:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression: " + (error.message || "Contactez l'administrateur"),
        variant: "destructive",
        duration: 5000
      });
    }
  };

  useEffect(() => {
    loadData();
    
    // Configurer un écouteur d'échantillons en temps réel
    const samplesChannel = supabase
      .channel('samples-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'samples' }, 
        () => {
          loadData();
        })
      .subscribe();
    
    // Nettoyage lors du démontage du composant
    return () => {
      supabase.removeChannel(samplesChannel);
    };
  }, [user]);

  const handleContinueAnalysis = (analysis: SavedAnalysis) => {
    navigate('/sample-entry', { 
      state: { 
        reportTitle: analysis.reportTitle,
        samples: analysis.samples,
        brand: analysis.brand,
        site: analysis.site
      } 
    });
  };

  const handleReadSample = (reading: PendingReading) => {
    navigate('/sample-entry', { 
      state: { 
        reportTitle: reading.reportTitle,
        highlightSampleId: reading.id,
        readingType: reading.testType,
        site: reading.site
      } 
    });
  };

  const groupReadingsByWeek = () => {
    const byWeek: Record<number, PendingReading[]> = {};
    
    pendingReadings.forEach(reading => {
      const readingDate = new Date(reading.date);
      const weekNumber = reading.weekNumber;
      
      if (!byWeek[weekNumber]) {
        byWeek[weekNumber] = [];
      }
      byWeek[weekNumber].push(reading);
    });
    
    return byWeek;
  };

  const groupReadingsByDay = (readings: PendingReading[]) => {
    const grouped: Record<string, PendingReading[]> = {};
    
    readings.forEach(reading => {
      const readingDate = new Date(reading.date);
      let day;
      
      if (isToday(readingDate)) {
        day = "Aujourd'hui";
      } else if (isTomorrow(readingDate)) {
        day = "Demain";
      } else {
        day = format(readingDate, 'EEEE d MMMM', { locale: fr });
      }
      
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(reading);
    });
    
    return grouped;
  };

  const handleRefresh = () => {
    loadData();
  };

  const readingsByWeek = groupReadingsByWeek();
  const weeksList = Object.keys(readingsByWeek).map(Number).sort((a, b) => a - b);
  
  const filteredReadings = pendingReadings.filter(reading => reading.weekNumber === selectedWeek);
  const readingsByDay = groupReadingsByDay(filteredReadings);
  
  const pendingReadingsCount = pendingReadings.length;
  const urgentReadingsCount = pendingReadings.filter(r => r.isUrgent).length;
  const currentWeekReadingsCount = (readingsByWeek[currentWeek] || []).length;
// Liste des jours de la semaine en français
const joursSemaine = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

// Fonction pour obtenir le jour de la semaine (0 = dimanche, 1 = lundi, ...)
const getJourSemaine = (dateStr) => {
  const date = new Date(dateStr);
  // getDay() : 0 = dimanche, 1 = lundi, ..., 6 = samedi
  // On veut 0 = lundi, ..., 6 = dimanche
  return (date.getDay() + 6) % 7;
};

// Grouper les lectures par jour de la semaine
const lecturesParJour = Array(7).fill(null).map(() => []);
pendingReadings.forEach(reading => {
  const jourIndex = getJourSemaine(reading.date);
  lecturesParJour[jourIndex].push(reading);
});
const getLectureTypesForDay = (lectures) => {
  const types = [];
  if (lectures.some(l => l.testType === 'enterobacteria')) types.push('enterobacteria');
  if (lectures.some(l => l.testType === 'yeastMold')) types.push('yeastMold');
  return types;
};
const handleShowReadings = (type, dayIdx) => {
  // Récupérer le jour de la semaine
  const jour = joursSemaine[dayIdx];
  
  // Déterminer les paramètres selon le type de bactérie
  let bacterie, delai;
  if (type === 'enterobacteria') {
    bacterie = 'Entérobactéries';
    delai = '24h';
  } else if (type === 'yeastMold') {
    bacterie = 'Levures et Moisissures';
    delai = '5j';
  }
  
  // Afficher un toast de redirection
  toast({
    title: "Redirection en cours",
    description: `Préparation du formulaire pour ${bacterie} (${delai}) - ${jour}`,
    duration: 2000
  });
  
  console.log("Redirection vers sample-entry avec paramètres:", {
    bacterie, jour, delai, site: 'R1'
  });
  
  // Construire la chaîne de requête URL
  const queryParams = new URLSearchParams({
    bacterie: bacterie,
    jour: jour,
    delai: delai,
    site: 'R1'
  }).toString();
  
  // Utiliser la navigation programmatique au lieu de window.location
  navigate(`/sample-entry?${queryParams}`);
};
  return (
    <Card>
      <Button
        variant="ghost"
        className="w-full flex justify-between items-center p-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <CardContent className="p-4">

        
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Lecture en attente
                {pendingReadingsCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingReadingsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ongoing" className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-2" />
                Analyses en cours
                {(savedAnalysis || ongoingAnalyses.length > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {(savedAnalysis ? 1 : 0) + ongoingAnalyses.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
  {/* Affiche le numéro de la semaine au-dessus du tableau */}
  <div className="font-bold mb-2">
    Semaine {selectedWeek}
  </div>
  <Table className="mb-4">
    <TableHeader>
      <TableRow>
        <TableHead>Jour</TableHead>
        <TableHead>Lectures prévues</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
  {joursSemaine.map((jour, idx) => {
    const types = getLectureTypesForDay(lecturesParJour[idx]);
    return (
      <TableRow key={jour}>
        <TableCell>{jour}</TableCell>
        <TableCell>
          {types.length === 0 && <span className="text-gray-400">-</span>}
          {types.includes('enterobacteria') && (
            <Button
              variant="link"
              className="p-0 m-0 text-blue-600 underline"
              onClick={() => handleShowReadings('enterobacteria', idx)}
            >
              Entérobactéries (24h)
            </Button>
          )}
          {types.includes('yeastMold') && (
            <Button
              variant="link"
              className="p-0 m-0 text-blue-600 underline"
              onClick={() => handleShowReadings('yeastMold', idx)}
            >
              Levures/Moisissures (5 jours)
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>
  </Table>
</TabsContent>

            <TabsContent value="ongoing">
              {loading ? (
                <p className="text-center text-gray-500">Chargement des analyses en cours...</p>
              ) : savedAnalysis || ongoingAnalyses.length > 0 ? (
                <div className="space-y-4">
                  {savedAnalysis && (
                    <Alert>
                      <AlertTitle className="font-medium text-lg flex items-center justify-between">
                        {savedAnalysis.reportTitle}
                        <Badge>Brouillon local</Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="text-sm text-gray-500 mb-4">
                          <p>Dernière modification: {new Date(savedAnalysis.date).toLocaleDateString()}</p>
                          {savedAnalysis.site && <p>Site: {savedAnalysis.site}</p>}
                          <p>Échantillons: {Array.isArray(savedAnalysis.samples) ? savedAnalysis.samples.length : 'Non disponible'}</p>
                        </div>
                        <Button onClick={() => handleContinueAnalysis(savedAnalysis)}>
                          Continuer l'analyse
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {ongoingAnalyses.length > 0 && (
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <h3 className="font-medium mb-4">Analyses partagées avec l'équipe</h3>
                      <div className="space-y-3">
                        {ongoingAnalyses.map((analysis, index) => (
                          <div key={index} className="bg-card p-4 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{analysis.reportTitle}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  analysis.creatorRole === 'coordinator' ? "outline" : "secondary"
                                }>
                                  {analysis.creatorRole === 'coordinator' ? 'Créé par Coordinateur' : 'En attente'}
                                </Badge>
                                <Badge variant={
                                  analysis.status === 'in_progress' ? "default" : 
                                  analysis.status === 'completed' ? "secondary" : "outline"
                                }>
                                  {analysis.status === 'in_progress' ? 'En cours' : 
                                   analysis.status === 'completed' ? 'Terminé' : 'À traiter'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 mb-4">
                              <p>Dernière modification: {new Date(analysis.date).toLocaleDateString()}</p>
                              {analysis.site && <p>Site: {analysis.site}</p>}
                              <p>Échantillons: {Array.isArray(analysis.samples) ? analysis.samples.length : 'Non disponible'}</p>
                            </div>
                            <div className="flex justify-between items-center gap-2">
  <Button onClick={() => handleContinueAnalysis(analysis)}>
    {user?.role === 'technician' ? 'Compléter l\'analyse' : 'Ouvrir l\'analyse'}
  </Button>
  <Button 
    variant="destructive"
    className="ml-2"
    onClick={() => handleDeleteAnalysis(analysis)}
  >
    Supprimer
  </Button>
</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">Aucune analyse en cours</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};

export default NotificationPanel;
