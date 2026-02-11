/**
 * Protein Region Analysis Utilities
 * Enhanced protein picking and residue mapping for SILCS FragMaps
 * Uses PDB file data for reliable structure detection
 */
import { loadProteinStructure, findNearbyResidues, screenTo3DPosition, getResidueSelectionDescription } from './proteinStructureLoader.js';

/**
 * Detects protein region from Mol* canvas click using PDB data
 * @param {Object} plugin - Mol* plugin instance
 * @param {number} x - Click x coordinate
 * @param {number} y - Click y coordinate
 * @returns {Object|null} Protein region data or null if no selection
 */
export const detectProteinRegion = async (plugin, x, y) => {
  console.log(`🔍 [PROTEIN-ANALYZER] Detecting protein region at (${x}, ${y}) using PDB data`);
  
  try {
    // Load protein structure from PDB file
    const proteinStructure = await loadProteinStructure();
    
    // Convert screen coordinates to approximate 3D position
    const position3D = screenTo3DPosition(plugin, x, y);
    console.log(`🔍 [PROTEIN-ANALYZER] Mapped screen coords to 3D position:`, position3D);
    
    // Debug: Show FragMap coordinate ranges for comparison
    console.log(`🔍 [PROTEIN-ANALYZER] FragMap coordinate ranges (from converted data):`);
    console.log(`   X: ~4-84 Å, Y: ~2-66 Å, Z: ~1-59 Å`);
    console.log(`🔍 [PROTEIN-ANALYZER] Protein structure bounds:`);
    
    // Calculate protein structure bounds
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const residue of proteinStructure.residues) {
      const center = residue.center;
      minX = Math.min(minX, center.x);
      minY = Math.min(minY, center.y);
      minZ = Math.min(minZ, center.z);
      maxX = Math.max(maxX, center.x);
      maxY = Math.max(maxY, center.y);
      maxZ = Math.max(maxZ, center.z);
    }
    
    console.log(`   X: ${minX.toFixed(1)} to ${maxX.toFixed(1)} Å`);
    console.log(`   Y: ${minY.toFixed(1)} to ${maxY.toFixed(1)} Å`);
    console.log(`   Z: ${minZ.toFixed(1)} to ${maxZ.toFixed(1)} Å`);
    
    // Check if coordinates need alignment
    const needsAlignment = 
      Math.abs(minX - 4) > 10 || 
      Math.abs(maxX - 84) > 10 ||
      Math.abs(minY - 2) > 10 ||
      Math.abs(maxY - 66) > 10;
    
    if (needsAlignment) {
      console.warn(`⚠️ [PROTEIN-ANALYZER] Protein coordinates may not align with FragMap coordinates!`);
      console.warn(`   Consider applying coordinate transformation to align systems`);
    }
    
    // Find nearby residues
    const nearbyResidues = findNearbyResidues(proteinStructure, position3D, 8.0);
    
    if (nearbyResidues.length === 0) {
      console.log(`❌ [PROTEIN-ANALYZER] No residues found near click position`);
      return null;
    }
    
    // Convert to expected format with coordinate alignment if needed
    const residues = nearbyResidues.map(r => {
      let coordinates = r.center;
      
      // Apply coordinate transformation if protein doesn't align with FragMap space
      if (needsAlignment || true) {  // Force alignment for now
        // The issue seems to be that protein coordinates are in a different scale/space
        // Let's try to map them more intelligently to FragMap space
        // FragMap space: X: 4-84, Y: 2-66, Z: 1-59
        // We need to transform protein coordinates to match this range
        
        coordinates = {
          x: (r.center.x * 2) + 20,  // Scale and offset to match FragMap X range
          y: (r.center.y * 2) + 20,  // Scale and offset to match FragMap Y range  
          z: (r.center.z * 2) + 15   // Scale and offset to match FragMap Z range
        };
        console.log(`🔄 [PROTEIN-ANALYZER] Transformed coordinates:`, r.center, '→', coordinates);
      }
      
      return {
        chainId: r.chainId,
        seqId: r.resSeq,
        resName: r.resName,
        elementIndex: r.elementIndex,
        coordinates: coordinates,
        atomCount: r.atoms.length,
        distance: r.distance
      };
    });
    
    // Calculate bounds
    const bounds = calculateResidueBounds(residues, plugin);
    
    console.log(`✅ [PROTEIN-ANALYZER] Found ${residues.length} residues using PDB data`);
    console.log(`📝 [PROTEIN-ANALYZER] Selection: ${getResidueSelectionDescription(nearbyResidues)}`);
    console.log(`📐 [PROTEIN-ANALYZER] Bounds:`, bounds);
    
    return {
      residues,
      bounds,
      loci: null,
      isDummy: false,
      source: 'pdb-data'
    };
    
  } catch (error) {
    console.error(`❌ [PROTEIN-ANALYZER] Error detecting protein region:`, error);
    console.error(`❌ [PROTEIN-ANALYZER] Error details:`, error.message, error.stack);
    return null;
  }
};

/**
 * Creates a dummy protein selection for testing purposes
 * @returns {Array} Array of dummy residue objects
 */
const createDummyProteinSelection = () => {
  console.log(`🔄 [PROTEIN-ANALYZER] Creating dummy protein selection for testing`);
  
  // Create a realistic dummy selection around the center of the protein
  const dummyResidues = [
    { chainId: 'A', seqId: 95, resName: 'VAL', elementIndex: 0, coordinates: { x: 10.5, y: 15.2, z: 8.7 }, atomCount: 12 },
    { chainId: 'A', seqId: 96, resName: 'ASP', elementIndex: 1, coordinates: { x: 11.8, y: 16.1, z: 9.3 }, atomCount: 11 },
    { chainId: 'A', seqId: 97, resName: 'LYS', elementIndex: 2, coordinates: { x: 13.2, y: 15.8, z: 8.9 }, atomCount: 15 },
    { chainId: 'A', seqId: 98, resName: 'GLU', elementIndex: 3, coordinates: { x: 12.9, y: 14.5, z: 7.8 }, atomCount: 12 },
    { chainId: 'A', seqId: 99, resName: 'MET', elementIndex: 4, coordinates: { x: 14.1, y: 16.4, z: 9.7 }, atomCount: 13 },
    { chainId: 'A', seqId: 100, resName: 'GLY', elementIndex: 5, coordinates: { x: 15.3, y: 15.9, z: 8.5 }, atomCount: 7 },
    { chainId: 'A', seqId: 101, resName: 'THR', elementIndex: 6, coordinates: { x: 14.8, y: 14.7, z: 7.6 }, atomCount: 11 },
    { chainId: 'A', seqId: 102, resName: 'ILE', elementIndex: 7, coordinates: { x: 16.2, y: 16.8, z: 9.1 }, atomCount: 14 },
    { chainId: 'A', seqId: 103, resName: 'SER', elementIndex: 8, coordinates: { x: 15.7, y: 15.3, z: 8.2 }, atomCount: 10 },
    { chainId: 'A', seqId: 104, resName: 'LEU', elementIndex: 9, coordinates: { x: 17.1, y: 14.9, z: 7.4 }, atomCount: 13 },
    { chainId: 'A', seqId: 105, resName: 'PRO', elementIndex: 10, coordinates: { x: 16.5, y: 17.2, z: 8.8 }, atomCount: 11 }
  ];
  
  console.log(`🔄 [PROTEIN-ANALYZER] Created ${dummyResidues.length} dummy residues`);
  console.log(`🔄 [PROTEIN-ANALYZER] Dummy range: ${dummyResidues[0].resName}${dummyResidues[0].seqId} to ${dummyResidues[dummyResidues.length - 1].resName}${dummyResidues[dummyResidues.length - 1].seqId}`);
  
  return dummyResidues;
};

/**
 * Extracts residue information from Mol* loci
 * @param {Object} loci - Mol* loci object
 * @returns {Array} Array of residue objects
 */
export const extractResiduesFromLoci = (loci) => {
  console.log(`🔍 [PROTEIN-ANALYZER] Extracting residues from loci:`, loci);
  
  const residues = [];
  
  try {
    if (!loci || !loci.structure) {
      console.log(`⚠️ [PROTEIN-ANALYZER] Invalid loci structure`);
      return residues;
    }
    
    const structure = loci.structure;
    
    // Extract residues from loci elements
    if (loci.elements && loci.elements.length > 0) {
      for (const element of loci.elements) {
        try {
          // Get residue information from element
          const residueInfo = structure.residues.get(element);
          if (residueInfo) {
            const residue = {
              chainId: residueInfo.chain.id || 'A',
              seqId: residueInfo.seqNum || 1,
              resName: residueInfo.compId || 'UNK',
              elementIndex: element,
              coordinates: getResidueCoordinates(residueInfo, structure),
              atomCount: residueInfo.atoms.length || 0
            };
            
            residues.push(residue);
            console.log(`✅ [PROTEIN-ANALYZER] Extracted residue: ${residue.resName}${residue.seqId} (chain ${residue.chainId})`);
          }
        } catch (elementError) {
          console.warn(`⚠️ [PROTEIN-ANALYZER] Error extracting element:`, elementError);
        }
      }
    }
    
    // Alternative extraction method if elements approach fails
    if (residues.length === 0 && loci.unit && loci.unit.ranges) {
      for (const range of loci.unit.ranges) {
        try {
          const startResidue = structure.residues.get(range.start);
          const endResidue = structure.residues.get(range.end);
          
          if (startResidue && endResidue) {
            for (let i = startResidue.seqNum; i <= endResidue.seqNum; i++) {
              const residue = structure.residues.find(r => r.seqNum === i);
              if (residue) {
                residues.push({
                  chainId: residue.chain.id || 'A',
                  seqId: residue.seqNum || i,
                  resName: residue.compId || 'UNK',
                  elementIndex: i,
                  coordinates: getResidueCoordinates(residue, structure),
                  atomCount: residue.atoms.length || 0
                });
              }
            }
          }
        } catch (rangeError) {
          console.warn(`⚠️ [PROTEIN-ANALYZER] Error processing range:`, rangeError);
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ [PROTEIN-ANALYZER] Error extracting residues from loci:`, error);
  }
  
  console.log(`📊 [PROTEIN-ANALYZER] Extracted ${residues.length} residues total`);
  return residues;
};

/**
 * Gets 3D coordinates for a residue
 * @param {Object} residueInfo - Mol* residue object
 * @param {Object} structure - Mol* structure object
 * @returns {Object} 3D coordinates {x, y, z}
 */
const getResidueCoordinates = (residueInfo, structure) => {
  try {
    // Calculate center of mass for the residue
    let sumX = 0, sumY = 0, sumZ = 0;
    let atomCount = 0;
    
    if (residueInfo.atoms && residueInfo.atoms.length > 0) {
      for (const atom of residueInfo.atoms) {
        const coords = structure.atomicConformation.xtraAtom.r(atom);
        if (coords) {
          sumX += coords[0];
          sumY += coords[1];
          sumZ += coords[2];
          atomCount++;
        }
      }
    }
    
    if (atomCount > 0) {
      return {
        x: sumX / atomCount,
        y: sumY / atomCount,
        z: sumZ / atomCount
      };
    }
    
    // Fallback: use CA atom if available
    const caAtom = residueInfo.atoms.find(atom => atom.type_symbol === 'C' && atom.label === 'CA');
    if (caAtom) {
      const coords = structure.atomicConformation.xtraAtom.r(caAtom);
      if (coords) {
        return { x: coords[0], y: coords[1], z: coords[2] };
      }
    }
    
    // Final fallback: use first atom
    if (residueInfo.atoms && residueInfo.atoms.length > 0) {
      const coords = structure.atomicConformation.xtraAtom.r(residueInfo.atoms[0]);
      if (coords) {
        return { x: coords[0], y: coords[1], z: coords[2] };
      }
    }
    
  } catch (error) {
    console.warn(`⚠️ [PROTEIN-ANALYZER] Error getting residue coordinates:`, error);
  }
  
  // Ultimate fallback
  return { x: 0, y: 0, z: 0 };
};

/**
 * Calculates bounding box around selected residues
 * @param {Array} residues - Array of residue objects
 * @param {Object} plugin - Mol* plugin instance
 * @returns {Object} Bounding box {min: [x,y,z], max: [x,y,z]}
 */
export const calculateResidueBounds = (residues, plugin) => {
  console.log(`📐 [PROTEIN-ANALYZER] Calculating bounds for ${residues.length} residues`);
  
  if (residues.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0]
    };
  }
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const residue of residues) {
    if (residue.coordinates) {
      const { x, y, z } = residue.coordinates;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  }
  
  // Add buffer zone (5Å) for FragMap visualization
  const buffer = 5.0;
  const bounds = {
    min: [minX - buffer, minY - buffer, minZ - buffer],
    max: [maxX + buffer, maxY + buffer, maxZ + buffer]
  };
  
  console.log(`📐 [PROTEIN-ANALYZER] Calculated bounds:`, bounds);
  console.log(`📐 [PROTEIN-ANALYZER] Region size: ${maxX - minX} x ${maxY - minY} x ${maxZ - minZ} Å`);
  
  return bounds;
};

/**
 * Gets description of protein region
 * @param {Array} residues - Array of residue objects
 * @returns {string} Human-readable description
 */
export const getRegionDescription = (residues) => {
  return getResidueSelectionDescription(residues);
};

/**
 * Calculates maximum distance for sphere filtering based on region size
 * @param {Array} residues - Array of residue objects
 * @returns {number} Maximum distance in Å
 */
export const getMaxDistanceForRegion = (residues) => {
  if (residues.length === 0) return 5.0;
  
  // Calculate region size
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const residue of residues) {
    if (residue.coordinates) {
      const { x, y, z } = residue.coordinates;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  }
  
  const regionSize = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  
  // Scale distance based on region size (larger regions get larger search radius)
  const baseDistance = 5.0;
  const scaleFactor = Math.min(2.0, 1.0 + regionSize / 20.0);
  
  const maxDistance = baseDistance * scaleFactor;
  console.log(`📏 [PROTEIN-ANALYZER] Region size: ${regionSize.toFixed(1)}Å, max distance: ${maxDistance.toFixed(1)}Å`);
  
  return maxDistance;
};
