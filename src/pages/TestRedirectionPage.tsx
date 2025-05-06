import React from 'react';

/**
 * Page simple de test pour la redirection vers la page d'échantillon.
 * Utilisez cette page pour tester le passage des paramètres d'URL.
 */
const TestRedirectionPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-center mb-8 text-red-600">
          Page de Test de Redirection
        </h1>
        
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-center">Cliquez sur un des liens ci-dessous pour tester:</h2>
          
          <div className="grid gap-4">
            <a 
              href="http://localhost:8080/sample-entry?bacterie=Entérobactéries&jour=Lundi&delai=24h&site=R1" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-center text-lg"
              target="_blank"
            >
              Test 1: Entérobactéries (24h)
            </a>
            
            <a 
              href="http://localhost:8080/sample-entry?bacterie=Levures%20et%20Moisissures&jour=Mardi&delai=5j&site=R2" 
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-center text-lg"
              target="_blank"
            >
              Test 2: Levures et Moisissures (5j)
            </a>
            
            <a 
              href="http://localhost:8080/sample-entry?bacterie=Flore%20Totale&jour=Mercredi&delai=48h&site=R3" 
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-center text-lg"
              target="_blank"
            >
              Test 3: Flore Totale (48h)
            </a>
            
            <button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-center text-lg"
              onClick={() => {
                const testUrl = 'http://localhost:8080/sample-entry?bacterie=Entérobactéries&jour=Lundi&delai=24h&site=R1';
                window.open(testUrl, '_blank');
                alert('Ouverture de la page dans un nouvel onglet');
              }}
            >
              BOUTON JAVASCRIPT - Test Entérobactéries
            </button>
          </div>
        </div>
        
        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-6">
          <h3 className="font-bold mb-3">Liens directs (à copier-coller):</h3>
          
          <div className="space-y-3">
            <div className="p-2 bg-white rounded break-all text-sm">
              http://localhost:8080/sample-entry?bacterie=Entérobactéries&jour=Lundi&delai=24h&site=R1
            </div>
            
            <div className="p-2 bg-white rounded break-all text-sm">
              http://localhost:8080/sample-entry?bacterie=Levures%20et%20Moisissures&jour=Mardi&delai=5j&site=R2
            </div>
            
            <div className="p-2 bg-white rounded break-all text-sm">
              http://localhost:8080/sample-entry?bacterie=Flore%20Totale&jour=Mercredi&delai=48h&site=R3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRedirectionPage; 