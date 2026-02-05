import React, { memo } from 'react';
import IsoValueSlider from './IsoValueSlider';

const FragMapToggles = memo(({ 
  activeFragMaps, 
  onToggleFragMap, 
  fragMapTypes, 
  isoValues, 
  onIsoValueChange 
}) => {
  return (
    <div className="control-panel">
      <h3 className="text-lg font-semibold mb-4 text-white">SILCS FragMaps</h3>
      
      <div className="space-y-3">
        {fragMapTypes.map((fragMap) => {
          const isActive = activeFragMaps.has(fragMap.id);
          const currentIsoValue = isoValues[fragMap.id] || fragMap.isoValue;
          
          return (
            <div
              key={fragMap.id}
              className="space-y-2"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleFragMap(fragMap.id);
                }}
                className={`w-full fragmap-button text-left text-sm transition-colors ${
                  isActive ? 'active' : 'inactive'
                }`}
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
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    color={fragMap.color}
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
