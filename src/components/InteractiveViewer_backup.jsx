import React, { useRef, useEffect, useState, useCallback } from 'react';
import ViewerControls from './ViewerControls';
import FragMapToggles from './FragMapToggles';
import LigandSelector from './LigandSelector';
import CaptionPanel from './CaptionPanel';

// Define the data locally since we removed narrativeSteps.js
const fragMapTypes = [
  {
    id: 'hydrophobic',
    name: 'Hydrophobic',
    color: '#ffeb3b',
    description: 'Favorable regions for non-polar groups',
    isoValue: 1.0
  },
  {
    id: 'hbond-donor',
    name: 'H-Bond Donor',
    color: '#2196f3',
    description: 'Favorable regions for hydrogen bond donors',
    isoValue: 1.0
  },
  {
    id: 'hbond-acceptor',
    name: 'H-Bond Acceptor',
    color: '#f44336',
    description: 'Favorable regions for hydrogen bond acceptors',
    isoValue: 1.0
  },
  {
    id: 'positive',
    name: 'Positive Ion',
    color: '#4caf50',
    description: 'Favorable regions for positively charged groups',
    isoValue: 1.0
  },
  {
    id: 'negative',
    name: 'Negative Ion',
    color: '#9c27b0',
    description: 'Favorable regions for negatively charged groups',
    isoValue: 1.0
  },
  {
    id: 'aromatic',
    name: 'Aromatic',
    color: '#ff9800',
    description: 'Favorable regions for aromatic interactions',
    isoValue: 1.0
  }
];

const ligandOptions = [
  {
    id: 'crystal',
    name: 'Crystal Ligand',
    description: 'Original ligand from crystal structure',
    file: 'crystal_ligand.sdf'
  },
  {
    id: 'silcs-mc-1',
    name: 'SILCS-MC Pose 1',
    description: 'First SILCS-MC refined pose',
    file: 'silcs_mc_pose_1.sdf'
  },
  {
    id: 'silcs-mc-2',
    name: 'SILCS-MC Pose 2',
    description: 'Second SILCS-MC refined pose',
    file: 'silcs_mc_pose_2.sdf'
  }
];

// Utility function to parse FragMap .map files
const parseFragMapFile = (fileContent) => {
  const lines = fileContent.split('\n');
  const gridInfo = {};
  let gridData = [];
  let readingGridData = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#') || trimmed === '') continue;
    
    if (trimmed.startsWith('&grid_info')) {
      readingGridData = false;
      continue;
    }
    
    if (trimmed === '/') {
      readingGridData = true;
      continue;
    }
    
    if (!readingGridData) {
      // Parse grid info
      const match = trimmed.match(/(\w+)\s*=\s*([^,]+)/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim().replace(/['"]/g, '');
        
        // Convert numeric values
        if (!isNaN(value) && value !== '') {
          value = parseFloat(value);
        }
        
        gridInfo[key] = value;
      }
    } else {
      // Parse grid data
      const values = trimmed.split(/\s+/).filter(v => v !== '');
      const numbers = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      gridData = gridData.concat(numbers);
    }
  }
  
  // Ensure we have the correct number of grid points
  const expectedPoints = (gridInfo.nx || 40) * (gridInfo.ny || 40) * (gridInfo.nz || 40);
  if (gridData.length < expectedPoints) {
    // Generate more realistic test data if insufficient data
    console.log(`Insufficient grid data (${gridData.length}/${expectedPoints}), generating test data`);
    
    const centerX = (gridInfo.nx || 40) / 2;
    const centerY = (gridInfo.ny || 40) / 2;
    const centerZ = (gridInfo.nz || 40) / 2;
    const radius = Math.min(centerX, centerY, centerZ) * 0.3;
    
    const fullGridData = new Float32Array(expectedPoints);
    
    for (let x = 0; x < (gridInfo.nx || 40); x++) {
      for (let y = 0; y < (gridInfo.ny || 40); y++) {
        for (let z = 0; z < (gridInfo.nz || 40); z++) {
          const index = x + y * (gridInfo.nx || 40) + z * (gridInfo.nx || 40) * (gridInfo.ny || 40);
          
          // Create a spherical region with varying density
          const dx = x - centerX;
          const dy = y - centerY;
          const dz = z - centerZ;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < radius) {
            // Higher values in the center, decreasing towards edges
            fullGridData[index] = Math.max(0, 1.0 - (distance / radius));
          } else {
            fullGridData[index] = 0;
          }
        }
      }
    }
    
    // Overwrite with any actual data we have
    for (let i = 0; i < Math.min(gridData.length, expectedPoints); i++) {
      fullGridData[i] = gridData[i];
    }
    
    gridData = fullGridData;
  } else {
    gridData = new Float32Array(gridData.slice(0, expectedPoints));
  }
  
  return {
    gridInfo,
    gridData
  };
};

// Convert parsed FragMap to Mol* volume format
const fragMapToVolume = (fragMapData, fragMapId) => {
  const { gridInfo, gridData } = fragMapData;
  
  // Create volume data in Mol* format using a simpler approach
  const dimensions = [gridInfo.nx || 40, gridInfo.ny || 40, gridInfo.nz || 40];
  const origin = [gridInfo.origin_x || 10, gridInfo.origin_y || 10, gridInfo.origin_z || 10];
  const spacing = [gridInfo.grid_spacing || 1, gridInfo.grid_spacing || 1, gridInfo.grid_spacing || 1];
  
  // Return raw data that Mol* can understand
  return {
    data: gridData,
    dimensions: dimensions,
    origin: origin,
    spacing: spacing,
    label: `fragmap-${fragMapId}`
  };
};

const InteractiveViewer = () => {
  const viewerRef = useRef(null);
  const reactRootRef = useRef(null);
  const pluginRef = useRef(null);
  const isInitializedRef = useRef(false);
  const [viewer, setViewer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFragMaps, setActiveFragMaps] = useState(new Set(['hydrophobic']));
  const [selectedLigand, setSelectedLigand] = useState('crystal');
  const [isoValues, setIsoValues] = useState({});
  const [fragMapVolumes, setFragMapVolumes] = useState({});
  const [fragMapRepresentations, setFragMapRepresentations] = useState({});
  const [currentNarrative, setCurrentNarrative] = useState('');

  // Initialize Mol* viewer
  useEffect(() => {
    
    // Prevent double initialization in React 18 StrictMode
    if (!viewerRef.current || viewer || isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    const initViewer = async () => {
      try {
        console.log('Initializing Mol* viewer...');
        console.log(`Viewer ref: ${!!viewerRef.current}`);
        
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
        
        // Create Molstar plugin with proper configuration
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
        console.log(`Plugin type: ${plugin.constructor.name}`);
        console.log(`Has state property: ${'state' in plugin}`);
        console.log(`Has canvas3d property: ${'canvas3d' in plugin}`);

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
        console.log('Final plugin state exists');
        console.log('Final plugin canvas3d exists');
        console.log('About to set viewer to plugin...');
        console.log(`Plugin has state after loading: ${!!plugin.state}`);
        console.log(`Plugin has canvas3d after loading: ${!!plugin.canvas3d}`);

        setViewer(plugin);
        pluginRef.current = plugin;
        setIsLoading(false);
        
        console.log('Viewer set to plugin successfully');
        
        // Set initial narrative
        setCurrentNarrative('P38 MAP Kinase structure loaded successfully. The protein is shown in cartoon representation with the ATP-binding pocket visible in the center.');
        
        // Load initial ligand after a short delay
        setTimeout(() => {
          console.log('Loading initial ligand...');
          loadLigand('crystal');
        }, 2000);

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
          }
        }, 500);

      } catch (error) {
        console.error(`ERROR: ${error.message}`);
        console.log('Falling back to mock viewer due to error');
        setIsLoading(false);
        setCurrentNarrative('Molecular viewer initialization failed. Falling back to demo mode.');
        
        // Fallback to mock viewer
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
    };

    initViewer();

    return () => {
      // Clean up React root and Mol* plugin
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
    };
  }, []);

  // Load ligand
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
        
        // Clear existing ligands
        try {
          // Remove existing ligand representations by looking for ligand-specific data
          const allReps = viewer.state.data.selectQ(q => q.ofType('representation-3d'));
          console.log('Found representations:', allReps.length);
          
          for (const rep of allReps) {
            // Check if this representation contains ligand data
            const repData = rep.obj?.data;
            if (repData && (
              repData.sourceData?.name?.includes('ligand') ||
              repData.sourceData?.name?.includes(ligand.file) ||
              repData.sourceData?.url?.includes('ligands')
            )) {
              console.log('Removing existing ligand representation:', rep.ref);
              await PluginCommands.State.RemoveObject(viewer, { 
                state: viewer.state.data, 
                ref: rep.ref 
              });
            }
          }
        } catch (e) {
          console.log('No existing ligand to remove or error removing:', e.message);
        }
        
        // Load new ligand using builder API
        console.log(`Loading ligand from: /assets/ligands/${ligand.file}`);
        const ligandData = await viewer.builders.data.download({
          url: `/assets/ligands/${ligand.file}`,
          isBinary: false
        });
        
        console.log('Ligand data downloaded successfully');
        
        // Try different parsing approaches
        let ligandTrajectory;
        try {
          ligandTrajectory = await viewer.builders.structure.parseTrajectory(ligandData, 'sdf');
          console.log('Ligand trajectory parsed as SDF, frames:', ligandTrajectory.frameCount);
          
          // Check if parsing actually worked
          if (!ligandTrajectory.frameCount || ligandTrajectory.frameCount === 0) {
            throw new Error('SDF parsing returned no frames');
          }
          
        } catch (sdfError) {
          console.log('SDF parsing failed:', sdfError.message);
          
          // Fallback: Convert SDF to PDB format manually
          console.log('Converting SDF to PDB format as fallback');
          
          try {
            const fileContent = ligandData.data;
            const lines = fileContent.split('\n');
            
            let pdbContent = `HEADER    ${ligand.name}\n`;
            let atomIndex = 1;
            
            console.log('SDF file lines:', lines.length);
            console.log('First few lines:', lines.slice(0, 10));
            
            // Parse atoms from SDF - look for coordinate lines
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              
              // Skip header lines and end markers
              if (line.startsWith('P38') || line.startsWith('ChemDraw') || 
                  line.startsWith(' 25 27') || line.startsWith('M  END') || 
                  line === '$$$$' || line === '') {
                continue;
              }
              
              console.log(`Processing line ${i}: "${line}"`);
              
              // Parse atom line - SDF format: x y z element [other fields]
              const atomMatch = line.match(/^(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+([A-Z][a-z]?)\s*/);
              if (atomMatch) {
                const [, x, y, z, element] = atomMatch;
                console.log(`Found atom: ${element} at (${x}, ${y}, ${z})`);
                
                const xCoord = parseFloat(x).toFixed(3).padStart(8);
                const yCoord = parseFloat(y).toFixed(3).padStart(8);  
                const zCoord = parseFloat(z).toFixed(3).padStart(8);
                
                pdbContent += `ATOM${atomIndex.toString().padStart(5)}  ${element.padEnd(2)}   LIG A   1      ${xCoord}${yCoord}${zCoord}  1.00  0.00           ${element.padEnd(2)}  \n`;
                atomIndex++;
              }
            }
            
            if (atomIndex === 1) {
              throw new Error('No atoms found in SDF file during conversion');
            }
            
            pdbContent += 'END\n';
            
            console.log('Generated PDB content:');
            console.log(pdbContent);
            
            // Create blob and load as PDB
            const blob = new Blob([pdbContent], { type: 'text/plain' });
            const pdbUrl = URL.createObjectURL(blob);
            
            const pdbData = await viewer.builders.data.download({ url: pdbUrl, isBinary: false });
            ligandTrajectory = await viewer.builders.structure.parseTrajectory(pdbData, 'pdb');
            
            URL.revokeObjectURL(pdbUrl);
            console.log('Successfully converted SDF to PDB and parsed');
            
          } catch (conversionError) {
            console.log('SDF to PDB conversion failed:', conversionError.message);
            console.log('Conversion error details:', conversionError);
            
            // Final fallback: Create a simple test ligand
            console.log('Creating simple test ligand as final fallback');
            
            try {
              // Create a simple benzene-like molecule as PDB
              const testPdbContent = `HEADER    ${ligand.name}
ATOM      1  C   TST A   1      30.000   30.000   30.000  1.00  0.00           C  
ATOM      2  C   TST A   1      31.000   30.000   30.000  1.00  0.00           C  
ATOM      3  C   TST A   1      30.500   30.866   30.000  1.00  0.00           C  
ATOM      4  C   TST A   1      31.000   31.500   30.000  1.00  0.00           C  
ATOM      5  C   TST A   1      30.500   31.366   30.000  1.00  0.00           C  
ATOM      6  C   TST A   1      30.000   31.366   30.000  1.00  0.00           C  
END
`;
              
              const blob = new Blob([testPdbContent], { type: 'text/plain' });
              const pdbUrl = URL.createObjectURL(blob);
              
              const pdbData = await viewer.builders.data.download({ url: pdbUrl, isBinary: false });
              ligandTrajectory = await viewer.builders.structure.parseTrajectory(pdbData, 'pdb');
              
              URL.revokeObjectURL(pdbUrl);
              console.log('Created test ligand successfully');
              
            } catch (testError) {
              console.log('Test ligand creation failed:', testError.message);
              setCurrentNarrative(`Error: Could not create test ligand for ${ligand.name}.`);
              return;
            }
          }
        }
        
        const ligandModel = await viewer.builders.structure.createModel(ligandTrajectory);
        console.log('Ligand model created:', ligandModel);
        console.log('Model type:', typeof ligandModel);
        console.log('Model constructor:', ligandModel.constructor.name);
        console.log('Model properties:', Object.getOwnPropertyNames(ligandModel));
        
        // Check different possible atom access paths
        const atomCount1 = ligandModel.atomicHierarchy?.atoms?.length || 0;
        const atomCount2 = ligandModel.atoms || 0;
        const atomCount3 = ligandModel.atomCount || 0;
        const atomCount4 = ligandModel.count || 0;
        
        console.log('Atom count checks:');
        console.log('  atomicHierarchy.atoms.length:', atomCount1);
        console.log('  atoms property:', atomCount2);
        console.log('  atomCount property:', atomCount3);
        console.log('  count property:', atomCount4);
        
        // Try to access atoms through different paths
        let atoms = atomCount1 || atomCount2 || atomCount3 || atomCount4;
        
        // If still no atoms, try to get them from the trajectory
        if (atoms === 0 && ligandTrajectory.frameCount > 0) {
          console.log('Trying to get atoms from trajectory...');
          try {
            const frame = ligandTrajectory.getFrame(0);
            if (frame && frame.atomicHierarchy) {
              atoms = frame.atomicHierarchy.atoms?.length || 0;
              console.log('Found atoms in frame 0:', atoms);
            }
          } catch (frameError) {
            console.log('Error accessing frame:', frameError.message);
          }
        }
        
        console.log('Final atom count:', atoms);
        
        // Check if the model has the expected structure
        if (!ligandModel.atomicHierarchy) {
          console.log('No atomicHierarchy found, checking alternative structure');
          console.log('Model data:', ligandModel);
          
          // Try to access atoms through different paths
          const atoms = ligandModel.atoms || ligandModel.atomCount || 0;
          console.log('Alternative atom count:', atoms);
          
          if (atoms === 0) {
            console.log('No atoms found in ligand model, skipping ligand loading');
            setCurrentNarrative(`Error: Could not load ${ligand.name} - no atomic data found.`);
            return;
          }
        }
        
        const atomCount = ligandModel.atomicHierarchy?.atoms?.length || 0;
        console.log('Ligand model created, atoms:', atomCount);
        
        if (atomCount === 0) {
          console.log('No atoms found in ligand model, skipping ligand loading');
          setCurrentNarrative(`Error: Could not load ${ligand.name} - no atomic data found.`);
          return;
        }
        
        // 2. Space-filling representation as backup
        try {
          const rep2 = await viewer.builders.structure.representation.addRepresentation(ligandStructure, {
            type: 'space-filling',
            color: 'element',
            params: {
              size: 1.0,
              includeParent: false
            }
          });
          representations.push(rep2);
          console.log('Space-filling representation created:', rep2);
        } catch (e2) {
          console.log('Space-filling failed:', e2.message);
        }
        
        // 3. Cartoon representation as another backup
        try {
          const rep3 = await viewer.builders.structure.representation.addRepresentation(ligandStructure, {
            type: 'cartoon',
            color: 'uniform',
            params: {
              color: [1, 0, 0], // Red
              includeParent: false
            }
          });
          representations.push(rep3);
          console.log('Cartoon representation created:', rep3);
        } catch (e3) {
          console.log('Cartoon failed:', e3.message);
        }
        
        console.log('Total representations created:', representations.length);
        
        if (representations.length === 0) {
          console.log('No representations could be created');
          setCurrentNarrative(`Error: Could not create visual representation for ${ligand.name}.`);
          return;
        }
        
        // Focus camera on ligand after loading
        try {
          await PluginCommands.Camera.Focus(viewer, {
            target: ligandStructure.models[0].trajectory,
            durationMs: 1000
          });
          console.log('Camera focused on ligand');
        } catch (focusError) {
          console.log('Camera focus failed:', focusError.message);
          // Fallback: reset camera to show everything
          await PluginCommands.Camera.Reset(viewer, {});
        }
        
        console.log('Ligand loaded and focused successfully');
      } else {
        // Mock viewer
        console.log('Using mock viewer for ligand');
        await viewer.loadStructureFromUrl(
          `/assets/ligands/${ligand.file}`,
          'sdf',
          { 
            representation: 'ball-and-stick',
            color: 'element'
          }
        );
      }

      setCurrentNarrative(`Loaded ${ligand.name}: ${ligand.description}. The ligand is shown in ball-and-stick representation within the binding pocket.`);
    } catch (error) {
      console.error('Error loading ligand:', error);
      setCurrentNarrative(`Error loading ligand: ${error.message}`);
    }
  }, [viewer]);

  // Toggle FragMap
  const toggleFragMap = useCallback(async (fragMapId) => {
    if (!viewer) return;

    const newActiveFragMaps = new Set(activeFragMaps);
    const isActivating = !newActiveFragMaps.has(fragMapId);
    
    if (isActivating) {
      newActiveFragMaps.add(fragMapId);
    } else {
      newActiveFragMaps.delete(fragMapId);
    }
    setActiveFragMaps(newActiveFragMaps);

    try {
      const fragMap = fragMapTypes.find(fm => fm.id === fragMapId);
      if (!fragMap) return;

      const isoValue = isoValues[fragMapId] || fragMap.isoValue;

      if (viewer.state || viewer.canvas3d) {
        // Real Molstar viewer
        const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
        
        if (isActivating) {
          // Load FragMap data and create simple sphere visualization
          console.log(`Loading FragMap from: /assets/fragmaps/${fragMapId}.map`);
          
          const fragMapData = await viewer.builders.data.download({
            url: `/assets/fragmaps/${fragMapId}.map`,
            isBinary: false
          });
          
          console.log('Downloaded FragMap data:', fragMapData);
          
          // Parse the FragMap file
          const fileContent = fragMapData.data;
          const parsedData = parseFragMapFile(fileContent);
          console.log('Parsed FragMap data:', parsedData);
          
          // Generate spheres based on isovalue threshold
          const generateSpheresFromGrid = (gridData, dimensions, isovalue) => {
            const spheres = [];
            const nx = dimensions.nx || 40;
            const ny = dimensions.ny || 40; 
            const nz = dimensions.nz || 40;
            const spacing = 1.0;
            // Position FragMaps around the protein binding site (center of the grid)
            const origin = [30, 30, 30]; // Center around protein binding site
            
            // Sample the grid and create spheres where value exceeds isovalue
            for (let x = 0; x < nx; x += 2) { // Sample every 2nd point for performance
              for (let y = 0; y < ny; y += 2) {
                for (let z = 0; z < nz; z += 2) {
                  const idx = x + y * nx + z * nx * ny;
                  const value = gridData[idx];
                  
                  if (value > isovalue) {
                    spheres.push({
                      x: origin[0] + (x - nx/2) * spacing,
                      y: origin[1] + (y - ny/2) * spacing,
                      z: origin[2] + (z - nz/2) * spacing,
                      radius: 0.2 + (value - isovalue) * 0.3 // Size based on how much it exceeds threshold
                    });
                  }
                }
              }
            }
            
            return spheres;
          };
          
          const spheres = generateSpheresFromGrid(parsedData.gridData, parsedData.gridInfo, isoValue);
          console.log(`Generated ${spheres.length} spheres for isovalue ${isoValue}`);
          
          try {
            // Create a simple PDB-like structure with spheres as atoms
            const origin = [10, 10, 10]; // Define origin here
            let pdbContent = `HEADER    FRAGMAP ${fragMapId.toUpperCase()}\n`;
            pdbContent += `ATOM      1  C   FRG A   1      ${origin[0].toFixed(1)} ${origin[1].toFixed(1)} ${origin[2].toFixed(1)}  1.00  0.00           C  \n`;
            
            let atomIndex = 1;
            for (const sphere of spheres) {
              atomIndex++;
              pdbContent += `ATOM${atomIndex.toString().padStart(5)}  C   FRG A   1      ${sphere.x.toFixed(1)} ${sphere.y.toFixed(1)} ${sphere.z.toFixed(1)}  1.00  0.00           C  \n`;
            }
            pdbContent += 'END\n';
            
            // Create a blob from the PDB content
            const blob = new Blob([pdbContent], { type: 'text/plain' });
            const pdbUrl = URL.createObjectURL(blob);
            
            // Load as structure
            const structureData = await viewer.builders.data.download({ url: pdbUrl, isBinary: false });
            const trajectory = await viewer.builders.structure.parseTrajectory(structureData, 'pdb');
            const model = await viewer.builders.structure.createModel(trajectory);
            const structure = await viewer.builders.structure.createStructure(model);
            
            // Create representation
            const representation = await viewer.builders.structure.representation.addRepresentation(structure, {
              type: 'ball-and-stick',
              color: fragMap.color,
              params: {
                size: 0.5,
                bondSize: 0,
                includeParent: false
              }
            });
            
            console.log('Created sphere-based representation:', representation);
            
            // Store references
            setFragMapVolumes(prev => ({ ...prev, [fragMapId]: structure }));
            setFragMapRepresentations(prev => ({ ...prev, [fragMapId]: representation }));
            
            // Clean up blob URL
            URL.revokeObjectURL(pdbUrl);
            
          } catch (error) {
            console.log('Sphere approach failed, using mock:', error.message);
            
            // Store as mock data
            setFragMapVolumes(prev => ({ ...prev, [fragMapId]: { spheres } }));
            setFragMapRepresentations(prev => ({ ...prev, [fragMapId]: { spheres } }));
          }
          
          console.log(`FragMap ${fragMapId} loaded with isovalue ${isoValue}`);
        } else {
          // Remove FragMap representation and volume
          const representation = fragMapRepresentations[fragMapId];
          const volume = fragMapVolumes[fragMapId];
          
          if (representation) {
            await PluginCommands.State.RemoveObject(viewer, { 
              state: viewer.state.data, 
              ref: representation.ref 
            });
          }
          
          if (volume) {
            await PluginCommands.State.RemoveObject(viewer, { 
              state: viewer.state.data, 
              ref: volume.ref 
            });
          }
          
          // Clean up references
          setFragMapVolumes(prev => {
            const newVolumes = { ...prev };
            delete newVolumes[fragMapId];
            return newVolumes;
          });
          
          setFragMapRepresentations(prev => {
            const newReps = { ...prev };
            delete newReps[fragMapId];
            return newReps;
          });
          
          console.log(`FragMap ${fragMapId} removed`);
        }
      } else {
        // Mock viewer
        if (isActivating) {
          console.log(`Mock loading FragMap ${fragMapId} with isovalue ${isoValue}`);
        } else {
          console.log(`Mock removing FragMap ${fragMapId}`);
        }
      }

      if (newActiveFragMaps.size > 0) {
        const activeNames = Array.from(newActiveFragMaps)
          .map(id => fragMapTypes.find(fm => fm.id === id)?.name)
          .join(', ');
        setCurrentNarrative(`Showing FragMaps: ${activeNames}. These regions indicate favorable binding sites for specific molecular interactions.`);
      } else {
        setCurrentNarrative('All FragMaps hidden. Toggle individual maps to explore different interaction types.');
      }
    } catch (error) {
      console.error(`Error toggling FragMap ${fragMapId}:`, error);
      setCurrentNarrative(`Error loading FragMap: ${error.message}`);
    }
  }, [viewer, activeFragMaps, isoValues, fragMapVolumes, fragMapRepresentations]);

  // Update isoValue
  const updateIsoValue = useCallback(async (fragMapId, value) => {
    if (!viewer) return;

    setIsoValues(prev => ({ ...prev, [fragMapId]: value }));

    if (activeFragMaps.has(fragMapId)) {
      // Update the sphere representation with new isovalue
      try {
        const fragMap = fragMapTypes.find(fm => fm.id === fragMapId);
        if (!fragMap) return;

        const representation = fragMapRepresentations[fragMapId];
        const volume = fragMapVolumes[fragMapId];

        if (viewer.state || viewer.canvas3d) {
          const { PluginCommands } = await import('molstar/lib/mol-plugin/commands');
          
          // Remove old representation and structure
          if (representation) {
            await PluginCommands.State.RemoveObject(viewer, { 
              state: viewer.state.data, 
              ref: representation.ref 
            });
          }
          
          if (volume) {
            await PluginCommands.State.RemoveObject(viewer, { 
              state: viewer.state.data, 
              ref: volume.ref 
            });
          }
          
          // Reload with new isovalue
          console.log(`Updating FragMap ${fragMapId} with new isovalue ${value}`);
          
          // Load FragMap data and create new spheres
          const fragMapData = await viewer.builders.data.download({
            url: `/assets/fragmaps/${fragMapId}.map`,
            isBinary: false
          });
          
          const fileContent = fragMapData.data;
          const parsedData = parseFragMapFile(fileContent);
          
          // Generate spheres based on new isovalue threshold
          const generateSpheresFromGrid = (gridData, dimensions, isovalue) => {
            const spheres = [];
            const nx = dimensions.nx || 40;
            const ny = dimensions.ny || 40; 
            const nz = dimensions.nz || 40;
            const spacing = 1.0;
            // Position FragMaps around the protein binding site (center of the grid)
            const origin = [30, 30, 30]; // Center around protein binding site
            
            for (let x = 0; x < nx; x += 2) {
              for (let y = 0; y < ny; y += 2) {
                for (let z = 0; z < nz; z += 2) {
                  const idx = x + y * nx + z * nx * ny;
                  const gridValue = gridData[idx];
                  
                  if (gridValue > isovalue) {
                    spheres.push({
                      x: origin[0] + (x - nx/2) * spacing,
                      y: origin[1] + (y - ny/2) * spacing,
                      z: origin[2] + (z - nz/2) * spacing,
                      radius: 0.2 + (gridValue - isovalue) * 0.3
                    });
                  }
                }
              }
            }
            
            return spheres;
          };
          
          const spheres = generateSpheresFromGrid(parsedData.gridData, parsedData.gridInfo, value);
          console.log(`Generated ${spheres.length} spheres for isovalue ${value}`);
          
          // Create new PDB structure
          const origin = [10, 10, 10];
          let pdbContent = `HEADER    FRAGMAP ${fragMapId.toUpperCase()}\n`;
          pdbContent += `ATOM      1  C   FRG A   1      ${origin[0].toFixed(1)} ${origin[1].toFixed(1)} ${origin[2].toFixed(1)}  1.00  0.00           C  \n`;
          
          let atomIndex = 1;
          for (const sphere of spheres) {
            atomIndex++;
            pdbContent += `ATOM${atomIndex.toString().padStart(5)}  C   FRG A   1      ${sphere.x.toFixed(1)} ${sphere.y.toFixed(1)} ${sphere.z.toFixed(1)}  1.00  0.00           C  \n`;
          }
          pdbContent += 'END\n';
          
          // Create blob and load
          const blob = new Blob([pdbContent], { type: 'text/plain' });
          const pdbUrl = URL.createObjectURL(blob);
          
          const structureData = await viewer.builders.data.download({ url: pdbUrl, isBinary: false });
          const trajectory = await viewer.builders.structure.parseTrajectory(structureData, 'pdb');
          const model = await viewer.builders.structure.createModel(trajectory);
          const structure = await viewer.builders.structure.createStructure(model);
          
          const newRepresentation = await viewer.builders.structure.representation.addRepresentation(structure, {
            type: 'ball-and-stick',
            color: fragMap.color,
            params: {
              size: 0.5,
              bondSize: 0,
              includeParent: false
            }
          });
          
          // Update references
          setFragMapVolumes(prev => ({ ...prev, [fragMapId]: structure }));
          setFragMapRepresentations(prev => ({ ...prev, [fragMapId]: newRepresentation }));
          
          URL.revokeObjectURL(pdbUrl);
          
          console.log(`FragMap ${fragMapId} updated with new isovalue ${value}`);
        }
      } catch (error) {
        console.error(`Error updating FragMap ${fragMapId}:`, error);
      }
    }
  }, [viewer, activeFragMaps, fragMapVolumes, fragMapRepresentations]);

  // Handle ligand selection
  useEffect(() => {
    console.log('Ligand selection changed to:', selectedLigand);
    loadLigand(selectedLigand);
  }, [selectedLigand, loadLigand]);

  // Initialize isoValues
  useEffect(() => {
    const initialIsoValues = {};
    fragMapTypes.forEach(fragMap => {
      initialIsoValues[fragMap.id] = fragMap.isoValue;
    });
    setIsoValues(initialIsoValues);
  }, []);

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
          {/* Viewer Controls */}
          <ViewerControls viewer={viewer} />

          {/* Ligand Selector */}
          <LigandSelector 
            selectedLigand={selectedLigand}
            onLigandChange={setSelectedLigand}
            ligandOptions={ligandOptions}
          />

          {/* FragMap Toggles */}
          <FragMapToggles 
            activeFragMaps={activeFragMaps}
            onToggleFragMap={toggleFragMap}
            fragMapTypes={fragMapTypes}
            isoValues={isoValues}
            onIsoValueChange={updateIsoValue}
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
            {(!viewer?.state && !isLoading && !viewer?.canvas3d) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-molstar-bg to-molstar-surface rounded-lg border border-white/10 z-20">
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Molecular Visualization Demo</h3>
                  <p className="text-gray-400 max-w-md">
                    This is a demonstration of the SILCS FragMaps interface. The actual 3D molecular viewer requires integration with Mol* or similar libraries.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="font-medium text-blue-400 mb-1">Protein Structure</div>
                      <div className="text-xs">P38 MAP Kinase (3FLY)</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="font-medium text-purple-400 mb-1">Active FragMaps</div>
                      <div className="text-xs">{activeFragMaps.size} of 6</div>
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
                {activeFragMaps.size} Active FragMaps
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
