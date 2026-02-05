import React from 'react';

const ViewerControls = ({ viewer }) => {
  const handleReset = async () => {
    if (viewer) {
      try {
        if (viewer.state) {
          // Real Molstar viewer
          const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
          await PluginCommands.Camera.Reset(viewer, {});
        } else {
          // Mock viewer
          await viewer.camera.reset();
          await viewer.camera.focus();
        }
      } catch (error) {
        console.error('Error resetting camera:', error);
      }
    }
  };

  const handleSpin = async () => {
    if (viewer) {
      try {
        if (viewer.state) {
          // Real Molstar viewer
          const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
          const isAnimating = viewer.canvas3d?.context?.animation?.isAnimating;
          if (isAnimating) {
            await PluginCommands.Animation.Stop(viewer, {});
          } else {
            await PluginCommands.Animation.Play(viewer, {
              params: { name: 'spin' }
            });
          }
        } else {
          // Mock viewer
          const isSpinning = viewer.animation?.isAnimating;
          if (isSpinning) {
            await viewer.animation.stop();
          } else {
            await viewer.animation.rotate({ axis: 'y', speed: 0.5 });
          }
        }
      } catch (error) {
        console.error('Error toggling spin:', error);
      }
    }
  };

  const handleToggleRepresentation = async (type) => {
    if (viewer) {
      try {
        if (viewer.state) {
          // Real Molstar viewer
          const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
          
          // Find existing representations
          const representations = viewer.state.data.selectQ(q => q.ofType('representation-3d'));
          const hasRep = representations.some(rep => rep.transform?.params?.type === type);

          if (hasRep) {
            // Remove representation
            await PluginCommands.State.RemoveObject(viewer, { 
              state: viewer.state.data, 
              ref: representations.find(rep => rep.transform?.params?.type === type)?.ref 
            });
          } else {
            // Add representation
            await PluginCommands.State.Update(viewer, {
              state: viewer.state.data,
              tree: {
                name: `${type}-rep`,
                type: 'mol-star',
                transform: [
                  { type: 'create-structure-representation', params: {
                    type,
                    color: type === 'cartoon' ? 'chain-id' : 'element',
                    params: type === 'ball-and-stick' ? { size: 0.1 } : {}
                  }}
                ]
              }
            });
          }
        } else {
          // Mock viewer
          const structures = viewer.structure?.data;
          if (structures && structures.length > 0) {
            const protein = structures[0]; // Assume first structure is protein
            
            // Toggle representation
            const existingReps = viewer.representation?.all || [];
            const hasRep = existingReps.some(rep => 
              rep.type === type && rep.structure === protein
            );

            if (hasRep) {
              await viewer.removeRepresentationsOfType(type);
            } else {
              await viewer.loadStructureFromUrl(
                '/assets/pdb/3FLY.pdb',
                'pdb',
                { representation: type, color: type === 'cartoon' ? 'chain-id' : 'element' }
              );
            }
          }
        }
      } catch (error) {
        console.error('Error toggling representation:', error);
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
            </div>
          </div>

        {/* Representation Controls */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Protein Style</h4>
          <div className="space-y-2">
            <button
              onClick={() => handleToggleRepresentation('cartoon')}
              className="w-full fragmap-button inactive text-xs text-left"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                Cartoon Representation
              </div>
            </button>
            <button
              onClick={() => handleToggleRepresentation('ball-and-stick')}
              className="w-full fragmap-button inactive text-xs text-left"
            >
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                Ball & Stick
              </div>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerControls;
