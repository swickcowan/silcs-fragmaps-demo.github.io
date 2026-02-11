import React from 'react';
import { ligandOptions } from '../config/ligandOptions.js';

/**
 * LigandSelector Component
 * Provides UI controls for selecting different ligand conformations
 * Uses props-based interface for compatibility with fixed InteractiveViewer
 */
const LigandSelector = ({ selectedLigand, onLigandSelect, ligandOptions, isLoading, loadingMessage }) => {
  const handleLigandClick = (ligandId) => {
    console.log(`🎯 [LIGAND SELECTOR] User clicked ligand: ${ligandId}`);
    console.log(`🎯 [LIGAND SELECTOR] Current selected: ${selectedLigand}`);
    console.log(`🎯 [LIGAND SELECTOR] Is loading: ${isLoading}`);
    
    if (isLoading) {
      console.log(`⚠️ [LIGAND SELECTOR] Ignoring click - currently loading`);
      return;
    }
    
    if (selectedLigand === ligandId) {
      console.log(`🔄 [LIGAND SELECTOR] Reloading same ligand: ${ligandId}`);
    } else {
      console.log(`🔄 [LIGAND SELECTOR] Switching from ${selectedLigand} to ${ligandId}`);
    }
    
    onLigandSelect(ligandId);
  };

  return (
    <div className="control-panel">
      <h3 className="text-lg font-semibold mb-4 text-white">Ligand Selection</h3>
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center text-blue-300">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300 mr-2"></div>
            <span className="text-sm">{loadingMessage}</span>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {ligandOptions.map((ligand) => {
          const isSelected = selectedLigand === ligand.id;
          
          return (
            <button
              key={ligand.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLigandClick(ligand.id);
              }}
              className={`w-full fragmap-button text-left text-sm transition-all duration-200 ${
                isSelected ? 'active' : 'inactive'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3 bg-gradient-to-br from-green-400 to-blue-500 border-2 border-white/50"></div>
                  <div>
                    <div className="font-medium">{ligand.name}</div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LigandSelector;
