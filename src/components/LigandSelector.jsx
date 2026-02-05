import React from 'react';

const LigandSelector = ({ selectedLigand, onLigandChange, ligandOptions }) => {
  const handleLigandClick = (ligandId) => {
    console.log('Ligand clicked:', ligandId);
    onLigandChange(ligandId);
  };

  return (
    <div className="control-panel">
      <h3 className="text-lg font-semibold mb-4 text-white">Ligand Selection</h3>
      
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
              className={`w-full fragmap-button text-left text-sm ${
                isSelected ? 'active' : 'inactive'
              }`}
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
