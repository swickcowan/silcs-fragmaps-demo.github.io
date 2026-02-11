/**
 * Enhanced Sphere Rendering for SILCS FragMaps
 * Provides improved visualization using properly positioned spheres
 * This is a fallback approach until proper Mol* volume API is working
 */

import { PluginCommands } from 'molstar/lib/mol-plugin/commands';

const hexToMolstarColor = (hex) => {
  const normalized = String(hex || '').replace('#', '').trim();
  if (normalized.length !== 6) return 0xffffff;
  const value = parseInt(normalized, 16);
  return Number.isFinite(value) ? value : 0xffffff;
};

/**
 * Creates enhanced sphere representation from FragMap data
 * @param {Object} plugin - Mol* plugin instance
 * @param {Object} fragMapData - Parsed FragMap data
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {Promise<Object>} Representation object
 */
export const createSphereRepresentation = async (plugin, fragMapData, fragMapConfig) => {
  try {
    console.log('Creating enhanced sphere representation for:', fragMapConfig.id);
    
    // Generate spheres from grid data
    const spheres = generateSpheresFromGrid(
      fragMapData.gridData, 
      fragMapData.gridInfo, 
      fragMapConfig.isoValue
    );
    
    console.log(`Generated ${spheres.length} spheres for ${fragMapConfig.id}`);
    
    if (spheres.length === 0) {
      throw new Error(`No spheres generated for ${fragMapConfig.id} at isovalue ${fragMapConfig.isoValue}`);
    }
    
    // Create PDB structure from spheres
    const pdbContent = createPDBFromSpheres(spheres, fragMapConfig);
    
    // Create blob and load as structure
    const blob = new Blob([pdbContent], { type: 'text/plain' });
    const pdbUrl = URL.createObjectURL(blob);
    
    const structureData = await plugin.builders.data.download({ url: pdbUrl, isBinary: false });
    const trajectory = await plugin.builders.structure.parseTrajectory(structureData, 'pdb');
    const model = await plugin.builders.structure.createModel(trajectory);
    const structure = await plugin.builders.structure.createStructure(model);
    
    // Create enhanced representation
    const representation = await plugin.builders.structure.representation.addRepresentation(structure, {
      type: 'space-filling',
      color: 'uniform',
      colorParams: { value: hexToMolstarColor(fragMapConfig.color) },
      params: {
        sizeFactor: 0.8, // Slightly smaller spheres for better visualization
        alpha: 0.6, // Transparency for depth perception
        ignoreLight: false, // Apply lighting
        metalness: 0.1, // Slight metallic sheen
        roughness: 0.4, // Semi-glossy appearance
        emissive: false, // Not glowing
        lod: {
          levels: [
            { distance: 0, scale: 1, sizeFactor: 0.8 },
            { distance: 15, scale: 0.7, sizeFactor: 0.6 },
            { distance: 30, scale: 0.5, sizeFactor: 0.4 }
          ]
        }
      }
    });
    
    console.log('Enhanced sphere representation created:', representation);
    
    // Clean up blob URL
    URL.revokeObjectURL(pdbUrl);
    
    return {
      structure,
      representation,
      spheres: spheres.length
    };
    
  } catch (error) {
    console.error('Error creating sphere representation:', error);
    throw error;
  }
};

/**
 * Generates enhanced spheres from grid data
 * @param {Float32Array} gridData - Grid data values
 * @param {Object} gridInfo - Grid information
 * @param {number} isovalue - Threshold value
 * @returns {Array} Array of sphere objects
 */
const generateSpheresFromGrid = (gridData, gridInfo, isovalue) => {
  const spheres = [];
  const nx = gridInfo.nx || 40;
  const ny = gridInfo.ny || 40; 
  const nz = gridInfo.nz || 40;
  const spacing = gridInfo.grid_spacing || 0.8;
  
  // Use real binding site coordinates - align with protein
  const origin = [
    20.81, // Real binding site center X
    10.74, // Real binding site center Y  
    31.16  // Real binding site center Z
  ];

  // Distance cutoff to avoid showing grid hits far away from the pocket.
  // This prevents confusing "floating" points on the other side of the protein.
  const maxDistanceA = 12.0;
  const maxDistanceSq = maxDistanceA * maxDistanceA;
  
  // Calculate value range for adaptive sizing
  let maxValue = -Infinity;
  let minValue = Infinity;
  
  for (let i = 0; i < gridData.length; i++) {
    maxValue = Math.max(maxValue, gridData[i]);
    minValue = Math.min(minValue, gridData[i]);
  }
  
  console.log(`Grid data range: ${minValue.toFixed(2)} to ${maxValue.toFixed(2)}`);
  
  // Enhanced sampling with adaptive density
  const sampleRate = Math.max(1, Math.floor(spacing * 2)); // Adaptive sampling
  
  for (let x = 0; x < nx; x += sampleRate) {
    for (let y = 0; y < ny; y += sampleRate) {
      for (let z = 0; z < nz; z += sampleRate) {
        const idx = x + y * nx + z * nx * ny;
        const value = gridData[idx];
        
        // Use threshold logic based on whether values are favorable or unfavorable
        const isFavorable = value < 0; // Negative values are favorable in SILCS
        
        if ((isFavorable && value <= isovalue) || (!isFavorable && value >= isovalue)) {
          // Calculate sphere properties
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const intensity = isFavorable ? 
            Math.abs(value - minValue) / Math.abs(minValue - isovalue) :
            (value - isovalue) / (maxValue - isovalue);
          
          // Adaptive radius based on value intensity
          const baseRadius = 0.3;
          const radius = baseRadius * (0.5 + intensity * 1.5);
          
          // Adaptive opacity
          const opacity = Math.min(0.8, 0.3 + intensity * 0.5);
          
          // Calculate world coordinates - center grid on binding site
          const worldX = origin[0] + (x - nx/2) * spacing;
          const worldY = origin[1] + (y - ny/2) * spacing;
          const worldZ = origin[2] + (z - nz/2) * spacing;

          const ddx = worldX - origin[0];
          const ddy = worldY - origin[1];
          const ddz = worldZ - origin[2];
          const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
          if (distSq > maxDistanceSq) {
            continue;
          }
          
          spheres.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            value: value,
            radius: radius,
            opacity: opacity,
            intensity: intensity,
            normalizedValue: normalizedValue,
            isFavorable: isFavorable
          });
        }
      }
    }
  }
  
  // Sort by intensity for better visual layering
  spheres.sort((a, b) => b.intensity - a.intensity);
  
  console.log(`Generated ${spheres.length} spheres with threshold ${isovalue}`);
  
  return spheres.slice(0, 500); // Limit for performance
};

/**
 * Creates PDB content from spheres
 * @param {Array} spheres - Array of sphere objects
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {string} PDB content
 */
const createPDBFromSpheres = (spheres, fragMapConfig) => {
  let pdbContent = `HEADER    FRAGMAP ${fragMapConfig.id.toUpperCase()}\n`;
  pdbContent += `TITLE     ${fragMapConfig.name} FragMap Visualization\n`;
  pdbContent += `REMARK    Generated from SILCS FragMap data\n`;
  pdbContent += `REMARK    Isovalue: ${fragMapConfig.isoValue.toFixed(2)}\n`;
  pdbContent += `REMARK    Spheres: ${spheres.length}\n\n`;
  
  spheres.forEach((sphere, index) => {
    const atomIndex = index + 1;
    const element = 'C'; // Use carbon for all spheres
    const residueName = 'FRG';
    const chainId = 'A';
    const residueIndex = 1;
    
    // Format coordinates to PDB standard
    const x = sphere.x.toFixed(3).padStart(8);
    const y = sphere.y.toFixed(3).padStart(8);
    const z = sphere.z.toFixed(3).padStart(8);
    
    pdbContent += `ATOM${atomIndex.toString().padStart(5)}  ${element.padEnd(2)}   ${residueName} ${chainId} ${residueIndex.toString().padStart(4)}    ${x}${y}${z}  1.00  0.00           ${element.padEnd(2)}  \n`;
  });
  
  pdbContent += 'END\n';
  
  return pdbContent;
};

/**
 * Updates sphere representation with new isovalue
 * @param {Object} plugin - Mol* plugin instance
 * @param {Object} representation - Existing representation
 * @param {Object} fragMapData - FragMap data
 * @param {Object} fragMapConfig - Updated configuration
 * @returns {Promise<Object>} New representation object
 */
export const updateSphereRepresentation = async (plugin, oldRepresentation, fragMapData, fragMapConfig) => {
  try {
    console.log(`Updating sphere representation for ${fragMapConfig.id} with isovalue ${fragMapConfig.isoValue}`);
    
    // Remove old representation
    if (oldRepresentation) {
      await PluginCommands.State.RemoveObject(plugin, {
        state: plugin.state.data,
        ref: oldRepresentation.ref
      });
    }
    
    // Create new representation
    const newRepresentation = await createSphereRepresentation(plugin, fragMapData, fragMapConfig);
    
    console.log('Sphere representation updated successfully');
    return newRepresentation;
    
  } catch (error) {
    console.error('Error updating sphere representation:', error);
    throw error;
  }
};

/**
 * Removes sphere representation
 * @param {Object} plugin - Mol* plugin instance
 * @param {Object} representation - Representation to remove
 * @returns {Promise<void>}
 */
export const removeSphereRepresentation = async (plugin, representation) => {
  try {
    if (representation) {
      await PluginCommands.State.RemoveObject(plugin, {
        state: plugin.state.data,
        ref: representation.ref
      });
    }
    
    console.log('Sphere representation removed successfully');
  } catch (error) {
    console.error('Error removing sphere representation:', error);
    throw error;
  }
};
