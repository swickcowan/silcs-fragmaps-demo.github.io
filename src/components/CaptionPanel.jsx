import React from 'react';
import { fragMapLegend } from '../config/fragMapTypes.js';
import { useViewer } from '../context/ViewerContext.jsx';

/**
 * CaptionPanel Component
 * Displays current view information and FragMap color legend
 * Uses props-based interface for compatibility with fixed InteractiveViewer
 */
const CaptionPanel = ({ caption }) => {
  const { state } = useViewer();
  const { activeFragMaps, selectedLigand } = state;
  
  // Generate footer-style display matching the exact footer rendering
  const generateCurrentViewText = () => {
    const activeCount = activeFragMaps.size;
    const ligandName = selectedLigand === 'crystal' ? 'Crystal Ligand' : 
                      selectedLigand === 'sil1' ? 'SILCS-MC Pose 1' : 
                      selectedLigand === 'sil2' ? 'SILCS-MC Pose 2' : 'Crystal Ligand';
    
    return (
      <div className="flex items-center space-x-4 text-sm text-gray-400">
        <span className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          P38 MAP Kinase (3FLY)
        </span>
        <span className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          {activeCount} Active FragMaps
        </span>
        <span className="flex items-center">
          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
          {ligandName}
        </span>
      </div>
    );
  };

  return (
    <div className="control-panel h-full">
      {/* Current View Description */}
      <div className="p-4">
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            P38 MAP Kinase (3FLY)
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            {activeFragMaps.size} Active FragMaps
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            {selectedLigand === 'crystal' ? 'Crystal Ligand' : 
             selectedLigand === 'sil1' ? 'SILCS-MC Pose 1' : 
             selectedLigand === 'sil2' ? 'SILCS-MC Pose 2' : 'Crystal Ligand'}
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-2">FragMap Colors</h4>
        <div className="space-y-2">
          {fragMapLegend.map((item) => (
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
