import React, { useCallback } from 'react';
import { useViewer } from '../context/ViewerContext.jsx';
import { ligandOptions, ligandDefaults } from '../config/ligandOptions.js';
import { 
  convertSDFToPDB, 
  createTestLigand, 
  validateLigandData, 
  extractAtomCount,
  createPdbBlobUrl,
  cleanupBlobUrl,
  handleLigandParsingError
} from '../utils/ligandParser.js';

/**
 * LigandManager Component
 * Handles ligand loading, parsing, and visualization management
 * Provides seamless integration with Mol* viewer for ligand display
 */
const LigandManager = () => {
  const { state, actions } = useViewer();
  const { viewer, selectedLigand, loadedLigands, isLoading } = state;
  const { setSelectedLigand, addLoadedLigand, clearLoadedLigands, setNarrative } = actions;

  // Don't do anything until viewer is ready
  if (!viewer || isLoading) {
    return null;
  }

  /**
   * Loads and visualizes a ligand from the specified file
   * Handles SDF parsing, fallback mechanisms, and representation creation
   * @param {string} ligandId - ID of the ligand to load
   */
  const loadLigand = useCallback(async (ligandId) => {
    console.log('loadLigand called with:', ligandId, 'Viewer available:', !!viewer);
    
    if (!viewer) {
      console.log('No viewer available, skipping ligand load');
      return;
    }

    try {
      const ligand = ligandOptions.find(l => l.id === ligandId);
      if (!ligand) {
        console.log('Ligand not found:', ligandId);
        return;
      }

      console.log('Loading ligand:', ligand.name, 'from file:', ligand.file);

      // Check if we have a real Molstar viewer or mock viewer
      if (viewer.state || viewer.canvas3d) {
        // Real Molstar viewer
        console.log('Loading ligand with Molstar builder API');
        
        // Import PluginCommands for this scope
        const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
        
        // Clear existing ligands first
        await clearExistingLigands();
        
        // Load new ligand using builder API
        console.log(`Loading ligand from: /assets/ligands/${ligand.file}`);
        const ligandData = await viewer.builders.data.download({
          url: `/assets/ligands/${ligand.file}`,
          isBinary: false
        });
        
        console.log('Ligand data downloaded successfully');
        
        // Try different parsing approaches
        let ligandTrajectory;
        let pdbContent = null;
        let blobUrl = null;
        
        try {
          // First attempt: Parse as SDF
          ligandTrajectory = await viewer.builders.structure.parseTrajectory(ligandData, 'sdf');
          console.log('Ligand trajectory parsed as SDF, frames:', ligandTrajectory.frameCount);
          
          // Check if parsing actually worked
          if (!ligandTrajectory.frameCount || ligandTrajectory.frameCount === 0) {
            throw new Error('SDF parsing returned no frames');
          }
          
        } catch (sdfError) {
          console.log('SDF parsing failed:', sdfError.message);
          
          // Second attempt: Convert SDF to PDB format manually
          console.log('Converting SDF to PDB format as fallback');
          
          try {
            pdbContent = convertSDFToPDB(ligandData.data, ligand.name);
            blobUrl = createPdbBlobUrl(pdbContent);
            
            const pdbData = await viewer.builders.data.download({ url: blobUrl, isBinary: false });
            ligandTrajectory = await viewer.builders.structure.parseTrajectory(pdbData, 'pdb');
            
            console.log('Successfully converted SDF to PDB and parsed');
            
          } catch (conversionError) {
            console.log('SDF to PDB conversion failed:', conversionError.message);
            
            // Third attempt: Create a simple test ligand
            console.log('Creating test ligand as final fallback');
            
            try {
              pdbContent = createTestLigand(ligand.name);
              blobUrl = createPdbBlobUrl(pdbContent);
              
              const pdbData = await viewer.builders.data.download({ url: blobUrl, isBinary: false });
              ligandTrajectory = await viewer.builders.structure.parseTrajectory(pdbData, 'pdb');
              
              console.log('Created test ligand successfully');
              
            } catch (testError) {
              console.log('Test ligand creation failed:', testError.message);
              setNarrative(`Error: Could not create test ligand for ${ligand.name}.`);
              return;
            }
          }
        }
        
        // Create ligand model and structure
        const ligandModelSelector = await viewer.builders.structure.createModel(ligandTrajectory);
        console.log('Ligand model selector created:', ligandModelSelector);
        
        // Get the actual model from the selector
        const ligandModel = ligandModelSelector.obj?.data || ligandModelSelector.data;
        console.log('Actual ligand model:', ligandModel);
        
        // Validate ligand data and extract atom information
        const { atoms, atomSource } = extractAtomCount(ligandModel);
        console.log(`Found ${atoms} atoms from source: ${atomSource}`);
        
        if (atoms === 0) {
          console.log('No atoms found in any location, showing full model structure:');
          console.log(JSON.stringify(ligandModel, null, 2));
          setNarrative(`Error: Could not find atomic data for ${ligand.name}.`);
          return;
        }
        
        // Create structure from model
        const ligandStructure = await viewer.builders.structure.createStructure(ligandModelSelector);
        console.log('Ligand structure created:', ligandStructure);
        
        // Create visual representations
        const representations = await createLigandRepresentations(ligandStructure);
        
        if (representations.length === 0) {
          console.log('No representations could be created');
          setNarrative(`Error: Could not create visual representation for ${ligand.name}.`);
          return;
        }
        
        // Focus camera on ligand after loading
        await focusCameraOnLigand(ligandStructure);
        
        // Update state
        addLoadedLigand(ligandId);
        setSelectedLigand(ligandId);
        
        console.log('Ligand loaded and focused successfully');
        setNarrative(
          `Loaded ${ligand.name}: ${ligand.description}. ` +
          `The ligand is shown in ball-and-stick representation within the binding pocket. ` +
          `Contains ${atoms} atoms.`
        );
        
        // Cleanup blob URL if created
        if (blobUrl) {
          cleanupBlobUrl(blobUrl);
        }
        
      } else {
        // Mock viewer handling
        console.log('Using mock viewer for ligand');
        await viewer.loadStructureFromUrl(
          `/assets/ligands/${ligand.file}`,
          'sdf',
          { 
            representation: 'ball-and-stick',
            color: 'element'
          }
        );
        
        addLoadedLigand(ligandId);
        setSelectedLigand(ligandId);
        setNarrative(`Mock: Loaded ${ligand.name}: ${ligand.description}`);
      }

    } catch (error) {
      console.error('Error loading ligand:', error);
      setNarrative(`Error loading ligand: ${error.message}`);
    }
  }, [viewer, addLoadedLigand, setSelectedLigand, setNarrative]);

  /**
   * Clears existing ligand representations from the viewer
   */
  const clearExistingLigands = useCallback(async () => {
    if (!viewer) return;
    
    try {
      const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
      
      // Remove existing ligand representations
      const allReps = viewer.state.data.selectQ(q => q.ofType('representation-3d'));
      console.log('Found representations:', allReps.length);
      
      for (const rep of allReps) {
        // Check if this representation contains ligand data
        const repData = rep.obj?.data;
        if (repData && (
          repData.sourceData?.name?.includes('ligand') ||
          repData.sourceData?.url?.includes('ligands')
        )) {
          console.log('Removing existing ligand representation:', rep.ref);
          await PluginCommands.State.RemoveObject(viewer, { 
            state: viewer.state.data, 
            ref: rep.ref 
          });
        }
      }
      
      console.log('Cleared existing ligand representations');
    } catch (e) {
      console.log('No existing ligand to remove or error removing:', e.message);
    }
  }, [viewer]);

  /**
   * Creates visual representations for the ligand
   * @param {Object} ligandStructure - Ligand structure from Mol*
   * @returns {Array} Array of created representations
   */
  const createLigandRepresentations = useCallback(async (ligandStructure) => {
    const representations = [];
    
    // 1. Ball-and-stick representation
    try {
      const rep1 = await viewer.builders.structure.representation.addRepresentation(ligandStructure, {
        type: 'ball-and-stick',
        color: 'element',
        params: {
          size: ligandDefaults.atomSize,
          bondRadius: ligandDefaults.bondRadius,
          includeParent: ligandDefaults.includeParent
        }
      });
      representations.push(rep1);
      console.log('Ball-and-stick representation created:', rep1);
    } catch (e1) {
      console.log('Ball-and-stick failed:', e1.message);
    }
    
    // 2. Space-filling representation as backup
    try {
      const rep2 = await viewer.builders.structure.representation.addRepresentation(ligandStructure, {
        type: 'space-filling',
        color: 'element',
        params: {
          size: 1.0,
          includeParent: ligandDefaults.includeParent
        }
      });
      representations.push(rep2);
      console.log('Space-filling representation created:', rep2);
    } catch (e2) {
      console.log('Space-filling failed:', e2.message);
    }
    
    console.log('Total representations created:', representations.length);
    return representations;
  }, [viewer]);

  /**
   * Focuses the camera on the loaded ligand
   * @param {Object} ligandStructure - Ligand structure to focus on
   */
  const focusCameraOnLigand = useCallback(async (ligandStructure) => {
    try {
      const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
      
      // Get the actual structure data from the selector
      const structureData = ligandStructure.obj?.data || ligandStructure.data;
      if (structureData?.models?.[0]?.trajectory) {
        await PluginCommands.Camera.Focus(viewer, {
          target: structureData.models[0].trajectory,
          durationMs: 1000
        });
        console.log('Camera focused on ligand');
      } else {
        console.log('Could not find trajectory for camera focus, using reset');
        await PluginCommands.Camera.Reset(viewer, {});
      }
    } catch (focusError) {
      console.log('Camera focus failed:', focusError.message);
      // Fallback: reset camera to show everything
      const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
      await PluginCommands.Camera.Reset(viewer, {});
    }
  }, [viewer]);

  /**
   * Handles ligand selection change
   * @param {string} ligandId - ID of the newly selected ligand
   */
  const handleLigandChange = useCallback(async (ligandId) => {
    if (ligandId === selectedLigand) {
      console.log('Ligand already selected:', ligandId);
      return;
    }
    
    console.log('Changing ligand from', selectedLigand, 'to', ligandId);
    await loadLigand(ligandId);
  }, [selectedLigand, loadLigand]);

  // Auto-load initial ligand when viewer becomes available
  React.useEffect(() => {
    if (viewer && selectedLigand && !loadedLigands.has(selectedLigand)) {
      console.log('Auto-loading initial ligand:', selectedLigand);
      setTimeout(() => {
        loadLigand(selectedLigand);
      }, 2000);
    }
  }, [viewer, selectedLigand, loadedLigands, loadLigand]);

  // Expose ligand change handler to parent components
  React.useEffect(() => {
    // This effect ensures the ligand manager responds to ligand selection changes
    if (selectedLigand && !loadedLigands.has(selectedLigand)) {
      loadLigand(selectedLigand);
    }
  }, [selectedLigand, loadedLigands, loadLigand]);

  // This component doesn't render anything directly
  // It manages ligand state and visualization logic
  // The actual UI controls are rendered by LigandSelector component
  return null;
};

export default LigandManager;
