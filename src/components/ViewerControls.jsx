import React from 'react';

/**
 * ViewerControls Component
 * Provides camera controls for 3Dmol.js molecular viewer
 * Uses props-based interface for compatibility with fixed InteractiveViewer
 */
const ViewerControls = ({ viewer, onReset }) => {
  const handleReset = async () => {
    if (viewer) {
      try {
        // Check if we have a real 3Dmol viewer or mock viewer
        if (viewer.viewer) {
          // Real 3Dmol viewer
          await viewer.resetView();
        } else {
          // Mock viewer
          console.log('Mock viewer reset');
        }
      } catch (error) {
        console.error('Error resetting view:', error);
      }
    }

    if (onReset) {
      onReset();
    }
  };

  const handleToggleRepresentation = async (type) => {
    if (viewer) {
      try {
        // Check if we have a real 3Dmol viewer or mock viewer
        if (viewer.viewer) {
          // Real 3Dmol viewer
          console.log(`Toggling ${type} representation in 3Dmol viewer`);

          // For 3Dmol.js, we would need to track representations differently
          // This is a simplified implementation
          if (type === 'cartoon') {
            // Toggle cartoon representation
            const hasCartoon = Array.from(viewer.models.values()).some(model => model.type === 'protein');
            if (hasCartoon) {
              // Remove cartoon representations
              const proteinModels = [];
              for (const [modelId, model] of viewer.models) {
                if (model.type === 'protein') {
                  proteinModels.push(modelId);
                }
              }
              for (const modelId of proteinModels) {
                viewer.clearRepresentations(modelId);
              }
            } else {
              // Add cartoon representation (would need to reload protein)
              console.log('Would reload protein with cartoon representation');
            }
          } else if (type === 'ball-and-stick') {
            // Toggle ball-and-stick representation
            const hasBallAndStick = Array.from(viewer.models.values()).some(model => model.type === 'ligand');
            if (hasBallAndStick) {
              // Remove ball-and-stick representations
              const ligandModels = [];
              for (const [modelId, model] of viewer.models) {
                if (model.type === 'ligand') {
                  ligandModels.push(modelId);
                }
              }
              for (const modelId of ligandModels) {
                viewer.clearRepresentations(modelId);
              }
            } else {
              // Add ball-and-stick representation (would need to reload ligand)
              console.log('Would reload ligand with ball-and-stick representation');
            }
          }
        } else {
          // Mock viewer
          console.log(`Mock toggling ${type} representation`);
        }
      } catch (error) {
        console.error('Error toggling representation:', error);
      }
    }
  };

  const handleSpin = async () => {
    if (viewer) {
      try {
        // Check if we have a real 3Dmol viewer or mock viewer
        if (viewer.viewer) {
          // Real 3Dmol viewer - toggle spinning
          const isSpinning = viewer.viewer.isSpinning?.() || false;
          viewer.setSpin(!isSpinning, 1);
        } else {
          // Mock viewer
          console.log('Mock toggling spin');
        }
      } catch (error) {
        console.error('Error toggling spin:', error);
      }
    }
  };

  const handleZoomToFit = async () => {
    if (viewer) {
      try {
        // Check if we have a real 3Dmol viewer or mock viewer
        if (viewer.viewer) {
          // Real 3Dmol viewer
          await viewer.zoomTo();
        } else {
          // Mock viewer
          console.log('Mock zoom to fit');
        }
      } catch (error) {
        console.error('Error zooming to fit:', error);
      }
    }
  };

  return (
    <div className="control-panel">
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">View Controls</h3>
        <div className="space-y-3">
          {/* Camera Controls */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Camera</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Reset View
              </button>
              <button
                onClick={handleZoomToFit}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Zoom to Fit
              </button>
              <button
                onClick={handleSpin}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Toggle Spin
              </button>
            </div>
          </div>

          {/* Representation Controls */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Representations</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handleToggleRepresentation('cartoon')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Toggle Cartoon
              </button>
              <button
                onClick={() => handleToggleRepresentation('ball-and-stick')}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                Toggle Ball & Stick
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerControls;
