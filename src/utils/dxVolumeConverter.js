/**
 * DX Volume Converter for Mol*
 * Converts OpenDX format files to Mol* Volume objects
 * Leverages Mol*'s native DX support for better performance and compatibility
 */

import { Tensor } from 'molstar/lib/mol-math/linear-algebra/tensor';

/**
 * Creates a Mol* Volume object from DX format data using the plugin's volume builder
 * @param {Object} viewer - Mol* plugin instance  
 * @param {Object} dxData - Parsed DX data
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {Promise<Object>} Mol* Volume object
 */
export const createDxVolume = async (viewer, dxData, fragMapConfig) => {
  console.log('[DX-VOLUME] Creating Mol* volume from DX data...');
  console.log('  FragMap ID:', fragMapConfig.id);
  console.log('  Grid dimensions:', dxData.gridInfo.nx, 'x', dxData.gridInfo.ny, 'x', dxData.gridInfo.nz);
  console.log('  Data points:', dxData.gridData.length);
  
  try {
    // Create the volume data structure that Mol* expects
    const volumeData = {
      // Grid information
      grid: {
        transform: createTransformMatrix(dxData.gridInfo),
        cells: {
          data: dxData.gridData,
          space: {
            dimensions: [dxData.gridInfo.nx, dxData.gridInfo.ny, dxData.gridInfo.nz],
            axisOrderSlowToFast: [0, 1, 2]
          }
        },
        // Statistics for the volume
        stats: calculateVolumeStats(dxData.gridData)
      },
      // Volume metadata
      label: `fragmap-${fragMapConfig.id}`,
      description: `SILCS FragMap: ${fragMapConfig.name}`,
      sourceData: {
        format: 'dx',
        fragMapId: fragMapConfig.id,
        ...dxData.gridInfo
      }
    };
    
    console.log('[DX-VOLUME] Volume data structure created');
    console.log('  Transform matrix created');
    console.log('  Grid stats:', volumeData.grid.stats);
    
    // Register the volume data first, then create representation
    let volumeRef = volumeData.ref;
    if (!volumeRef) {
      const volumeNode = await viewer.builders.data.upload(volumeData, { label: `fragmap-${fragMapConfig.id}` });
      volumeRef = volumeNode.ref;
    }
    
    // Add representation via the volume builder
    if (viewer.builders.volume?.representation) {
      console.log('[DX-VOLUME] Using builders.volume.representation.addRepresentation');
      const representation = await viewer.builders.volume.representation.addRepresentation(volumeData, {
        type: 'isosurface',
        typeParams: {
          isoValue: fragMapConfig.isoValue || -0.8,
          alpha: fragMapConfig.alpha || 0.7,
          colors: fragMapConfig.color || [1, 0, 0]
        }
      });
      
      return { volume: volumeData, representation };
    }
    
    throw new Error('Volume builder not available in Mol* instance');
    
  } catch (error) {
    console.error('[DX-VOLUME] Failed to create volume:', error);
    throw new Error(`DX Volume creation failed: ${error.message}`);
  }
};

/**
 * Creates a transformation matrix for the volume grid
 * @param {Object} gridInfo - Grid information from DX file
 * @returns {Float32Array} 4x4 transformation matrix in column-major order
 */
const createTransformMatrix = (gridInfo) => {
  const spacing = gridInfo.grid_spacing || 1.0; // Use actual spacing from DX file
  const originX = gridInfo.origin_x || 0;
  const originY = gridInfo.origin_y || 0;
  const originZ = gridInfo.origin_z || 0;
  
  // Create column-major transformation matrix
  // [ sx, 0,  0,  0 ]
  // [ 0,  sy, 0,  0 ]
  // [ 0,  0,  sz, 0 ]
  // [ tx, ty, tz, 1 ]
  const transform = new Float32Array(16);
  
  // Scaling (spacing)
  transform[0] = spacing;   // x-scale
  transform[5] = spacing;   // y-scale  
  transform[10] = spacing;  // z-scale
  
  // Translation (origin)
  transform[12] = originX;   // x-translation
  transform[13] = originY;   // y-translation
  transform[14] = originZ;   // z-translation
  
  // Identity for other elements
  transform[15] = 1.0;
  
  console.log('[DX-VOLUME] Transform matrix:');
  console.log('  Spacing:', spacing);
  console.log('  Origin:', [originX, originY, originZ]);
  
  return transform;
};

/**
 * Calculates volume statistics from grid data
 * @param {Float32Array} gridData - Grid data values
 * @returns {Object} Statistics object
 */
const calculateVolumeStats = (gridData) => {
  if (!gridData || gridData.length === 0) {
    return { min: 0, max: 0, mean: 0, sigma: 0 };
  }
  
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  
  // First pass: calculate sum, min, max
  for (let i = 0; i < gridData.length; i++) {
    const value = gridData[i];
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  
  const mean = sum / gridData.length;
  
  // Second pass: calculate standard deviation
  let sumSquaredDiff = 0;
  for (let i = 0; i < gridData.length; i++) {
    const diff = gridData[i] - mean;
    sumSquaredDiff += diff * diff;
  }
  
  const sigma = Math.sqrt(sumSquaredDiff / gridData.length);
  
  console.log('[DX-VOLUME] Grid statistics:');
  console.log('  Min:', min.toFixed(3));
  console.log('  Max:', max.toFixed(3));
  console.log('  Mean:', mean.toFixed(3));
  console.log('  Sigma:', sigma.toFixed(3));
  
  return { min, max, mean, sigma };
};

/**
 * Creates a volume representation from DX data using Mol* volume rendering
 * @param {Object} viewer - Mol* plugin instance
 * @param {Object} dxData - Parsed DX data
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {Promise<Object>} Volume representation
 */
export const createDxVolumeRepresentation = async (viewer, dxData, fragMapConfig) => {
  console.log('[DX-VOLUME] Creating DX volume representation...');
  
  try {
    // First create the volume object
    const volume = await createDxVolume(viewer, dxData, fragMapConfig);
    
    // Create volume representation using Mol*'s volume rendering
    const representation = await viewer.builders.volume.representation.addRepresentation(volume, {
      type: 'isosurface',
      typeParams: {
        isoValue: fragMapConfig.isoValue || -0.8,
        alpha: 0.6,
        smoothness: 0.5,
        tryUseGpu: true
      },
      color: 'uniform',
      colorParams: {
        value: typeof fragMapConfig.color === 'string' ? 
          parseInt(fragMapConfig.color.replace('#', '0x')) : 
          0xff8800
      }
    });
    
    console.log('[DX-VOLUME] ✅ Volume representation created successfully');
    console.log('  IsoValue:', fragMapConfig.isoValue);
    console.log('  Color:', fragMapConfig.color);
    
    return representation;
    
  } catch (error) {
    console.error('[DX-VOLUME] Volume representation failed:', error);
    throw new Error(`Failed to create volume representation: ${error.message}`);
  }
};

/**
 * Validates DX data structure
 * @param {Object} dxData - Parsed DX data
 * @returns {boolean} True if valid
 */
export const validateDxData = (dxData) => {
  if (!dxData || typeof dxData !== 'object') {
    console.error('[DX-VOLUME] Invalid DX data: not an object');
    return false;
  }
  
  const { gridInfo, gridData } = dxData;
  
  // Check grid info
  if (!gridInfo || typeof gridInfo !== 'object') {
    console.error('[DX-VOLUME] Invalid grid info: missing or not an object');
    return false;
  }
  
  const requiredGridInfo = ['nx', 'ny', 'nz'];
  for (const key of requiredGridInfo) {
    if (!gridInfo[key] || typeof gridInfo[key] !== 'number' || gridInfo[key] <= 0) {
      console.error(`[DX-VOLUME] Invalid grid dimension: ${key} = ${gridInfo[key]}`);
      return false;
    }
  }
  
  // Check grid data
  if (!gridData || !(gridData instanceof Float32Array)) {
    console.error('[DX-VOLUME] Invalid grid data: missing or not Float32Array');
    return false;
  }
  
  const expectedPoints = gridInfo.nx * gridInfo.ny * gridInfo.nz;
  if (gridData.length !== expectedPoints) {
    console.error(`[DX-VOLUME] Grid data length mismatch: expected ${expectedPoints}, got ${gridData.length}`);
    return false;
  }
  
  console.log('[DX-VOLUME] ✅ DX data validation passed');
  console.log(`  Grid: ${gridInfo.nx}x${gridInfo.ny}x${gridInfo.nz}, ${expectedPoints} points`);
  
  return true;
};
