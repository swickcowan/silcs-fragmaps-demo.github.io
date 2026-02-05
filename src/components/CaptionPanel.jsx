import React from 'react';

const CaptionPanel = ({ caption }) => {
  return (
    <div className="control-panel h-full">
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Current View</h4>
        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm text-gray-300 leading-relaxed">
            {caption || 'Select a ligand and toggle FragMaps to begin exploring the molecular interactions.'}
          </p>
        </div>
      </div>

      {/* Color Legend */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">FragMap Colors</h4>
        <div className="space-y-2">
          {[
            { color: '#ffeb3b', name: 'Hydrophobic', desc: 'Non-polar interactions' },
            { color: '#2196f3', name: 'H-Bond Donor', desc: 'Hydrogen bond donors' },
            { color: '#f44336', name: 'H-Bond Acceptor', desc: 'Hydrogen bond acceptors' },
            { color: '#4caf50', name: 'Positive Ion', desc: 'Cationic interactions' },
            { color: '#9c27b0', name: 'Negative Ion', desc: 'Anionic interactions' },
            { color: '#ff9800', name: 'Aromatic', desc: 'π-π stacking' }
          ].map((item) => (
            <div key={item.name} className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded-full mr-2 border border-white/30"
                style={{ backgroundColor: item.color }}
              ></div>
              <div>
                <span className="text-gray-300">{item.name}</span>
                <span className="text-gray-500 ml-1">({item.desc})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CaptionPanel;
