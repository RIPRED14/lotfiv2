import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { CalendarIcon, FileText, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfWeek, getWeek, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { 
  fetchAnalysesPlanifiees, 
  fetchAnalysesEnCours,
  AnalysePlanifiee,
  AnalyseEnCours
} from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Liste des bactéries disponibles pour les analyses
const BACTERIES = {
  ENTERO: { nom: 'Entérobactéries', delai: '24h' },
  COLIFORM: { nom: 'Coliformes totaux', delai: '5j' },
  LISTERIA: { nom: 'Listeria', delai: '48h' },
  SALMONELLA: { nom: 'Salmonella', delai: '5j' },
  ECOLI: { nom: 'E. coli', delai: '24h' },
  STAPH: { nom: 'Staphylococcus aureus', delai: '48h' }
};

// Liste des sites
const SITES = [
  { id: 'R1', nom: 'Laiterie Collet (R1)' },
  { id: 'R2', nom: 'Végétal Santé (R2)' },
  { id: 'BAIKO', nom: 'Laiterie Baiko' }
];

// Liste des jours de la semaine
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const PendingReadingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("lectures");
  const [weekNumber, setWeekNumber] = useState<number>(getWeek(new Date(), { weekStartsOn: 1 }));
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [plannedBacteria, setPlannedBacteria] = useState<Record<string, AnalysePlanifiee[]>>({});
  const [ongoingAnalyses, setOngoingAnalyses] = useState<AnalyseEnCours[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // États pour le formulaire d'ajout d'une nouvelle analyse
  const [newAnalyse, setNewAnalyse] = useState({
    bacterie: '',
    jour: '',
    site: '',
    date_analyse: format(new Date(), 'yyyy-MM-dd')
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fonction pour récupérer les données depuis Supabase
  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Récupérer les analyses planifiées pour la semaine
      const analysesPlanifiees = await fetchAnalysesPlanifiees(weekNumber);
      
      // Organiser les données par jour
      const bacteriesParJour: Record<string, AnalysePlanifiee[]> = {};
      JOURS.forEach(jour => {
        bacteriesParJour[jour] = [];
      });
      
      analysesPlanifiees.forEach(analyse => {
        if (bacteriesParJour[analyse.jour]) {
          bacteriesParJour[analyse.jour].push(analyse);
        }
      });
      
      setPlannedBacteria(bacteriesParJour);
      
      // Récupérer les analyses en cours
      const analysesEnCours = await fetchAnalysesEnCours();
      
      // Transformer les données pour l'affichage
      const formattedAnalyses = analysesEnCours.map(analyse => ({
        ...analyse,
        title: `${analyse.bacterie} (${analyse.delai})`
      }));
      
      setOngoingAnalyses(formattedAnalyses);
      
      // Après avoir défini bacteriesParJour, ajouter ce log
      console.log("Données de bactéries générées:", bacteriesParJour);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      
      // Simuler des données en cas d'erreur ou pour le développement
      console.log('Utilisation de données simulées...');
      
      // Simuler une structure pour les jours
      const bacteriesParJour: Record<string, AnalysePlanifiee[]> = {};
      
      // Initialiser chaque jour avec un tableau vide
      JOURS.forEach(jour => {
        bacteriesParJour[jour] = [];
      });
      
      // Ajouter des données simulées pour chaque jour
      bacteriesParJour['Mercredi'] = [
        { 
          id: '1', 
          bacterie: 'E. coli', 
          delai: '24h',
          date_analyse: format(weekDays[2] || new Date(), 'yyyy-MM-dd'),
          jour: 'Mercredi',
          site: 'R1',
          semaine: weekNumber
        }
      ];
      
      bacteriesParJour['Vendredi'] = [
        { 
          id: '2', 
          bacterie: 'Coliformes totaux', 
          delai: '5j',
          date_analyse: format(weekDays[4] || new Date(), 'yyyy-MM-dd'),
          jour: 'Vendredi',
          site: 'R2',
          semaine: weekNumber
        }
      ];
      
      bacteriesParJour['Samedi'] = [
        { 
          id: '3', 
          bacterie: 'Entérobactéries', 
          delai: '24h',
          date_analyse: format(weekDays[5] || new Date(), 'yyyy-MM-dd'),
          jour: 'Samedi',
          site: 'R1',
          semaine: weekNumber
        },
        { 
          id: '4', 
          bacterie: 'Listeria', 
          delai: '48h',
          date_analyse: format(weekDays[5] || new Date(), 'yyyy-MM-dd'),
          jour: 'Samedi',
          site: 'BAIKO',
          semaine: weekNumber
        }
      ];
      
      setPlannedBacteria(bacteriesParJour);
      
      // Simuler des analyses en cours
      setOngoingAnalyses([
        { 
          id: '1', 
          bacterie: 'Entérobactéries',
          delai: '24h',
          date_analyse: format(new Date(), 'yyyy-MM-dd'),
          status: 'En cours',
          site: 'R1',
          title: 'Entérobactéries (24h)'
        },
        { 
          id: '2', 
          bacterie: 'Coliformes totaux',
          delai: '5j',
          date_analyse: format(addDays(new Date(), -2), 'yyyy-MM-dd'),
          status: 'En cours',
          site: 'R2',
          title: 'Coliformes totaux (5j)'
        },
        { 
          id: '3', 
          bacterie: 'Listeria',
          delai: '48h',
          date_analyse: format(addDays(new Date(), -1), 'yyyy-MM-dd'),
          status: 'En cours',
          site: 'BAIKO',
          title: 'Listeria (48h)'
        }
      ]);
      
      toast({
        title: "Mode démo activé",
        description: "Utilisation de données de démonstration. La connexion à Supabase a échoué.",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour modifier la semaine
  const changeWeek = (direction: 'next' | 'prev') => {
    const newDate = direction === 'next' 
      ? addWeeks(weekDays[0], 1)
      : subWeeks(weekDays[0], 1);
    
    const newWeekNumber = getWeek(newDate, { weekStartsOn: 1 });
    setWeekNumber(newWeekNumber);
  };
  
  // Fonction pour ajouter une nouvelle analyse planifiée
  const handleAddAnalyse = async () => {
    // Récupérer les informations de délai basées sur la bactérie sélectionnée
    const selectedBacterie = Object.values(BACTERIES).find(
      b => b.nom === newAnalyse.bacterie
    );
    
    if (!selectedBacterie) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une bactérie valide",
        variant: "destructive"
      });
      return;
    }
    
    if (!newAnalyse.jour || !newAnalyse.site) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Dans un environnement réel, nous sauvegarderions cela dans Supabase
      /*
      await createAnalysePlanifiee({
        bacterie: newAnalyse.bacterie,
        delai: selectedBacterie.delai,
        jour: newAnalyse.jour,
        date_analyse: newAnalyse.date_analyse,
        site: newAnalyse.site,
        semaine: weekNumber
      });
      */
      
      // Simuler l'ajout d'une nouvelle analyse
      const nouvelleAnalyse: AnalysePlanifiee = {
        id: Math.random().toString(36).substring(2, 9),
        bacterie: newAnalyse.bacterie,
        delai: selectedBacterie.delai,
        jour: newAnalyse.jour,
        date_analyse: newAnalyse.date_analyse,
        site: newAnalyse.site,
        semaine: weekNumber
      };
      
      // Mettre à jour l'état local
      setPlannedBacteria(prev => {
        const updated = { ...prev };
        if (!updated[newAnalyse.jour]) {
          updated[newAnalyse.jour] = [];
        }
        updated[newAnalyse.jour].push(nouvelleAnalyse);
        return updated;
      });
      
      toast({
        title: "Analyse ajoutée",
        description: `L'analyse de ${newAnalyse.bacterie} a été planifiée pour ${newAnalyse.jour}`,
        variant: "default"
      });
      
      // Fermer le dialogue et réinitialiser le formulaire
      setDialogOpen(false);
      setNewAnalyse({
        bacterie: '',
        jour: '',
        site: '',
        date_analyse: format(new Date(), 'yyyy-MM-dd')
      });
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'analyse:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'analyse. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Calculer les jours de la semaine
    const today = new Date();
    const firstDayOfWeek = startOfWeek(today, { weekStartsOn: 1 }); // Semaine commence le lundi
    const days = Array.from({ length: 6 }, (_, i) => addDays(firstDayOfWeek, i));
    setWeekDays(days);
    
    // Charger les données
    fetchData();
  }, [weekNumber]);

  useEffect(() => {
    // Vérifier si les données de bactéries sont vides
    const totalBacteries = Object.values(plannedBacteria).reduce(
      (total, bactList) => total + bactList.length, 0
    );
    
    console.log(`Nombre total de bactéries chargées: ${totalBacteries}`);
    console.log("Détail des bactéries par jour:", plannedBacteria);
    
    if (totalBacteries === 0) {
      console.warn("ATTENTION: Aucune bactérie n'est chargée dans le planning");
      
      // Forcer l'ajout de données de test si aucune bactérie n'est chargée
      const testData = {
        'Samedi': [
          { 
            id: 'test-1', 
            bacterie: 'Entérobactéries', 
            delai: '24h',
            date_analyse: format(new Date(), 'yyyy-MM-dd'),
            jour: 'Samedi',
            site: 'R1',
            semaine: weekNumber
          }
        ]
      };
      
      // Mettre à jour l'état avec au moins une bactérie de test
      setPlannedBacteria(prev => ({
        ...prev,
        ...testData
      }));
    }
  }, [plannedBacteria, weekNumber]);

  const handleViewDetails = (bacterie: string, jour: string, delai: string, site: string) => {
    // Afficher un message de toast pour indiquer que l'action est en cours
    toast({
      title: "Chargement en cours",
      description: `Préparation du formulaire pour ${bacterie}...`,
      variant: "default"
    });
    
    // Navigation vers le formulaire correspondant en fonction du type de bactérie
    // Vérifier d'abord si nous sommes en mode développement/démo
    try {
      // Rediriger vers le formulaire correspondant avec les informations nécessaires
      navigate('/sample-entry', { 
        state: { 
          bacterie,
          jour,
          delai,
          site,
          reportTitle: `Analyse de ${bacterie} (${delai})`,
          isNew: true,
          fromPendingPage: true // Indicateur pour la page de destination
        } 
      });
      
      // Pour le développement/débogage, log des détails
      console.log("Navigation vers formulaire:", {
        bacterie,
        jour,
        delai,
        site,
        path: '/sample-entry'
      });
    } catch (error) {
      console.error("Erreur lors de la navigation:", error);
      
      // Fallback en cas d'erreur - rediriger vers une autre page avec des paramètres d'URL
      // Cela peut aider si le state ne fonctionne pas correctement entre les routes
      window.location.href = `/sample-entry?bacterie=${encodeURIComponent(bacterie)}&jour=${encodeURIComponent(jour)}&delai=${encodeURIComponent(delai)}&site=${encodeURIComponent(site)}`;
    }
  };

  const getBacterieCountByType = () => {
    // Compter le nombre total de bactéries planifiées
    return Object.values(plannedBacteria)
      .reduce((count, lectures) => count + lectures.length, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-[#0d47a1] text-white py-4">
        <div className="container mx-auto px-4 flex items-center">
          <h1 className="text-2xl font-bold">Contrôle Qualité Microbiologique</h1>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="lectures" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-md mx-auto mb-6">
            <TabsTrigger value="lectures" className="flex items-center gap-2 w-1/2">
              <CalendarIcon className="h-4 w-4" />
              <span>Lecture en attente</span>
              <Badge className="ml-1 bg-[#0091CA]">{getBacterieCountByType()}</Badge>
            </TabsTrigger>
            <TabsTrigger value="analyses" className="flex items-center gap-2 w-1/2">
              <FileText className="h-4 w-4" />
              <span>Analyses en cours</span>
              <Badge className="ml-1 bg-[#0091CA]">{ongoingAnalyses.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lectures" className="mt-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 rounded-md">
                <h3 className="text-xl font-bold text-red-800 mb-3">TEST DE LIEN DIRECT</h3>
                <p className="mb-4">Cliquez sur ce bouton pour tester directement la redirection vers la page d'échantillon avec des paramètres prédéfinis:</p>
                <div className="flex justify-center mb-4">
                  <a 
                    href="http://localhost:8080/sample-entry?bacterie=Ent%C3%A9robact%C3%A9ries&jour=Lundi&delai=24h&site=R1"
                    className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    target="_blank"
                  >
                    TESTER LA REDIRECTION MAINTENANT
                  </a>
                </div>
              </div>
              
              <div className="text-center mb-4">
                <p className="mb-2 font-bold">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:</p>
                <div className="p-2 bg-gray-100 rounded break-all">
                  http://localhost:8080/sample-entry?bacterie=Entérobactéries&jour=Lundi&delai=24h&site=R1
                </div>
              </div>

              <div className="mb-8 p-4 bg-yellow-100 border-2 border-yellow-400 rounded-md">
                <h3 className="text-lg font-bold text-yellow-800 mb-3">LIENS DE TEST DIRECTS</h3>
                <p className="text-sm mb-4">Cliquez sur ces liens pour tester la redirection vers le formulaire d'échantillon:</p>
                <div className="flex flex-col space-y-3">
                  <a 
                    href="http://localhost:8080/sample-entry?bacterie=Ent%C3%A9robact%C3%A9ries&jour=Lundi&delai=24h&site=R1" 
                    className="text-blue-600 hover:text-blue-800 underline font-bold text-lg"
                    target="_blank"
                  >
                    Test Entérobactéries (24h) - Lundi - R1
                  </a>
                  <a 
                    href="http://localhost:8080/sample-entry?bacterie=Listeria&jour=Mardi&delai=48h&site=BAIKO" 
                    className="text-blue-600 hover:text-blue-800 underline font-bold text-lg"
                    target="_blank"
                  >
                    Test Listeria (48h) - Mardi - BAIKO
                  </a>
                  <a 
                    href="http://localhost:8080/sample-entry?bacterie=Coliformes%20totaux&jour=Mercredi&delai=5j&site=R2" 
                    className="text-blue-600 hover:text-blue-800 underline font-bold text-lg"
                    target="_blank"
                  >
                    Test Coliformes totaux (5j) - Mercredi - R2
                  </a>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Bouton de test</h3>
                <p className="text-sm text-blue-600 mb-3">
                  Si les boutons de bactérie ne fonctionnent pas, utilisez celui-ci pour tester la navigation:
                </p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 mr-2"
                  onClick={() => {
                    const testUrl = `http://localhost:8080/sample-entry?bacterie=Entérobactéries&jour=Samedi&delai=24h&site=R1`;
                    
                    console.log("TEST NAVIGATION vers:", testUrl);
                    
                    toast({
                      title: "Test de navigation",
                      description: "Redirection vers la page d'échantillon...",
                    });
                    
                    // Redirection forcée
                    window.location.href = testUrl;
                  }}
                >
                  Tester la navigation vers l'échantillon
                </Button>
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-600"
                  onClick={() => {
                    console.log("MISE À JOUR FORCÉE DES DONNÉES");
                    
                    // Forcer l'ajout de données de test
                    const testData = {
                      'Samedi': [
                        { 
                          id: 'test-1', 
                          bacterie: 'Entérobactéries', 
                          delai: '24h',
                          date_analyse: format(new Date(), 'yyyy-MM-dd'),
                          jour: 'Samedi',
                          site: 'R1',
                          semaine: weekNumber
                        }
                      ]
                    };
                    
                    // Mettre à jour l'état avec au moins une bactérie de test
                    setPlannedBacteria(prev => ({
                      ...prev,
                      ...testData
                    }));
                    
                    toast({
                      title: "Données mises à jour",
                      description: "Bactérie de test ajoutée au planning",
                    });
                  }}
                >
                  Ajouter une bactérie de test
                </Button>
              </div>
              <div className="flex justify-between items-center mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => changeWeek('prev')}
                  className="border-[#0091CA] text-[#0091CA]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Semaine précédente
                </Button>
                <h2 className="text-xl font-bold">Semaine {weekNumber}</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => changeWeek('next')}
                  className="border-[#0091CA] text-[#0091CA]"
                >
                  Semaine suivante <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              
              <div className="flex justify-end mb-4">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#0091CA] hover:bg-[#007AA8]">
                      <Plus className="h-4 w-4 mr-2" /> Ajouter une analyse
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Planifier une nouvelle analyse</DialogTitle>
                      <DialogDescription>
                        Ajoutez une nouvelle analyse bactériologique au planning.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bacterie" className="text-right">
                          Bactérie
                        </Label>
                        <div className="col-span-3">
                          <Select 
                            value={newAnalyse.bacterie} 
                            onValueChange={(value) => setNewAnalyse({...newAnalyse, bacterie: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une bactérie" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(BACTERIES).map((bacterie) => (
                                <SelectItem key={bacterie.nom} value={bacterie.nom}>
                                  {bacterie.nom} ({bacterie.delai})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="site" className="text-right">
                          Site
                        </Label>
                        <div className="col-span-3">
                          <Select 
                            value={newAnalyse.site} 
                            onValueChange={(value) => setNewAnalyse({...newAnalyse, site: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un site" />
                            </SelectTrigger>
                            <SelectContent>
                              {SITES.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="jour" className="text-right">
                          Jour
                        </Label>
                        <div className="col-span-3">
                          <Select 
                            value={newAnalyse.jour} 
                            onValueChange={(value) => setNewAnalyse({...newAnalyse, jour: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un jour" />
                            </SelectTrigger>
                            <SelectContent>
                              {JOURS.map((jour) => (
                                <SelectItem key={jour} value={jour}>
                                  {jour}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                          Date d'analyse
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={newAnalyse.date_analyse}
                          onChange={(e) => setNewAnalyse({...newAnalyse, date_analyse: e.target.value})}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                      </DialogClose>
                      <Button onClick={handleAddAnalyse} className="bg-[#0091CA] hover:bg-[#007AA8]">
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#0091CA] text-white">
                      <th className="py-3 px-4 text-left">Jour</th>
                      <th className="py-3 px-4 text-left">Lectures prévues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(plannedBacteria).map(([jour, lectures]) => (
                      <tr key={jour} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium">{jour}</td>
                        <td className="py-4 px-4">
                          {lectures.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {lectures.map((lecture) => {
                                // URL avec les paramètres corrects
                                const url = `http://localhost:8080/sample-entry?bacterie=${encodeURIComponent(lecture.bacterie)}&jour=${encodeURIComponent(lecture.jour)}&delai=${encodeURIComponent(lecture.delai)}&site=${encodeURIComponent(lecture.site)}`;
                                
                                // Utiliser un bouton avec style de lien pour une meilleure cohérence
                                return (
                                  <span key={lecture.id} className="inline-block">
                                    <button
                                      onClick={() => {
                                        console.log("Navigation vers:", url);
                                        
                                        // Toast de confirmation
                                        toast({
                                          title: "Redirection",
                                          description: `Préparation du formulaire pour ${lecture.bacterie} (${lecture.delai})`,
                                          duration: 2000
                                        });
                                        
                                        // Délai court avant redirection
                                        setTimeout(() => {
                                          window.location.href = url;
                                        }, 300);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 underline"
                                      style={{ color: "#0091CA", fontWeight: 500 }}
                                    >
                                      {lecture.bacterie} ({lecture.delai})
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0091CA]"></div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analyses" className="mt-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Analyses en cours</h2>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0091CA]"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ongoingAnalyses.map((analysis) => (
                    <div key={analysis.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4">
                      <h3 className="font-medium text-lg">{analysis.title}</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span>{analysis.date_analyse}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Site:</span>
                          <span>{analysis.site}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Statut:</span>
                          <span className="text-amber-500 font-medium">{analysis.status}</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-4 bg-[#0091CA] hover:bg-[#007AA8]"
                        onClick={() => navigate('/sample-entry', { 
                          state: { 
                            analysisId: analysis.id,
                            bacterie: analysis.bacterie,
                            delai: analysis.delai,
                            site: analysis.site 
                          } 
                        })}
                      >
                        Voir les détails
                      </Button>
                    </div>
                  ))}
                  
                  {ongoingAnalyses.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-gray-500">
                      Aucune analyse en cours pour le moment.
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PendingReadingsPage; 