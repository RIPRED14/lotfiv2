import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Plus, 
  History,
  ArrowUpToLine,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SampleActionButtonsProps {
  onSave: () => void;
  onAdd?: () => void;
  onCancel?: () => void;
  onSendToTechnician?: () => void;
  showSendButton?: boolean;
  showAddButton?: boolean;
  selectedSamples?: number;
  isLoading?: boolean;
}

const SampleActionButtons: React.FC<SampleActionButtonsProps> = ({
  onSave,
  onAdd,
  onCancel,
  onSendToTechnician,
  showSendButton = false,
  showAddButton = true,
  selectedSamples = 0,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCoordinator = user?.role === 'coordinator';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onSave}
              disabled={isLoading}
              size="lg"
              className="bg-green-600 hover:bg-green-700 font-semibold px-6 flex items-center shadow-md"
            >
              <Save className="w-5 h-5 mr-2" />
              <span className="mr-1">Enregistrer</span>
              {isLoading && <span className="animate-pulse">...</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Enregistrer les modifications</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showAddButton && onAdd && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                onClick={onAdd}
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un échantillon
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ajouter un nouvel échantillon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {showSendButton && onSendToTechnician && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                onClick={onSendToTechnician}
                disabled={isLoading || selectedSamples === 0}
                className={`bg-blue-600 hover:bg-blue-700 ${selectedSamples === 0 ? 'opacity-70' : ''}`}
              >
                <ArrowUpToLine className="w-4 h-4 mr-2" />
                {selectedSamples > 0 ? 
                  `Envoyer ${selectedSamples} échantillon${selectedSamples > 1 ? 's' : ''}` : 
                  'Envoyer au technicien'
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{selectedSamples > 0 ? 
                `Envoyer ${selectedSamples} échantillon(s) au technicien` :
                'Sélectionnez au moins un échantillon à envoyer'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {onCancel && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-gray-300 text-gray-600"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Annuler les modifications</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={() => navigate('/history')}
            variant="ghost"
            className="hover:bg-gray-100 transition-all duration-200"
          >
            <History className="w-4 h-4 mr-2" />
            Historique
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Voir l'historique des modifications</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default SampleActionButtons;
