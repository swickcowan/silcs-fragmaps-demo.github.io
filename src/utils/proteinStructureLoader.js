/**
 * Protein Structure Loader
 * Loads and parses PDB files to create comprehensive residue maps
 * Provides reliable protein structure data for region detection
 */

// Cache for loaded protein structure
let proteinStructureCache = null;

/**
 * Loads and parses the PDB file to create a residue map
 * @returns {Object} Protein structure with residue information
 */
export const loadProteinStructure = async () => {
  if (proteinStructureCache) {
    console.log(`🔄 [PROTEIN-LOADER] Using cached protein structure`);
    return proteinStructureCache;
  }

  console.log(`🔄 [PROTEIN-LOADER] Loading protein structure from PDB file...`);

  try {
    // Load the PDB file
    const response = await fetch('/assets/pdb/3FLY.pdb');
    if (!response.ok) {
      throw new Error(`Failed to load PDB file: ${response.status}`);
    }

    const pdbContent = await response.text();
    console.log(`🔄 [PROTEIN-LOADER] Loaded PDB file: ${pdbContent.length} characters`);

    // Parse the PDB file
    const structure = parsePDBFile(pdbContent);
    
    // Cache the result
    proteinStructureCache = structure;
    
    console.log(`✅ [PROTEIN-LOADER] Successfully loaded protein structure:`);
    console.log(`  - Chains: ${structure.chains.length}`);
    console.log(`  - Total residues: ${structure.residues.length}`);
    console.log(`  - Total atoms: ${structure.atoms.length}`);
    
    return structure;

  } catch (error) {
    console.error(`❌ [PROTEIN-LOADER] Error loading protein structure:`, error);
    throw error;
  }
};

/**
 * Parses PDB file content into structured data
 * @param {string} pdbContent - Raw PDB file content
 * @returns {Object} Parsed protein structure
 */
const parsePDBFile = (pdbContent) => {
  const lines = pdbContent.split('\n');
  const atoms = [];
  const residues = new Map(); // Use Map for efficient lookup
  const chains = new Set();

  console.log(`🔄 [PROTEIN-LOADER] Parsing ${lines.length} lines from PDB file`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse ATOM records
    if (line.startsWith('ATOM  ') || line.startsWith('HETATM')) {
      const atom = parseAtomLine(line);
      if (atom) {
        atoms.push(atom);
        chains.add(atom.chainId);

        // Group atoms by residue
        const residueKey = `${atom.chainId}:${atom.resSeq}:${atom.resName}`;
        if (!residues.has(residueKey)) {
          residues.set(residueKey, {
            chainId: atom.chainId,
            resSeq: atom.resSeq,
            resName: atom.resName,
            atoms: [],
            center: { x: 0, y: 0, z: 0 }
          });
        }

        const residue = residues.get(residueKey);
        residue.atoms.push(atom);
      }
    }
  }

  // Calculate residue centers
  for (const residue of residues.values()) {
    let sumX = 0, sumY = 0, sumZ = 0;
    
    for (const atom of residue.atoms) {
      sumX += atom.x;
      sumY += atom.y;
      sumZ += atom.z;
    }

    residue.center = {
      x: sumX / residue.atoms.length,
      y: sumY / residue.atoms.length,
      z: sumZ / residue.atoms.length
    };
  }

  // Convert Map to Array and sort by residue number
  const residueArray = Array.from(residues.values()).sort((a, b) => {
    if (a.chainId !== b.chainId) return a.chainId.localeCompare(b.chainId);
    return a.resSeq - b.resSeq;
  });

  return {
    atoms,
    residues: residueArray,
    chains: Array.from(chains).sort(),
    pdbContent,
    metadata: {
      filename: '3FLY.pdb',
      description: 'P38 MAP Kinase',
      totalAtoms: atoms.length,
      totalResidues: residueArray.length
    }
  };
};

/**
 * Parses a single ATOM line from PDB file
 * @param {string} line - ATOM line from PDB file
 * @returns {Object|null} Parsed atom data
 */
const parseAtomLine = (line) => {
  try {
    // PDB ATOM format: columns are fixed-width
    return {
      serial: parseInt(line.substring(6, 11).trim()),
      name: line.substring(12, 16).trim(),
      resName: line.substring(17, 20).trim(),
      chainId: line.substring(21, 22).trim(),
      resSeq: parseInt(line.substring(22, 26).trim()),
      x: parseFloat(line.substring(30, 38).trim()),
      y: parseFloat(line.substring(38, 46).trim()),
      z: parseFloat(line.substring(46, 54).trim()),
      element: line.substring(76, 78).trim(),
      line: line
    };
  } catch (error) {
    console.warn(`⚠️ [PROTEIN-LOADER] Error parsing atom line:`, line, error);
    return null;
  }
};

/**
 * Finds residues near a given 3D position
 * @param {Object} structure - Protein structure from loadProteinStructure
 * @param {Object} position - 3D position {x, y, z}
 * @param {number} maxDistance - Maximum distance in Å
 * @returns {Array} Array of nearby residues
 */
export const findNearbyResidues = (structure, position, maxDistance = 8.0) => {
  console.log(`🔍 [PROTEIN-LOADER] Finding residues within ${maxDistance}Å of position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);

  const nearbyResidues = [];

  for (const residue of structure.residues) {
    const distance = calculateDistance(position, residue.center);
    
    if (distance <= maxDistance) {
      nearbyResidues.push({
        ...residue,
        distance: distance,
        elementIndex: nearbyResidues.length
      });
    }
  }

  // Sort by distance (closest first)
  nearbyResidues.sort((a, b) => a.distance - b.distance);

  console.log(`✅ [PROTEIN-LOADER] Found ${nearbyResidues.length} nearby residues`);
  console.log(`📊 [PROTEIN-LOADER] Distance range: ${nearbyResidues.length > 0 ? nearbyResidues[0].distance.toFixed(2) : 'N/A'} to ${nearbyResidues.length > 0 ? nearbyResidues[nearbyResidues.length - 1].distance.toFixed(2) : 'N/A'} Å`);

  return nearbyResidues;
};

/**
 * Calculates Euclidean distance between two 3D points
 * @param {Object} point1 - First point {x, y, z}
 * @param {Object} point2 - Second point {x, y, z}
 * @returns {number} Distance in Å
 */
const calculateDistance = (point1, point2) => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Maps screen coordinates to approximate 3D positions
 * This is a simplified mapping - in a real implementation you'd use Mol*'s projection functions
 * @param {Object} plugin - Mol* plugin instance
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @returns {Object|null} Approximate 3D position
 */
export const screenTo3DPosition = (plugin, screenX, screenY) => {
  try {
    // Use Mol*'s built-in coordinate transformation for accurate mapping
    if (plugin && plugin.canvas3d && plugin.canvas3d.camera) {
      try {
        // Get the current camera and viewport
        const camera = plugin.canvas3d.camera;
        const canvas = plugin.canvas3d.canvas;
        
        if (canvas && camera) {
          // Convert screen coordinates to normalized device coordinates
          const rect = canvas.getBoundingClientRect();
          const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;
          
          // Create a ray from the camera through the screen point
          const ray = camera.getRay(ndcX, ndcY);
          
          if (ray && ray.origin && ray.direction) {
            // Cast ray into the scene to find intersection with protein
            // For now, use a point along the ray at a reasonable distance
            const distance = 50; // Å - reasonable distance into the scene
            const intersectionPoint = {
              x: ray.origin[0] + ray.direction[0] * distance,
              y: ray.origin[1] + ray.direction[1] * distance,
              z: ray.origin[2] + ray.direction[2] * distance
            };
            
            console.log(`🎯 [PROTEIN-LOADER] Ray-casted position:`, intersectionPoint);
            return intersectionPoint;
          }
        }
      } catch (molstarError) {
        console.warn(`⚠️ [PROTEIN-LOADER] Mol* coordinate mapping failed:`, molstarError);
      }
    }
    
    // Fallback: Use protein structure center with better positioning
    if (!proteinStructureCache) {
      console.warn(`⚠️ [PROTEIN-LOADER] No protein structure loaded, using center position`);
      return { x: 42.7, y: 34.8, z: 30.8 }; // Approximate center from FragMap data
    }

    // Calculate bounding box of all residues
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const residue of proteinStructureCache.residues) {
      const center = residue.center;
      minX = Math.min(minX, center.x);
      minY = Math.min(minY, center.y);
      minZ = Math.min(minZ, center.z);
      maxX = Math.max(maxX, center.x);
      maxY = Math.max(maxY, center.y);
      maxZ = Math.max(maxZ, center.z);
    }

    // Map screen position to 3D position within bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Add some variation based on screen position (reduced variation)
    const variation = 5; // Å - reduced for better precision
    const offsetX = (screenX - 400) / 200 * variation; // Assuming 800px width
    const offsetY = (screenY - 300) / 200 * variation; // Assuming 600px height

    const position = {
      x: centerX + offsetX,
      y: centerY + offsetY,
      z: centerZ
    };
    
    console.log(`🎯 [PROTEIN-LOADER] Fallback position:`, position);
    return position;

  } catch (error) {
    console.error(`❌ [PROTEIN-LOADER] Error in screenTo3DPosition:`, error);
    return { x: 42.7, y: 34.8, z: 30.8 }; // Center of FragMap space
  }
};

/**
 * Gets a description of a residue selection
 * @param {Array} residues - Array of residue objects
 * @returns {string} Human-readable description
 */
export const getResidueSelectionDescription = (residues) => {
  if (residues.length === 0) return 'No residues selected';
  if (residues.length === 1) {
    const r = residues[0];
    return `${r.resName}${r.resSeq} (chain ${r.chainId})`;
  }

  const firstResidue = residues[0];
  const lastResidue = residues[residues.length - 1];

  // Check if residues are contiguous on the same chain
  if (firstResidue.chainId === lastResidue.chainId) {
    const isContiguous = residues.every((residue, index) => {
      if (index === 0) return true;
      return residue.resSeq === residues[index - 1].resSeq + 1;
    });

    if (isContiguous) {
      return `${firstResidue.chainId}: ${firstResidue.resName}${firstResidue.resSeq}-${lastResidue.resName}${lastResidue.resSeq}`;
    }
  }

  // Non-contiguous or multiple chains
  const chainCount = new Set(residues.map(r => r.chainId)).size;
  return `${residues.length} residues across ${chainCount} chain${chainCount > 1 ? 's' : ''}`;
};

/**
 * Clears the protein structure cache
 */
export const clearProteinStructureCache = () => {
  proteinStructureCache = null;
  console.log(`🔄 [PROTEIN-LOADER] Protein structure cache cleared`);
};
