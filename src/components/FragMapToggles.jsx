import React, { memo } from 'react';
import IsoValueSlider from './IsoValueSlider';
import { fragMapTypes, fragMapDefaults } from '../config/fragMapTypes.js';

/**
 * FragMapToggles Component
 * Provides UI controls for toggling FragMap visibility and adjusting isovalues
 * Uses props-based interface for compatibility with fixed InteractiveViewer
 */
const FragMapToggles = memo(({ 
  activeFragMaps, 
  onToggleFragMap, 
  fragMapTypes, 
  isoValues, 
  onIsoValueChange,
  selectedProteinPart
}) => {
  return (
    <div className="control-panel">
      <h3 className="text-lg font-semibold mb-4 text-white leading-relaxed">SILCS FragMaps</h3>
      
      {!selectedProteinPart || !selectedProteinPart.residues || selectedProteinPart.residues.length === 0 ? (
        <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-sm text-yellow-200">
            <span className="font-semibold">Instructions:</span> Click on a protein part first to select it, then enable FragMaps to see interaction sites for that specific region.
          </p>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-sm text-green-200">
            <span className="font-semibold">Region Selected:</span> {selectedProteinPart.description}
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        {fragMapTypes.map((fragMap) => {
          const isActive = activeFragMaps.has(fragMap.id);
          const currentIsoValue = isoValues[fragMap.id] || fragMap.isoValue;
          const isDisabled = !selectedProteinPart || !selectedProteinPart.residues || selectedProteinPart.residues.length === 0;
          
          return (
            <div
              key={fragMap.id}
              className="space-y-2"
            >
              <button
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                    return;
                  }
                  console.log(`🖱️ BUTTON CLICKED: ${fragMap.id}`);
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFragMap(fragMap.id);
                }}
                disabled={isDisabled}
                className={`w-full fragmap-button text-left text-sm transition-colors ${
                  isActive ? 'active' : 'inactive'
                } ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'
                }`}
                title={isDisabled ? 'Select a protein part first' : `Toggle ${fragMap.name} FragMap`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3 border-2 border-white/50"
                      style={{ backgroundColor: fragMap.color }}
                    ></div>
                    <div>
                      <div className="font-medium">{fragMap.name}</div>
                      <div className="text-xs text-gray-400">{fragMap.description}</div>
                      {isActive && fragMap.bindingRelevance && (
                        <div className="text-xs text-blue-400 mt-1 italic">{fragMap.bindingRelevance}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {isActive && (
                      <div
                        className="w-2 h-2 bg-green-400 rounded-full mr-2"
                      />
                    )}
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isActive ? 'rotate-180' : ''
                      }`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7" 
                      />
                    </svg>
                  </div>
                </div>
              </button>
              
              {/* IsoValue Slider - only show when active */}
              {isActive && (
                <div 
                  className="pl-7 pr-2"
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  <IsoValueSlider
                    label="Isovalue"
                    value={currentIsoValue}
                    onChange={(value) => onIsoValueChange(fragMap.id, value)}
                    min={fragMap.minIsoValue || fragMapDefaults.minIsoValue}
                    max={fragMap.maxIsoValue || fragMapDefaults.maxIsoValue}
                    step={fragMapDefaults.isoValueStep}
                    color={fragMap.color}
                    presetValues={fragMapDefaults.presetValues}
                  />
                </div>
              )}
            </div>
          );
        })}
        
        </div>
    </div>
  );
});

export default FragMapToggles;
