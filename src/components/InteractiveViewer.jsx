import React, { useRef, useEffect, useState, useCallback } from 'react';
import FragMapManager from './FragMapManager';
import FragMapToggles from './FragMapToggles';
import LigandSelector from './LigandSelector';
import CaptionPanel from './CaptionPanel';
import { useViewer } from '../context/ViewerContext';
import { loadFragMapData } from '../utils/fragMapLoader';
import { fragMapTypes } from '../config/fragMapTypes';
import { ligandOptions } from '../config/ligandOptions';
import { detectProteinRegion, getRegionDescription } from '../utils/proteinRegionAnalyzer';
import { create3DmolViewer, createMockViewer } from '../utils/3dmolViewer';

const InteractiveViewer = () => {
  const { state, actions } = useViewer();
  const viewer = state.viewer;
  const setViewer = actions.setViewer;
  const setProteinPart = actions.setProteinPart;
  const setProteinSelectionBounds = actions.setProteinSelectionBounds;
  const setNarrative = actions.setNarrative;
  const viewerRef = useRef(null);
  const viewerWrapperRef = useRef(null);
  const isInitializedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 5;

  // Use context state or fall back to local state for compatibility
  const [isLoading, setIsLoading] = useState(state.isLoading);
  const [selectedLigand, setSelectedLigand] = useState(state.selectedLigand || ligandOptions[0]?.id || '');
  const [currentNarrative, setCurrentNarrative] = useState(state.currentNarrative || '');

  // Initialize 3Dmol.js viewer
  useEffect(() => {

    // Prevent double initialization in React 18 StrictMode
    if (!viewerRef.current || viewer || isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    const initViewer = async () => {
      try {
        console.log('Initializing 3Dmol.js viewer...');
        console.log(`Viewer ref: ${!!viewerRef.current}`);

        // Create 3Dmol viewer
        const viewerWrapper = await create3DmolViewer(viewerRef.current, {
          backgroundColor: 'black',
          antialias: true,
          quality: 'high'
        });

        console.log('3Dmol.js viewer created successfully');
        console.log('Viewer wrapper methods:', Object.keys(viewerWrapper));

        // Load PDB structure
        console.log('Loading PDB structure...');
        const proteinModelId = await viewerWrapper.loadProtein('/assets/pdb/3FLY.pdb');
        console.log('Protein model loaded:', proteinModelId);

        // Create cartoon representation for protein
        console.log('Creating cartoon representation...');
        const cartoonRepId = await viewerWrapper.addCartoonRepresentation(proteinModelId, {
          colorscheme: 'spectrum',
          opacity: 1.0
        });
        console.log('Cartoon representation created:', cartoonRepId);

        // Render the scene
        viewerWrapper.render();

        // Set the viewer wrapper as viewer
        viewerWrapperRef.current = viewerWrapper;
        setViewer(viewerWrapper);
        setIsLoading(false);

        // Set initial narrative
        setCurrentNarrative('P38 MAP Kinase structure loaded successfully. Click on any part of the protein to select it, then enable FragMaps to see interaction sites for that specific region.');

        // Setup interactions after a delay to ensure 3Dmol is fully ready
        setTimeout(() => {
          if (viewerWrapper && viewerRef.current) {
            console.log('Setting up interactions...');
            console.log('Viewer wrapper state:', viewerWrapper.getState());

            // Find the canvas element
            const canvas = viewerRef.current?.querySelector('canvas');
            if (!canvas) {
              console.log('❌ No canvas found in viewerRef');
              return;
            }

            console.log('✅ Canvas found:', canvas);
            console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
            if (canvas) {
              console.log('Canvas found for interaction setup');

              // Make canvas focusable
              canvas.tabIndex = 0;
              canvas.style.outline = 'none';

              // Focus the canvas to enable interactions
              canvas.focus();

              // Add protein selection click handler
              canvas.addEventListener('click', async (event) => {
                console.log('🖱️ [INTERACTIVE-VIEWER] Canvas clicked, detecting protein region...');

                // Get click position relative to canvas
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                console.log(`🖱️ [INTERACTIVE-VIEWER] Click position: x=${x}, y=${y}`);

                try {
                  // Use enhanced protein region detection
                  const proteinRegion = await detectProteinRegion(viewerWrapper, x, y);

                  if (proteinRegion && proteinRegion.residues.length > 0) {
                    console.log(`✅ [INTERACTIVE-VIEWER] Protein region detected!`);
                    console.log(`📊 [INTERACTIVE-VIEWER] Found ${proteinRegion.residues.length} residues`);
                    console.log(`📍 [INTERACTIVE-VIEWER] Bounds:`, proteinRegion.bounds);

                    // Update context with selection information
                    setProteinPart({
                      residues: proteinRegion.residues,
                      description: `Selected ${getRegionDescription(proteinRegion.residues)}${proteinRegion.isDummy ? ' (demo mode)' : ''}`,
                      loci: proteinRegion.loci,
                      isDummy: proteinRegion.isDummy || false
                    });
                    setProteinSelectionBounds(proteinRegion.bounds);

                    // Update narrative with specific region information
                    const regionDesc = getRegionDescription(proteinRegion.residues);
                    const narrativePrefix = proteinRegion.isDummy ?
                      'Demo mode: Using sample protein region for testing. ' :
                      'Selected protein region: ';

                    setCurrentNarrative(
                      `${narrativePrefix}${regionDesc}. FragMaps will now render specifically for this area. ` +
                      `The system found ${proteinRegion.residues.length} residues within the selection. ` +
                      `Adjust isovalues to refine the visualization of interaction sites.` +
                      (proteinRegion.isDummy ? ' The actual protein structure detection will be available in a future update.' : '')
                    );

                    // Clear existing fragmaps when new selection is made
                    actions.clearFragMaps();

                  } else {
                    console.log(`❌ [INTERACTIVE-VIEWER] No protein region detected at click position`);

                    // Set a helpful message for the user
                    setCurrentNarrative(
                      'No protein region detected at this position. Try clicking directly on the protein structure. ' +
                      'The protein is shown as a cartoon representation - click on any part of the colored ribbons. ' +
                      'If the issue persists, the molecular viewer may still be loading - please wait a moment and try again.'
                    );
                  }

                } catch (error) {
                  console.error('❌ [INTERACTIVE-VIEWER] Error handling protein selection:', error);

                  // Provide helpful error message
                  setCurrentNarrative(
                    'Error detecting protein region. The molecular viewer may still be loading. ' +
                    'Please wait a moment and try clicking on the protein structure again.'
                  );
                }
              });

              console.log('Canvas interaction setup complete');
            } else {
              console.log('Canvas not found for interaction setup');
            }
          }
        }, 2000); // Wait 2 seconds for proper initialization

      } catch (error) {
        console.error(`ERROR: ${error.message}`);
        console.log('Falling back to mock viewer due to error');
        setIsLoading(false);
        setCurrentNarrative('3Dmol.js viewer initialization failed. Falling back to demo mode.');

        // Fallback to mock viewer
        const mockViewer = createMockViewer();
        viewerWrapperRef.current = mockViewer;
        setViewer(mockViewer);
      }
    };

    initViewer();

    return () => {
      // Clean up 3Dmol viewer
      console.log('Cleaning up viewer...');

      setTimeout(() => {
        if (viewerWrapperRef.current) {
          try {
            viewerWrapperRef.current.dispose();
            console.log('3Dmol.js viewer disposed');
          } catch (e) {
            console.log(`Viewer dispose failed: ${e.message}`);
          }
          viewerWrapperRef.current = null;
        }

        isInitializedRef.current = false;
        console.log('Cleanup complete');
      }, 0);
    };
  }, []);

  // Load ligand with 3Dmol.js
  const loadLigand = useCallback(async (ligandId) => {
    if (!viewer) {
      console.log('No viewer available, skipping ligand load');
      return;
    }

    try {
      const ligand = ligandOptions.find(l => l.id === ligandId);
      if (!ligand) {
        console.log('❌ Ligand not found:', ligandId);
        return;
      }

      console.log('✅ Found ligand:', ligand);
      console.log('Loading ligand:', ligand.name, 'from file:', ligand.file);

      // Check if we have a real 3Dmol viewer (has a non-null .viewer property)
      if (viewer.viewer) {
        // Real 3Dmol viewer - use enhanced visualization
        console.log('✅ Real 3Dmol viewer detected');
        console.log('Loading ligand with 3Dmol visualization');

        // Clear existing ligands
        try {
          console.log('🧹 Clearing existing ligand representations...');
          const ligandModels = [];

          // Find ligand models
          for (const [modelId, model] of viewer.models) {
            if (model.type === 'ligand') {
              ligandModels.push(modelId);
            }
          }

          // Remove ligand models
          for (const modelId of ligandModels) {
            console.log('🗑️ Removing existing ligand model:', modelId);
            viewer.clearRepresentations(modelId);
          }

          console.log(`✅ Removed ${ligandModels.length} existing ligand models`);
        } catch (e) {
          console.log('⚠️ No existing ligand to remove or error removing:', e.message);
        }

        // Load new ligand
        console.log('📁 Loading ligand file from:', `/assets/ligands/${ligand.file}`);
        const ligandModelId = await viewer.loadLigand(`/assets/ligands/${ligand.file}`);

        console.log('✅ Ligand model loaded successfully:', ligandModelId);

        // Create ball-and-stick representation for ligand
        console.log('🎨 Creating ligand representation...');
        const ligandRepId = await viewer.addBallAndStickRepresentation(ligandModelId, {
          scale: 0.8,
          bondRadius: 0.3,
          colorscheme: 'default',
          opacity: 1.0
        });

        console.log('✅ Ligand representation created:', ligandRepId);

        // Zoom to include the ligand
        await viewer.zoomTo();
        viewer.render();

        // Auto-enable all FragMaps when ligand is loaded
        console.log('🎯 Auto-enabling FragMaps with ligand...');
        setTimeout(async () => {
          try {
            // Get FragMapManager context to trigger auto-enablement
            const fragMapManagerEvent = new CustomEvent('ligandLoaded', {
              detail: { ligandId, ligandName: ligand.name }
            });
            window.dispatchEvent(fragMapManagerEvent);

            console.log(`🎯 Dispatched ligand loaded event for ${ligand.name}`);
          } catch (error) {
            console.log('⚠️ Could not auto-enable FragMaps:', error.message);
          }
        }, 1000); // Wait 1 second for ligand to fully load

        console.log('🎉 Ligand loading completed successfully!');
        setCurrentNarrative(`Loaded ${ligand.name}: ${ligand.description}. The ligand is shown in ball-and-stick representation with element-based coloring. FragMaps will automatically load to show interaction sites.`);
      } else {
        // Mock viewer - simple loading
        console.log('📱 Mock viewer detected - using simple ligand loading');
        console.log(`Mock loading ligand: ${ligand.name} from ${ligand.file}`);
      }
    } catch (error) {
      console.error('❌ Error loading ligand:', error);
      console.log('Falling back to mock viewer for ligand loading');
      setIsLoading(false);
      setCurrentNarrative('Ligand loading failed. Please try again.');
    }
  }, [viewer, ligandOptions, setIsLoading, setCurrentNarrative]);

  // FragMap management logic is now handled in FragMapManager component
  // to ensure better modularity and robustness.


  // Handle ligand selection with proper timing and auto-FragMap loading
  useEffect(() => {
    console.log('Ligand selection changed to:', selectedLigand);

    // Only load ligand if viewer is available
    if (viewer && viewer.viewer) {
      console.log('Viewer is ready, loading ligand:', selectedLigand);
      loadLigand(selectedLigand);
    } else {
      console.log('Viewer not ready for ligand loading, will retry...');
      // Set up a retry mechanism
      const retryLigandLoad = () => {
        if (retryCountRef.current < maxRetries && viewer && viewer.viewer) {
          console.log(`Retrying ligand load (${retryCountRef.current + 1}/${maxRetries})`);
          loadLigand(selectedLigand);
          retryCountRef.current++;
        } else if (retryCountRef.current >= maxRetries) {
          console.log('Max retries reached for ligand loading');
        }
      };

      // Retry every 500ms for up to 2.5 seconds
      const retryInterval = setInterval(() => {
        retryLigandLoad();
      }, 500);

      setTimeout(() => {
        clearInterval(retryInterval);
      }, 2500);

      // Initial retry
      retryLigandLoad();
    }
  }, [selectedLigand, viewer, loadLigand]);

  // Listen for ligand loaded events to trigger FragMap auto-enablement
  useEffect(() => {
    const handleLigandLoaded = (event) => {
      console.log('🎯 [INTERACTIVE-VIEWER] Ligand loaded event received:', event.detail);

      // Trigger FragMap auto-enablement by updating selectedProteinPart
      // This will cause FragMapManager's useEffect to auto-enable all FragMaps
      if (state.selectedProteinPart) {
        console.log('🎯 [INTERACTIVE-VIEWER] Protein part already selected, FragMaps will auto-enable');
      } else {
        console.log('🎯 [INTERACTIVE-VIEWER] No protein part selected, FragMaps will enable when protein is selected');
      }
    };

    window.addEventListener('ligandLoaded', handleLigandLoaded);

    return () => {
      window.removeEventListener('ligandLoaded', handleLigandLoaded);
    };
  }, [state.selectedProteinPart]);

  // Initial isovalues are handled by FragMapManager


  return (
    <div className="min-h-screen bg-molstar-bg flex flex-col">
      {/* Header */}
      <div className="glass-morphism border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">Interactive Molecular Viewer</h2>
          <p className="text-gray-400 text-sm">
            Explore P38 MAP Kinase with SILCS FragMaps. Use controls to toggle visualizations and select different ligands.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel - Controls */}
        <div className="lg:w-80 p-6 space-y-6 overflow-y-auto max-h-screen">
          {/* Ligand Selector */}
          <LigandSelector
            ligandOptions={ligandOptions}
            selectedLigand={selectedLigand}
            onLigandSelect={setSelectedLigand}
            isLoading={isLoading}
          />

          {/* FragMap Manager - handles state and logic */}
          <FragMapManager />

          {/* FragMap Toggles - provides UI controls */}
          <FragMapToggles
            fragMapTypes={fragMapTypes}
            activeFragMaps={state.activeFragMaps}
            isoValues={state.isoValues}
            onToggleFragMap={actions.toggleFragMap}
            onIsoValueChange={actions.setIsoValue}
            selectedProteinPart={state.selectedProteinPart}
          />
        </div>

        {/* Center - Viewer */}
        <div className="flex-1 p-6">
          <div className="viewer-container h-full min-h-[600px] relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-molstar-bg rounded-lg z-10">
                <div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
                  style={{ animation: 'spin 2s linear infinite' }}
                />
              </div>
            )}

            {/* Real Molstar Viewer */}
            <div
              ref={viewerRef}
              className="molstar-container w-full h-full relative z-50"
              style={{
                minHeight: '600px',
                backgroundColor: 'black',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
            />

            {/* Demo Mode Overlay - only show if mock viewer */}
            {(!viewer?.viewer && !isLoading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-molstar-bg to-molstar-surface rounded-lg border border-white/10 z-20">
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Molecular Visualization Demo</h3>
                  <p className="text-gray-400 max-w-md">
                    This is a demonstration of the SILCS FragMaps interface. The actual 3D molecular viewer requires integration with 3Dmol.js or similar libraries.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="font-medium text-blue-400 mb-1">Protein Structure</div>
                      <div className="text-xs">P38 MAP Kinase (3FLY)</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="font-medium text-purple-400 mb-1">Active FragMaps</div>
                      <div className="text-xs">{state.activeFragMaps.size} of 6</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Check browser console for molecular loading events
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Caption */}
        <div className="lg:w-80 p-6">
          <CaptionPanel caption={currentNarrative} />
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="bg-molstar-bg border-t border-white/10 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                P38 MAP Kinase (3FLY)
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                {state.activeFragMaps.size} Active FragMaps
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                {ligandOptions.find(l => l.id === selectedLigand)?.name}
              </span>
            </div>
            <div className="text-xs">
              Interactive SILCS FragMaps Demo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveViewer;
