/**
 * Mol* Volume Converter for SILCS FragMaps
 * Implements the senior mol* engineer specifications for proper volume creation
 * Follows the step-by-step implementation plan for optimal visualization
 */

import { Volume } from 'molstar/lib/mol-model/volume';
import { Tensor } from 'molstar/lib/mol-math/linear-algebra/tensor';
import { Mat4, Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { CustomProperties } from 'molstar/lib/mol-model/custom-property';

/**
 * Parses SILCS .map format header and data
 * @param {string} fileContent - Raw file content
 * @returns {Object} Parsed data with metadata and values
 */
const parseSilcsMapFile = (fileContent) => {
  console.log('[MOLSTAR-VOLUME] Parsing SILCS .map file...');

  const lines = fileContent.split('\n');
  const header = {};
  let dataStart = 0;

  // Parse header section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.startsWith('#')) continue;

    // Check if we've reached the data section (numeric values)
    if (/^\s*[\d\.\-]/.test(line)) {
      dataStart = i;
      break;
    }

    // Parse header key-value pairs
    const match = line.match(/(\w+)\s+(.+)/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Convert numeric values
      if (!isNaN(value) && value !== '') {
        value = parseFloat(value);
      }

      // Handle NELEMENTS as array
      if (key === 'NELEMENTS' && typeof value === 'string') {
        const elements = value.split(/\s+/).map(v => parseInt(v.trim()));
        if (elements.length === 3) {
          header.nx = elements[0];
          header.ny = elements[1];
          header.nz = elements[2];
          continue;
        }
      }

      // Handle CENTER as array
      if (key === 'CENTER' && typeof value === 'string') {
        const coords = value.split(/\s+/).map(v => parseFloat(v.trim()));
        if (coords.length === 3) {
          header.centerX = coords[0];
          header.centerY = coords[1];
          header.centerZ = coords[2];
          continue;
        }
      }

      header[key.toLowerCase()] = value;
    }
  }

  // Extract grid data values
  const values = [];
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const numbers = line.split(/\s+/)
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));

    values.push(...numbers);
  }

  console.log('[MOLSTAR-VOLUME] Header parsed:', header);
  console.log('[MOLSTAR-VOLUME] Grid values count:', values.length);

  return { header, values };
};

/**
 * Calculates grid origin from center coordinates (Step 2)
 * SILCS provides center, Mol* needs origin (minimum corner)
 * @param {Object} header - Parsed header with center and dimensions
 * @returns {Object} Origin coordinates and spacing
 */
const calculateGridOrigin = (header) => {
  const spacingX = header.spacing || 1.0;
  const spacingY = header.spacing || 1.0;
  const spacingZ = header.spacing || 1.0;

  const nx = header.nx;
  const ny = header.ny;
  const nz = header.nz;

  // Compute origin (minimum corner) from center
  // For a grid of N points with S spacing, the range is (N-1)*S
  // The origin is Center - Range / 2
  const originX = header.centerX - ((nx - 1) * spacingX) / 2;
  const originY = header.centerY - ((ny - 1) * spacingY) / 2;
  const originZ = header.centerZ - ((nz - 1) * spacingZ) / 2;

  console.log('[MOLSTAR-VOLUME] Grid origin calculation (FIXED):');
  console.log(`  Center: (${header.centerX}, ${header.centerY}, ${header.centerZ})`);
  console.log(`  Dimensions: ${nx} × ${ny} × ${nz}`);
  console.log(`  Spacing: ${spacingX}`);
  console.log(`  Origin: (${originX.toFixed(3)}, ${originY.toFixed(3)}, ${originZ.toFixed(3)})`);

  return {
    origin: Vec3.create(originX, originY, originZ),
    spacing: Vec3.create(spacingX, spacingY, spacingZ),
    dimensions: [nx, ny, nz]
  };
};

/**
 * Creates grid transform matrix (Step 3) - FIXED
 * Maps grid indices to Cartesian Å space
 * Cartesian = Origin + Index * Spacing
 * @param {Vec3} origin - Grid origin
 * @param {Vec3} spacing - Grid spacing
 * @returns {Mat4} Transform matrix
 */
const createGridTransform = (origin, spacing) => {
  // Matrix should be:
  // [ sx  0   0   ox ]
  // [ 0   sy  0   oy ]
  // [ 0   0   sz  oz ]
  // [ 0   0   0   1  ]

  const transform = Mat4.identity();

  // Set scaling (diagonal elements)
  transform[0] = spacing[0];
  transform[5] = spacing[1];
  transform[10] = spacing[2];

  // Set translation (last column)
  transform[12] = origin[0];
  transform[13] = origin[1];
  transform[14] = origin[2];

  console.log('[MOLSTAR-VOLUME] Grid transform matrix created (FIXED)');
  console.log('  Matrix elements:', Array.from(transform));

  return transform;
};

/**
 * Creates Mol* Tensor from grid data (Step 4)
 * @param {Float32Array} values - Grid values
 * @param {Array<number>} dimensions - Grid dimensions [nx, ny, nz]
 * @returns {Tensor} Mol* tensor
 */
const createTensor = (values, dimensions) => {
  // SILCS grids use x-fastest → y → z-slowest ordering
  // Tensor.Space handles column-major conversion automatically
  const space = Tensor.Space(dimensions, [0, 1, 2]); // [x, y, z] axis ordering
  const tensor = Tensor.create(space, values);

  console.log('[MOLSTAR-VOLUME] Tensor created:');
  console.log(`  Shape: [${dimensions.join(', ')}]`);
  console.log(`  Data type: float32`);
  console.log(`  Axis order: [0, 1, 2] (x-fastest → y → z-slowest)`);

  return tensor;
};

/**
 * Computes volume statistics
 * @param {Float32Array} values - Grid values
 * @returns {Object} Statistics {min, max, mean, sigma}
 */
const computeVolumeStats = (values) => {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;

  // First pass: sum, min, max
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const mean = sum / values.length;

  // Second pass: standard deviation
  let sumSquaredDiff = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - mean;
    sumSquaredDiff += diff * diff;
  }

  const sigma = Math.sqrt(sumSquaredDiff / values.length);

  const stats = { min, max, mean, sigma };

  console.log('[MOLSTAR-VOLUME] Volume statistics:');
  console.log(`  Min: ${min.toFixed(3)} kcal/mol`);
  console.log(`  Max: ${max.toFixed(3)} kcal/mol`);
  console.log(`  Mean: ${mean.toFixed(3)} kcal/mol`);
  console.log(`  StdDev: ${sigma.toFixed(3)} kcal/mol`);

  return stats;
};

/**
 * Converts SILCS FragMap to Mol* Volume (Main function)
 * Implements the complete step-by-step conversion pipeline
 * @param {string} fileContent - Raw SILCS .map file content
 * @param {string} fragMapId - FragMap identifier
 * @returns {Promise<Object>} Mol* Volume object
 */
export const convertSilcsToMolstarVolume = async (fileContent, fragMapId) => {
  console.log('[MOLSTAR-VOLUME] === SILCS TO MOL* VOLUME CONVERSION START ===');
  console.log(`[MOLSTAR-VOLUME] Converting FragMap: ${fragMapId}`);

  try {
    // Step 1: Parse the file
    console.log('\n=== STEP 1: PARSING FILE ===');
    const { header, values } = parseSilcsMapFile(fileContent);

    // Validate expected values count
    const expectedValues = header.nx * header.ny * header.nz;
    let processedValues = values;

    if (values.length !== expectedValues) {
      console.warn(`[MOLSTAR-VOLUME] Value count mismatch: expected ${expectedValues}, got ${values.length}`);

      if (values.length < expectedValues) {
        // Pad with zeros
        const paddedValues = new Float32Array(expectedValues);
        paddedValues.set(values);
        processedValues = Array.from(paddedValues);
        console.log(`[MOLSTAR-VOLUME] Padded ${expectedValues - values.length} missing values with zeros`);
      } else {
        // Truncate excess
        processedValues = values.slice(0, expectedValues);
        console.log(`[MOLSTAR-VOLUME] Truncated ${values.length - expectedValues} excess values`);
      }
    }

    // Convert to Float32Array
    const gridValues = new Float32Array(processedValues);

    // Step 2: Compute grid origin
    console.log('\n=== STEP 2: COMPUTING GRID ORIGIN ===');
    const { origin, spacing, dimensions } = calculateGridOrigin(header);

    // Step 3: Create grid transform matrix
    console.log('\n=== STEP 3: CREATING TRANSFORM MATRIX ===');
    const transform = createGridTransform(origin, spacing);

    // Step 4: Create the Tensor
    console.log('\n=== STEP 4: CREATING TENSOR ===');
    const tensor = createTensor(gridValues, dimensions);

    // Step 5: Build the Volume object
    console.log('\n=== STEP 5: BUILDING VOLUME ===');
    const stats = computeVolumeStats(gridValues);

    const grid = {
      transform,
      cells: tensor,
      stats
    };

    const volume = {
      label: `SILCS FragMap - ${fragMapId}`,
      grid: grid,
      sourceData: {
        kind: 'silcs-fragmap',
        name: `silcs-${fragMapId}`,
        data: {}
      },
      customProperties: new CustomProperties(),
      _propertyData: Object.create(null),
      // Add proper volume properties for Mol*
      volume: {
        grid: grid,
        label: `SILCS FragMap - ${fragMapId}`
      }
    };

    console.log('\n=== CONVERSION COMPLETE ===');
    console.log(`[MOLSTAR-VOLUME] ✅ Successfully created Mol* Volume for ${fragMapId}:`);
    console.log(`  - Grid dimensions: ${dimensions.join(' × ')}`);
    console.log(`  - Total voxels: ${gridValues.length.toLocaleString()}`);
    console.log(`  - Data range: ${stats.min.toFixed(3)} to ${stats.max.toFixed(3)} kcal/mol`);
    console.log(`  - Origin: (${origin[0].toFixed(3)}, ${origin[1].toFixed(3)}, ${origin[2].toFixed(3)}) Å`);
    console.log(`  - Spacing: ${spacing[0]} Å`);

    return volume;

  } catch (error) {
    console.error(`[MOLSTAR-VOLUME] ❌ Error converting ${fragMapId}:`, error);
    throw new Error(`Failed to convert SILCS FragMap ${fragMapId}: ${error.message}`);
  }
};

/**
 * Creates Mol* volume representation with optimal parameters
 * @param {Object} viewer - Mol* plugin instance
 * @param {Object} volume - Mol* Volume object
 * @param {Object} fragMapConfig - FragMap configuration (color, isoValue, etc.)
 * @returns {Promise<Object>} Volume representation
 */
export const createVolumeRepresentation = async (viewer, volume, fragMapConfig) => {
  console.log('[MOLSTAR-VOLUME] Creating volume representation...');
  console.log('[MOLSTAR-VOLUME] Volume object structure:', Object.keys(volume));
  console.log('[MOLSTAR-VOLUME] Volume grid:', !!volume.grid);
  console.log('[MOLSTAR-VOLUME] Viewer builders:', Object.keys(viewer.builders));

  try {
    // Import required Mol* modules
    const { Volume } = await import('molstar/lib/mol-model/volume');

    // Check if the volume has the correct structure for Mol*
    if (!volume.grid || !volume.grid.cells || !volume.grid.cells.data) {
      throw new Error('Volume object missing required grid data structure');
    }

    console.log('[MOLSTAR-VOLUME] Volume data validated, attempting representation...');

    // Use volume builder for volume objects
    console.log('[MOLSTAR-VOLUME] Creating volume representation with builder...');

    // Create the volume representation using the appropriate builder
    const isoValue = fragMapConfig.isoValue !== undefined ?
      Volume.IsoValue.absolute(fragMapConfig.isoValue) :
      Volume.IsoValue.absolute(-0.8);

    const reprParams = {
      type: 'isosurface',
      typeParams: {
        isoValue,
        alpha: 0.7,
        smoothness: 1,
        style: 'solid'
      },
      color: 'uniform',
      colorParams: {
        value: typeof fragMapConfig.color === 'string' ?
          parseInt(fragMapConfig.color.replace('#', '0x')) :
          0xff8800
      }
    };

    // Use a more robust way to add the representation
    // First, ensure the volume is registered in the state
    let volumeRef = volume.ref;
    if (!volumeRef) {
      const volumeNode = await viewer.builders.data.upload(volume, { label: `fragmap-${fragMapConfig.id}` });
      volumeRef = volumeNode.ref;
    }

    // Add representation via the volume builder if available
    if (viewer.builders.volume?.representation) {
      console.log('[MOLSTAR-VOLUME] Using builders.volume.representation.addRepresentation');
      const representation = await viewer.builders.volume.representation.addRepresentation(volume, reprParams);

      // Tag the representation for easy identification
      if (representation && representation.ref) {
        // We can manually update the label if needed, but the builder often sets it
        console.log(`[MOLSTAR-VOLUME] Representation created with ref: ${representation.ref}`);
      }
      return representation;
    } else {
      // Fallback to structure representation builder if volume one is missing (unlikely in modern Mol*)
      console.log('[MOLSTAR-VOLUME] Fallback: Using builders.structure.representation.addRepresentation');
      const representation = await viewer.builders.structure.representation.addRepresentation(volume, {
        ...reprParams,
        type: 'volume' // Some versions use 'volume' as type when adding to structure builder
      });
      return representation;
    }


  } catch (error) {
    console.error('[MOLSTAR-VOLUME] All volume representation attempts failed:', error);
    throw error;
  }
};

/**
 * Validation checklist for volume conversion
 * @param {Object} volume - Mol* Volume object
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {boolean} True if validation passes
 */
export const validateVolumeConversion = (volume, fragMapConfig) => {
  console.log('[MOLSTAR-VOLUME] === VALIDATION CHECKLIST ===');

  let validationPassed = true;

  try {
    // Check 1: Number of values matches grid dimensions
    const grid = volume.grid;
    if (!grid || !grid.cells || !grid.cells.space || !grid.cells.space.dimensions) {
      console.error('❌ Validation failed: Invalid tensor structure');
      validationPassed = false;
    } else {
      const expectedPoints = grid.cells.space.dimensions.reduce((a, b) => a * b, 1);
      const actualPoints = grid.cells.data ? grid.cells.data.length : 0;

      if (actualPoints !== expectedPoints) {
        console.error(`❌ Validation failed: Expected ${expectedPoints} values, got ${actualPoints}`);
        validationPassed = false;
      } else {
        console.log(`✅ Value count matches: ${actualPoints.toLocaleString()}`);
      }
    }

    // Check 2: Statistics are reasonable for SILCS GFE
    const stats = grid.stats;
    if (stats.max > 5.0 || stats.min < -5.0) {
      console.warn(`⚠️ Unusual GFE values: min=${stats.min.toFixed(3)}, max=${stats.max.toFixed(3)}`);
      console.warn(`  Expected SILCS GFE range: -2.0 to 2.0 kcal/mol`);
    } else {
      console.log(`✅ GFE values in expected range: ${stats.min.toFixed(3)} to ${stats.max.toFixed(3)}`);
    }

    // Check 3: Transform matrix is valid
    const transform = grid.transform;
    if (!transform || !Array.isArray(transform) || transform.length !== 16) {
      console.error(`❌ Invalid transform matrix`);
      validationPassed = false;
    } else {
      console.log(`✅ Transform matrix valid`);
    }

    // Check 4: Tensor structure
    const tensor = grid.cells;
    if (!tensor || !tensor.space || !tensor.data || !tensor.space.dimensions) {
      console.error(`❌ Invalid tensor structure`);
      console.error(`  Tensor exists: ${!!tensor}`);
      console.error(`  Space exists: ${!!tensor?.space}`);
      console.error(`  Data exists: ${!!tensor?.data}`);
      console.error(`  Dimensions exist: ${!!tensor?.space?.dimensions}`);
      validationPassed = false;
    } else {
      console.log(`✅ Tensor structure valid`);
    }

    console.log(`[MOLSTAR-VOLUME] Validation ${validationPassed ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('[MOLSTAR-VOLUME] Validation error:', error);
    validationPassed = false;
  }

  return validationPassed;
};
