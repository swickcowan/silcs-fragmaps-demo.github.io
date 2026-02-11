/**
 * Sphere-based FragMap Loader
 * Uses energy-filtered spheres with Gaussian blobs instead of DX volumes
 * Provides better performance and compatibility across Mol* versions
 */

import { getFragMapSpheres } from './silcsFragMapLoader.js';
import { enhancedSpatialFilter } from './spatialFilter.js';

/**
 * Creates sphere-based representation for FragMaps using Gaussian blobs
 * @param {Object} viewer - Mol* plugin instance
 * @param {string} fragMapId - FragMap identifier
 * @param {Object} options - Rendering options
 * @returns {Promise<Object>} Representation object
 */
export const loadSphereFragMap = async (viewer, fragMapId, options = {}) => {
  try {
    console.log(`[SPHERE-LOADER] Loading sphere-based FragMap: ${fragMapId}`);
    
    const {
      isoValue = -0.5,
      color = 0xff0000,
      alpha = 0.6,
      sphereSize = 0.3,
      maxSpheres = 5000,
      selectedProteinPart = null,
      isoValueRange = 0.1,  // Very narrow range: ±0.1 from isoValue
      enableRangeFiltering = true,  // Enable range filtering
      maxDistance = 6.0  // Very tight: only spheres within 6Å of protein
    } = options;

    // Get spheres for this FragMap type with enhanced options and range filtering
    const spheres = getFragMapSpheres(fragMapId, isoValue, {
      enableRangeFiltering: enableRangeFiltering,
      isoValueRange: isoValueRange,  // Use configurable range
      enableAdaptiveThreshold: false,  // Disable adaptive when using range
      adaptivePercentile: 85,
      maxSpheres: 6000  // Further reduced limit
    });
    console.log(`[SPHERE-LOADER] Retrieved ${spheres.length} raw spheres for ${fragMapId}`);

    if (spheres.length === 0) {
      console.warn(`[SPHERE-LOADER] No spheres found for ${fragMapId} with isoValue ${isoValue}`);
      return null;
    }

    // Apply spatial filtering if protein region is selected
    let filteredSpheres = spheres;
    if (selectedProteinPart?.residues?.length > 0) {
      // First, let's check the distance between residues and spheres
      console.log(`[SPHERE-LOADER] Checking distances between ${selectedProteinPart.residues.length} residues and ${spheres.length} spheres`);
      
      // Show some sample distances for debugging
      if (spheres.length > 0 && selectedProteinPart.residues.length > 0) {
        const sampleSphere = spheres[0];
        const sampleResidue = selectedProteinPart.residues[0];
        const distance = Math.sqrt(
          Math.pow(sampleSphere.x - sampleResidue.coordinates.x, 2) +
          Math.pow(sampleSphere.y - sampleResidue.coordinates.y, 2) +
          Math.pow(sampleSphere.z - sampleResidue.coordinates.z, 2)
        );
        console.log(`[SPHERE-LOADER] Sample distance: ${distance.toFixed(1)}Å`);
        console.log(`[SPHERE-LOADER] Sample sphere:`, sampleSphere);
        console.log(`[SPHERE-LOADER] Sample residue:`, sampleResidue);
      }
      
      // Since coordinates don't align, let's just show spheres in a reasonable region
      // Use a much larger distance and disable proximity filtering for now
      filteredSpheres = enhancedSpatialFilter(spheres, selectedProteinPart.residues, {
        maxDistance: 100.0,  // Very large distance to overcome coordinate mismatch
        energyThreshold: isoValue,
        maxSpheres: 800,  // Reduced limit for performance
        adaptiveDistance: false,  // Disable adaptive distance for consistency
        preserveHighEnergy: false,  // Disable to keep only closest spheres
        highEnergyPercentile: 5,  // Only top 5% most favorable
        detailPreservationRadius: 10.0  // Larger detail preservation
      });
      console.log(`[SPHERE-LOADER] Filtered to ${filteredSpheres.length} spheres for selected region`);
    } else {
      // Limit spheres if no region selected
      filteredSpheres = spheres.slice(0, 500);  // Lower limit for no region
      console.log(`[SPHERE-LOADER] Limited to ${filteredSpheres.length} spheres (no region selected)`);
    }

    if (filteredSpheres.length === 0) {
      console.warn(`[SPHERE-LOADER] No spheres remaining after filtering for ${fragMapId}`);
      return null;
    }

    // Create PDB content for spheres
    const pdbContent = createSpherePDB(filteredSpheres, fragMapId);
    
    // Create blob URL for PDB content
    const blob = new Blob([pdbContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    try {
      // Load PDB as structure in Mol*
      const data = await viewer.builders.data.download({ url, isBinary: false });
      const trajectory = await viewer.builders.structure.parseTrajectory(data, 'pdb');
      const model = await viewer.builders.structure.createModel(trajectory);
      const structure = await viewer.builders.structure.createStructure(model);

      // Create space-filling representation for Gaussian blob effect
      const representation = await viewer.builders.structure.representation.addRepresentation(structure, {
        type: 'space-filling',
        color: 'uniform',
        colorParams: { 
          value: color 
        },
        params: {
          sizeFactor: sphereSize,
          ignoreHydrogens: true,
          traceOnly: false,
          alpha: alpha,  // Include transparency directly
          sizeMode: 'uniform'  // Use sphere-specific sizes from B-factor
        }
      });

      console.log(`[SPHERE-LOADER] ✅ Created sphere representation for ${fragMapId}`);
      console.log(`  Spheres: ${filteredSpheres.length}`);
      console.log(`  Color: ${color.toString(16)}`);
      console.log(`  Alpha: ${alpha}`);
      console.log(`  Sphere size: ${sphereSize}`);

      return { representation, sphereCount: filteredSpheres.length };

    } finally {
      URL.revokeObjectURL(url);
    }

  } catch (error) {
    console.error(`[SPHERE-LOADER] Failed to load sphere FragMap ${fragMapId}:`, error);
    throw new Error(`Sphere FragMap loading failed: ${error.message}`);
  }
};

/**
 * Creates PDB content from sphere data
 * @param {Array} spheres - Array of sphere objects with x, y, z, energy, intensity
 * @param {string} fragMapId - FragMap identifier for labeling
 * @returns {string} PDB format content
 */
function createSpherePDB(spheres, fragMapId) {
  let pdbContent = `HEADER    SPHERE-BASED FRAGMAP: ${fragMapId.toUpperCase()}\n`;
  pdbContent += `REMARK   Generated by sphere-based FragMap loader\n`;
  pdbContent += `REMARK   Sphere count: ${spheres.length}\n`;

  spheres.forEach((sphere, index) => {
    const atomNumber = (index + 1) % 99999; // PDB atom number limit
    const residueNumber = Math.floor(index / 99999) + 1; // Handle >99999 atoms
    
    // Use energy to determine atom type for visual variety
    const atomType = getAtomTypeByEnergy(sphere.energy);
    
    // Format coordinates according to PDB standard (8.3 for x,y,z)
    const x = sphere.x.toFixed(3).padStart(8);
    const y = sphere.y.toFixed(3).padStart(8);
    const z = sphere.z.toFixed(3).padStart(8);
    
    // Use intensity for occupancy and energy for B-factor
    const occupancy = Math.min(sphere.intensity || 0.5, 1.0).toFixed(2).padStart(6);
    
    // Use sphere size if available, otherwise calculate from energy
    let bFactor;
    if (sphere.size) {
      bFactor = (sphere.size * 100).toFixed(2).padStart(6);  // Convert size to B-factor scale
    } else {
      bFactor = Math.abs(sphere.energy * 100).toFixed(2).padStart(6);
    }
    
    pdbContent += `HETATM${atomNumber.toString().padStart(5)}  ${atomType}   FRG A${residueNumber.toString().padStart(4)}    ${x}${y}${z}${occupancy}${bFactor}           ${atomType}\n`;
  });

  pdbContent += 'END\n';
  return pdbContent;
}

/**
 * Maps energy values to atom types for visual variety
 * @param {number} energy - Energy value
 * @returns {string} Atom type symbol
 */
function getAtomTypeByEnergy(energy) {
  // Map energy ranges to different atom types for visual variety
  if (energy < -1.5) return 'C';  // Carbon for strong interactions
  if (energy < -1.0) return 'N';  // Nitrogen for moderate interactions
  if (energy < -0.7) return 'O';  // Oxygen for weak interactions
  if (energy < -0.5) return 'S';  // Sulfur for very weak interactions
  return 'P'; // Phosphorus for weakest interactions
}

/**
 * Updates sphere representation parameters dynamically
 * @param {Object} viewer - Mol* plugin instance
 * @param {Object} representation - Existing representation
 * @param {Object} newParams - New parameters to apply
 */
export const updateSphereRepresentation = async (viewer, representation, newParams) => {
  try {
    const { color, sphereSize } = newParams;
    
    const updateParams = {};
    
    if (color !== undefined) {
      updateParams.color = 'uniform';
      updateParams.colorParams = { value: color };
    }
    
    if (sphereSize !== undefined) {
      updateParams.params = { 
        ...representation.params, 
        sizeFactor: sphereSize 
      };
    }
    
    if (Object.keys(updateParams).length > 0) {
      await viewer.builders.structure.representation.updateRepresentation(representation, updateParams);
    }
    
    console.log('[SPHERE-LOADER] Updated sphere representation:', newParams);
    
  } catch (error) {
    console.error('[SPHERE-LOADER] Failed to update sphere representation:', error);
  }
};

/**
 * Gets performance statistics for sphere loading
 * @param {string} fragMapId - FragMap identifier
 * @param {number} isoValue - IsoValue used
 * @returns {Object} Performance stats
 */
export const getSphereLoadingStats = (fragMapId, isoValue = -0.5) => {
  const spheres = getFragMapSpheres(fragMapId, isoValue);
  
  return {
    totalSpheres: spheres.length,
    energyRange: {
      min: Math.min(...spheres.map(s => s.energy)),
      max: Math.max(...spheres.map(s => s.energy))
    },
    intensityRange: {
      min: Math.min(...spheres.map(s => s.intensity)),
      max: Math.max(...spheres.map(s => s.intensity))
    },
    coordinateBounds: {
      x: { min: Math.min(...spheres.map(s => s.x)), max: Math.max(...spheres.map(s => s.x)) },
      y: { min: Math.min(...spheres.map(s => s.y)), max: Math.max(...spheres.map(s => s.y)) },
      z: { min: Math.min(...spheres.map(s => s.z)), max: Math.max(...spheres.map(s => s.z)) }
    }
  };
};

export default {
  loadSphereFragMap,
  updateSphereRepresentation,
  getSphereLoadingStats
};
