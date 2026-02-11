import React, { useRef, useEffect, useCallback } from 'react';
import { useViewer } from '../context/ViewerContext.jsx';

/**
 * MolStarViewer Component
 * Handles the initialization and management of the Mol* molecular viewer
 * Provides a clean interface for molecular visualization with proper lifecycle management
 */
const MolStarViewer = () => {
  const viewerRef = useRef(null);
  const reactRootRef = useRef(null);
  const pluginRef = useRef(null);
  const isInitializedRef = useRef(false);
  
  const { state, actions } = useViewer();
  const { viewer, isLoading } = state;
  const { setViewer, setLoading, setError, setNarrative } = actions;

  /**
   * Initializes the Mol* viewer with proper configuration
   * Sets up the plugin, loads the initial protein structure, and configures interactions
   */
  const initializeViewer = useCallback(async () => {
    try {
      console.log('Initializing Mol* viewer...');
      console.log(`Viewer ref: ${!!viewerRef.current}`);
      
      // Prevent double initialization in React 18 StrictMode
      if (!viewerRef.current || viewer || isInitializedRef.current) {
        return;
      }

      isInitializedRef.current = true;

      // Import React and ReactDOM for proper rendering
      const ReactDOM = await import('react-dom/client');
      
      // Import Molstar dynamically with correct paths
      const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
      const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
      
      console.log('Molstar modules loaded successfully');
      
      // Create a proper render function using ReactDOM
      const render = (element) => {
        // Clear the container first
        viewerRef.current.innerHTML = '';
        // Create or reuse root and render the element
        if (!reactRootRef.current) {
          reactRootRef.current = ReactDOM.createRoot(viewerRef.current);
        }
        reactRootRef.current.render(element);
      };
      
      // Create Molstar plugin with comprehensive configuration
      const plugin = await createPluginUI({
        target: viewerRef.current,
        render: render,
        layoutIsExpanded: false,
        layoutShowControls: false,
        layoutShowRemoteState: false,
        viewportShowExpand: false,
        viewportShowControls: true, // Enable viewport controls for interactions
        viewportShowTrajectoryControls: false,
        pixelScale: 1,
        backgroundColor: 'black',
        // Hide Mol* default overlays
        showAnimationWarnings: false,
        showPerformanceWarnings: false,
        showTiming: false,
        canvas3d: {
          pixelScale: 1,
          transparency: 'blended',
          postprocessing: {
            occlusion: {
              enable: true,
              strength: 0.3,
              radiusScale: 1.5,
              bias: 0.8,
              blurKernelSize: 5
            },
            outline: {
              enable: true,
              scale: 1,
              color: [0, 0, 0, 1],
              threshold: 0.33,
              includeTransparent: false
            }
          },
          // Enable interaction helper
          interaction: {
            trackball: {
              enable: true,
              noZoom: false,
              noPan: false,
              noRotate: false
            }
          }
        }
      });

      console.log('Molstar plugin created');
      console.log(`Plugin state exists: ${!!plugin.state}`);
      console.log(`Plugin canvas3d exists: ${!!plugin.canvas3d}`);

      // Wait a bit for the plugin to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Load PDB structure using proper Molstar syntax
      console.log('Loading PDB structure...');
      const data = await plugin.builders.data.download({
        url: '/assets/pdb/3FLY.pdb',
        isBinary: false
      });
      
      const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
      const model = await plugin.builders.structure.createModel(trajectory);
      const structure = await plugin.builders.structure.createStructure(model);
      
      await plugin.builders.structure.representation.addRepresentation(structure, {
        type: 'cartoon',
        color: 'chain-id',
        params: {}
      });

      console.log('PDB structure loaded successfully');

      // Set camera position
      await PluginCommands.Camera.Reset(plugin, {});

      console.log('Camera reset complete');

      setViewer(plugin);
      pluginRef.current = plugin;
      setLoading(false);
      
      console.log('Viewer set to plugin successfully');
      
      // Set initial narrative
      setNarrative('P38 MAP Kinase structure loaded successfully. The protein is shown in cartoon representation with the ATP-binding pocket visible in the center.');
      
      // Setup interactions after a short delay to ensure DOM is ready
      setTimeout(async () => {
        if (plugin && viewerRef.current) {
          console.log('Setting up interactions...');
          
          // Find the canvas element
          const canvas = viewerRef.current.querySelector('canvas');
          if (canvas) {
            console.log('Canvas found for interaction setup');
            
            // Make canvas focusable
            canvas.tabIndex = 0;
            canvas.style.outline = 'none';
            
            // Focus the canvas to enable interactions
            canvas.focus();
            
            // Verify input system is ready
            if (plugin.canvas3d && plugin.canvas3d.input) {
              console.log('Input system found and ready');
            }
            
            console.log('Canvas interaction setup complete');
          } else {
            console.log('Canvas not found for interaction setup');
          }
        }
      }, 500);

    } catch (error) {
      console.error(`ERROR: ${error.message}`);
      console.log('Falling back to mock viewer due to error');
      setLoading(false);
      setError(error.message);
      setNarrative('Molecular viewer initialization failed. Falling back to demo mode.');
      
      // Create fallback mock viewer
      const mockViewer = {
        loadStructureFromUrl: async (url, format, options) => {
          console.log(`Mock loading structure from ${url} as ${format}`, options);
          return Promise.resolve();
        },
        camera: {
          reset: async () => {
            console.log('Mock camera reset');
            return Promise.resolve();
          },
          focus: async () => {
            console.log('Mock camera focused');
            return Promise.resolve();
          }
        },
        removeRepresentationsOfType: async (type) => {
          console.log(`Mock removing representations of type: ${type}`);
          return Promise.resolve();
        },
        dispose: () => {
          console.log('Mock viewer disposed');
        }
      };
      setViewer(mockViewer);
    }
  }, [viewer, setViewer, setLoading, setError, setNarrative]);

  /**
   * Cleanup function for proper resource management
   * Disposes of React root and Mol* plugin to prevent memory leaks
   */
  const cleanup = useCallback(() => {
    console.log('Cleaning up viewer...');
    
    setTimeout(() => {
      if (reactRootRef.current) {
        reactRootRef.current.unmount();
        reactRootRef.current = null;
      }
      
      if (pluginRef.current) {
        try {
          pluginRef.current.dispose();
          console.log('Mol* plugin disposed');
        } catch (e) {
          console.log(`Plugin dispose failed: ${e.message}`);
        }
        pluginRef.current = null;
      }
      
      isInitializedRef.current = false;
      console.log('Cleanup complete');
    }, 0);
  }, []);

  // Initialize viewer on component mount
  useEffect(() => {
    if (!isLoading && !viewer) {
      initializeViewer();
    }
    
    return cleanup;
  }, [initializeViewer, cleanup, isLoading, viewer]);

  return (
    <div className="viewer-container">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-sm">Initializing molecular viewer...</p>
          </div>
        </div>
      )}
      <div 
        ref={viewerRef} 
        className="molstar-container w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default MolStarViewer;
