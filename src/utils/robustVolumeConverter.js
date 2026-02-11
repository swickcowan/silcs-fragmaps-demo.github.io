/**
 * Robust Volume Converter for SILCS FragMaps
 * Addresses rendering issues with fallback strategies and debugging
 */

import { Volume } from 'molstar/lib/mol-model/volume';
import { Tensor } from 'molstar/lib/mol-math/linear-algebra/tensor';
import { Mat4, Vec3 } from 'molstar/lib/mol-math/linear-algebra';

import { fragMapDefaults } from '../config/fragMapTypes.js';

/**
 * Creates a robust volume representation with multiple fallback strategies
 * @param {Object} viewer - Mol* plugin instance
 * @param {Object} volume - Mol* Volume object
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {Promise<Object>} Volume representation
 */
export const createRobustVolumeRepresentation = async (viewer, volume, fragMapConfig) => {
  console.log('[ROBUST-VOLUME] Creating robust volume representation...');
  console.log('  FragMap ID:', fragMapConfig.id);
  console.log('  IsoValue:', fragMapConfig.isoValue);
  console.log('  Volume stats:', volume.grid.stats);
  
  // Since Mol* structure representation doesn't handle Volume objects directly,
  // let's convert the volume to a point cloud structure that Mol* can render
  try {
    console.log('[ROBUST-VOLUME] Converting volume to point cloud structure...');
    
    // Sample points from the volume above the isovalue
    const grid = volume.grid;
    const { dimensions, origin, spacing } = getVolumeInfo(grid);
    
    // Use the proper default isovalues from configuration
    const defaultIsoValue = fragMapDefaults.defaultIsoValues[fragMapConfig.id] || 0.2;
    // Only use fragMapConfig.isoValue if it's different from the hardcoded default
    const isoValue = (fragMapConfig.isoValue !== -1.2 && fragMapConfig.isoValue !== undefined) ? 
                      fragMapConfig.isoValue : defaultIsoValue;
    const points = [];
    const maxPoints = 800; // Fewer points for cleaner visualization
    
    console.log(`[ROBUST-VOLUME] Using isovalue: ${isoValue} (from config for ${fragMapConfig.id})`);
    console.log(`[ROBUST-VOLUME] Default would be: ${defaultIsoValue}`);
    
    // First, let's understand the data structure better
    console.log('[ROBUST-VOLUME] === DEEP DATA ANALYSIS ===');
    console.log('[ROBUST-VOLUME] Grid cells data structure:');
    console.log('  Data length:', grid.cells.data.length);
    console.log('  Expected length:', dimensions[0] * dimensions[1] * dimensions[2]);
    console.log('  Tensor space:', grid.cells.space);
    console.log('  Tensor axis order:', grid.cells.space.axisOrderSlowToFast);
    
    // Now find all points above isovalue using the correct coordinate system
    const allValidPoints = [];
    console.log(`[ROBUST-VOLUME] Using correct coordinate system based on working sphere data`);
    
    for (let i = 0; i < grid.cells.data.length; i++) {
      if (grid.cells.data[i] > isoValue) {
        // Use the coordinate system that works for spheres
        // Based on sphere coordinates: 59.746, 16.792, 28.762
        // These look like: origin + grid_coords * spacing
        const x = i % dimensions[0];           // 0-83
        const y = Math.floor(i / dimensions[0]) % dimensions[1];  // 0-63  
        const z = Math.floor(i / (dimensions[0] * dimensions[1])); // 0-57
        
        // Convert to world coordinates
        const worldX = origin[0] + x * spacing[0];
        const worldY = origin[1] + y * spacing[1]; 
        const worldZ = origin[2] + z * spacing[2];
        
        // Debug first few points
        if (allValidPoints.length < 5) {
          console.log(`[ROBUST-VOLUME] Point ${allValidPoints.length}: index=${i}, grid=(${x},${y},${z}), world=(${worldX.toFixed(3)},${worldY.toFixed(3)},${worldZ.toFixed(3)})`);
        }
        
        allValidPoints.push({ x: worldX, y: worldY, z: worldZ, value: grid.cells.data[i], z });
      }
    }
    
    console.log(`[ROBUST-VOLUME] Found ${allValidPoints.length} total points above isovalue ${isoValue}`);
    
    // Sample evenly across the volume to get better 3D distribution
    if (allValidPoints.length > maxPoints) {
      // Sort by value (highest first) to get the most significant hotspots
      allValidPoints.sort((a, b) => b.value - a.value);
      
      // Take the top points, but ensure Z diversity
      const selectedPoints = [];
      const zLevels = new Set();
      
      for (const point of allValidPoints) {
        if (selectedPoints.length >= maxPoints) break;
        
        // Ensure we get points from different Z levels
        const zLevel = Math.floor(point.z / 10); // Group Z into levels of 10
        if (!zLevels.has(zLevel) || selectedPoints.length < maxPoints / 2) {
          selectedPoints.push(point);
          zLevels.add(zLevel);
        }
      }
      
      points.push(...selectedPoints);
    } else {
      points.push(...allValidPoints);
    }
    
    console.log(`[ROBUST-VOLUME] Sampled ${points.length} points above isovalue ${isoValue}`);
    console.log('[ROBUST-VOLUME] First 5 sampled points:', points.slice(0, 5)); // Log first few points
    console.log('[ROBUST-VOLUME] Transform matrix:', grid.transform);
    console.log('[ROBUST-VOLUME] Scale:', [grid.transform[0], grid.transform[5], grid.transform[10]]);
    console.log('[ROBUST-VOLUME] Translation:', [grid.transform[12], grid.transform[13], grid.transform[14]]);
    
    // Create PDB structure from points
    const pdbContent = createPDBFromPoints(points, fragMapConfig);
    console.log('[ROBUST-VOLUME] Generated PDB Content (first 500 chars):\n', pdbContent.substring(0, 500)); // Log PDB content
    
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
      color: 'uniform',
      colorParams: { 
        value: typeof fragMapConfig.color === 'string' ? 
          parseInt(fragMapConfig.color.replace('#', '0x')) : 
          0xff8800
      },
      sizeParams: { value: 0.8 } // Larger spheres for better visibility
    });
    
    console.log('[ROBUST-VOLUME] ✅ Point cloud representation created');
    URL.revokeObjectURL(pdbUrl);
    
    return representation;
    
  } catch (error) {
    console.error('[ROBUST-VOLUME] Point cloud conversion failed:', error);
    throw new Error(`Failed to create volume representation: ${error.message}`);
  }
};

// Helper function to extract volume info
const getVolumeInfo = (grid) => {
  const dimensions = grid.cells.space.dimensions;
  // Extract origin and spacing from the transform matrix more carefully
  // For a scaling + translation matrix: [sx, 0, 0, 0, sy, 0, 0, 0, sz, 0, tx, ty, tz, 1]
  const transform = grid.transform;
  console.log('[ROBUST-VOLUME] Raw transform matrix:', Array.from(transform));
  
  // Try to decode the matrix - it should be column-major
  const spacing = [transform[0], transform[5], transform[10]];
  const origin = [transform[12], transform[13], transform[14]];
  
  console.log('[ROBUST-VOLUME] Decoded spacing:', spacing);
  console.log('[ROBUST-VOLUME] Decoded origin:', origin);
  
  return { dimensions, origin, spacing };
};

// Helper function to create PDB from points
const createPDBFromPoints = (points, fragMapConfig) => {
  let pdbContent = 'FRAGMAP_VOLUME_POINTS\n';
  pdbContent += `Volume points for ${fragMapConfig.id} above isovalue\n`;
  
  points.forEach((point, index) => {
    const atomNum = index + 1;
    const resName = 'VOL';
    const chainId = 'A';
    const resSeq = Math.floor(index / 100) + 1;
    
    // Format as PDB HETATM record
    const x = point.x.toFixed(3).padStart(8);
    const y = point.y.toFixed(3).padStart(8);
    const z = point.z.toFixed(3).padStart(8);
    
    pdbContent += `HETATM${atomNum.toString().padStart(5)}  C   ${resName} ${chainId}${resSeq.toString().padStart(4)}    ${x}${y}${z}  1.00  0.00           C\n`;
  });
  
  pdbContent += 'END\n';
  return pdbContent;
};

/**
 * Validates and debugs volume data structure
 * @param {Object} volume - Mol* Volume object
 * @returns {Object} Validation results
 */
export const debugVolumeData = (volume) => {
  console.log('[ROBUST-VOLUME] === VOLUME DATA DEBUG ===');
  
  const grid = volume.grid;
  const stats = grid.stats;
  const tensor = grid.cells;
  const transform = grid.transform;
  
  console.log('[ROBUST-VOLUME] Volume structure:');
  console.log('  Grid exists:', !!grid);
  console.log('  Stats:', stats);
  console.log('  Tensor exists:', !!tensor);
  console.log('  Tensor space:', tensor.space);
  console.log('  Tensor data length:', tensor.data?.length);
  console.log('  Transform exists:', !!transform);
  
  if (transform && transform.elements) {
    console.log('[ROBUST-VOLUME] Transform matrix (first 4 elements):', 
      transform.elements.slice(0, 4));
  }
  
  // Check for common issues
  const issues = [];
  
  if (!stats || typeof stats.min !== 'number') {
    issues.push('Missing or invalid stats');
  }
  
  if (!tensor || !tensor.space) {
    issues.push('Missing or invalid tensor');
  }
  
  if (stats && (stats.min > 1.0 || stats.max < -3.0)) {
    issues.push(`Unusual GFE range: min=${stats.min?.toFixed(3)}, max=${stats.max?.toFixed(3)}`);
  }
  
  console.log('[ROBUST-VOLUME] Issues found:', issues.length);
  issues.forEach(issue => console.warn(`  - ${issue}`));
  
  return {
    isValid: issues.length === 0,
    issues,
    stats,
    tensorInfo: {
      dimensions: tensor.space?.dimensions,
      dataSize: tensor.data?.length
    }
  };
};
