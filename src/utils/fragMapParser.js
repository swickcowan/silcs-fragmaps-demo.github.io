/**
 * Utility functions for parsing and processing SILCS FragMap files
 */

// Local defaults to avoid circular dependency
const fragMapDefaults = {
  gridSpacing: 0.8,
  gridSampleRate: 0.1,
  sphereSize: 0.15,
  sphereColor: [1.0, 0.5, 0.2] // Default orange color
};

/**
 * Converts hex color string to Mol* color format
 * @param {string} hexColor - Hex color string (e.g., '#ff0000')
 * @returns {Array} Mol* compatible color array [r, g, b]
 */
export const hexToMolstarColor = (hexColor) => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  return [r, g, b];
};

/**
 * Parses FragMap .map files into structured data
 * Enhanced with comprehensive debugging and robust data handling
 * @param {string} fileContent - Raw content of the FragMap file
 * @returns {Object} Parsed FragMap data with grid info and grid data
 */
export const parseFragMapFile = (fileContent) => {
  console.log(`[FRAGMAP-PARSER] === PARSING START ===`);
  console.log(`[FRAGMAP-PARSER] File content length: ${fileContent.length} characters`);
  
  const lines = fileContent.split('\n');
  console.log(`[FRAGMAP-PARSER] Total lines: ${lines.length}`);
  
  const gridInfo = {};
  let gridData = [];
  let headerSection = true;
  let dataLineCount = 0;
  let foundFirstData = false;
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') {
      console.log(`[FRAGMAP-PARSER] Line ${lineNum + 1}: Skipping comment/empty line`);
      continue;
    }
    
    // Parse header information until we hit numeric data
    if (headerSection) {
      console.log(`[FRAGMAP-PARSER] Line ${lineNum + 1} (header): "${trimmed}"`);
      
      const match = trimmed.match(/(\w+)\s+(.+)/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        console.log(`[FRAGMAP-PARSER] Parsed header: ${key} = "${value}"`);
        
        // Convert numeric values
        if (!isNaN(value) && value !== '') {
          value = parseFloat(value);
          console.log(`[FRAGMAP-PARSER] Converted to number: ${key} = ${value}`);
        }
        
        // Handle NELEMENTS as dimensions
        if (key === 'NELEMENTS') {
          const elements = value.split(/\s+/).map(v => parseInt(v.trim()));
          if (elements.length === 3) {
            gridInfo.nx = elements[0];
            gridInfo.ny = elements[1]; 
            gridInfo.nz = elements[2];
            console.log(`[FRAGMAP-PARSER] Found dimensions: ${elements.join(' x ')}`);
          } else {
            console.warn(`[FRAGMAP-PARSER] Invalid NELEMENTS format: ${value}`);
          }
        } 
        // Handle CENTER as coordinates
        else if (key === 'CENTER') {
          if (typeof value === 'string' && value.includes(' ')) {
            const coords = value.split(/\s+/).map(v => parseFloat(v.trim()));
            if (coords.length === 3) {
              gridInfo.origin_x = coords[0];
              gridInfo.origin_y = coords[1];
              gridInfo.origin_z = coords[2];
              console.log(`[FRAGMAP-PARSER] Found CENTER coordinates: ${coords.join(', ')}`);
            } else {
              console.warn(`[FRAGMAP-PARSER] Invalid CENTER format: ${value}`);
            }
          } else {
            gridInfo[key] = value;
            console.log(`[FRAGMAP-PARSER] Found ${key}: ${value}`);
          }
        } 
        // Handle SPACING
        else if (key === 'SPACING') {
          gridInfo.grid_spacing = value;
          console.log(`[FRAGMAP-PARSER] Found spacing: ${value}`);
        }
        // Store other header values
        else {
          gridInfo[key] = value;
          console.log(`[FRAGMAP-PARSER] Stored header: ${key} = ${value}`);
        }
      }
      // When we hit a line that starts with a number (with optional whitespace), header section ends
      else if (/^\s*[\d\.\-]/.test(trimmed)) {
        console.log(`[FRAGMAP-PARSER] Line ${lineNum + 1}: First data line detected, ending header section`);
        headerSection = false;
        foundFirstData = true;
        // Fall through to grid data parsing
      } else {
        console.log(`[FRAGMAP-PARSER] Line ${lineNum + 1}: Unparsed header line: "${trimmed}"`);
      }
    }
    
    // Parse grid data section
    if (!headerSection) {
      dataLineCount++;
      const values = trimmed.split(/\s+/).filter(v => v !== '');
      const numbers = values.map(v => {
        const num = parseFloat(v);
        if (isNaN(num)) {
          console.warn(`[FRAGMAP-PARSER] Line ${lineNum + 1}: Invalid number "${v}"`);
        }
        return num;
      }).filter(v => !isNaN(v));
      
      if (numbers.length > 0) {
        gridData = gridData.concat(numbers);
        if (dataLineCount <= 5 || dataLineCount % 10000 === 0) {
          console.log(`[FRAGMAP-PARSER] Line ${lineNum + 1}: Added ${numbers.length} values, total so far: ${gridData.length}`);
        }
      }
    }
  }
  
  console.log(`[FRAGMAP-PARSER] === PARSING COMPLETE ===`);
  console.log(`[FRAGMAP-PARSER] Header info:`, gridInfo);
  console.log(`[FRAGMAP-PARSER] Data lines processed: ${dataLineCount}`);
  console.log(`[FRAGMAP-PARSER] Total grid values: ${gridData.length}`);
  
  // Ensure we have the correct number of grid points
  const expectedPoints = (gridInfo.nx || 40) * (gridInfo.ny || 40) * (gridInfo.nz || 40);
  console.log(`[FRAGMAP-PARSER] Expected grid points: ${expectedPoints} (nx=${gridInfo.nx}, ny=${gridInfo.ny}, nz=${gridInfo.nz})`);
  console.log(`[FRAGMAP-PARSER] Actual grid points: ${gridData.length}`);

  // Handle data length mismatch more gracefully
  if (gridData.length !== expectedPoints) {
    console.warn(`[FRAGMAP-PARSER] Grid data length mismatch: expected ${expectedPoints}, got ${gridData.length}`);
    
    if (gridData.length > expectedPoints) {
      // Truncate excess data
      console.warn(`[FRAGMAP-PARSER] Truncating excess data from ${gridData.length} to ${expectedPoints}`);
      gridData = gridData.slice(0, expectedPoints);
    } else {
      // Pad missing data with zeros
      console.warn(`[FRAGMAP-PARSER] Padding missing data from ${gridData.length} to ${expectedPoints} with zeros`);
      const paddedData = new Float32Array(expectedPoints);
      paddedData.set(gridData);
      gridData = paddedData;
    }
    
    console.log(`[FRAGMAP-PARSER] Adjusted grid data length: ${gridData.length}`);
  }

  console.log(`[FRAGMAP-PARSER] ✅ Parsing successful, converting to Float32Array`);
  gridData = new Float32Array(gridData);
  
  // Debug: Show first few and last few values (avoid large array logging that causes stack overflow)
  try {
    console.log(`[FRAGMAP-PARSER] First 10 values:`, Array.from(gridData.slice(0, 10)));
    console.log(`[FRAGMAP-PARSER] Last 10 values:`, Array.from(gridData.slice(-10)));
    
    // Calculate min/max safely to avoid stack overflow on large arrays
    let minVal = Infinity, maxVal = -Infinity;
    for (let i = 0; i < Math.min(gridData.length, 10000); i++) {
      const val = gridData[i];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    console.log(`[FRAGMAP-PARSER] Sampled min value: ${minVal}, max value: ${maxVal} (first 10k values)`);
  } catch (e) {
    console.log(`[FRAGMAP-PARSER] Debug logging skipped due to large array size`);
  }
  
  return {
    gridInfo,
    gridData
  };
};

/**
 * Calculates mean of grid data
 * @param {Float32Array} data - Grid data
 * @returns {number} Mean value
 */
const calculateMean = (data) => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  return sum / data.length;
};

/**
 * Calculates standard deviation of grid data
 * @param {Float32Array} data - Grid data
 * @returns {number} Standard deviation
 */
const calculateStdDev = (data) => {
  const mean = calculateMean(data);
  let sumSquaredDiff = 0;
  for (let i = 0; i < data.length; i++) {
    const diff = data[i] - mean;
    sumSquaredDiff += diff * diff;
  }
  return Math.sqrt(sumSquaredDiff / data.length);
};

/**
 * Converts parsed FragMap data to Mol* volume format
 * Enhanced with comprehensive debugging and proper Mol* structure
 * @param {Object} fragMapData - Parsed FragMap data from parseFragMapFile
 * @param {string} fragMapId - Identifier for FragMap
 * @returns {Object} Mol* compatible volume data
 */
export const fragMapToVolume = (fragMapData, fragMapId) => {
  console.log(`[FRAGMAP-PARSER] === VOLUME CONVERSION START ===`);
  console.log(`[FRAGMAP-PARSER] Converting FragMap: ${fragMapId}`);
  console.log(`[FRAGMAP-PARSER] Input fragMapData:`, fragMapData);
  console.log(`[FRAGMAP-PARSER] Input keys:`, Object.keys(fragMapData));
  
  const { gridInfo, gridData } = fragMapData;
  
  console.log(`[FRAGMAP-PARSER] gridInfo:`, gridInfo);
  console.log(`[FRAGMAP-PARSER] gridData:`, gridData);
  console.log(`[FRAGMAP-PARSER] gridData type:`, typeof gridData);
  console.log(`[FRAGMAP-PARSER] gridData length:`, gridData?.length);
  
  if (!gridInfo) {
    console.error(`[FRAGMAP-PARSER] Missing gridInfo in input data`);
    throw new Error(`Missing gridInfo in FragMap data`);
  }
  
  if (!gridData) {
    console.error(`[FRAGMAP-PARSER] Missing gridData in input data`);
    throw new Error(`Missing gridData in FragMap data`);
  }
  
  // Calculate proper statistics for SILCS data
  console.log(`[FRAGMAP-PARSER] Calculating statistics...`);
  const stats = calculateGridStatistics(gridData);
  console.log(`[FRAGMAP-PARSER] Statistics calculated:`, stats);
  
  // Validate data range for SILCS GFE maps
  if (stats.max > 5.0 || stats.min < -5.0) {
    console.warn(`[FRAGMAP-PARSER] Unusual FragMap values detected for ${fragMapId}: min=${stats.min.toFixed(3)}, max=${stats.max.toFixed(3)}`);
    console.warn(`[FRAGMAP-PARSER] Expected SILCS GFE values typically range from -2.0 to 2.0`);
  }
  
  // Additional validation for grid dimensions
  console.log(`[FRAGMAP-PARSER] Validating grid dimensions...`);
  console.log(`[FRAGMAP-PARSER] Grid info dimensions: nx=${gridInfo.nx}, ny=${gridInfo.ny}, nz=${gridInfo.nz}`);
  
  if (!gridInfo.nx || !gridInfo.ny || !gridInfo.nz) {
    console.error(`[FRAGMAP-PARSER] Missing grid dimensions in gridInfo`);
    console.error(`[FRAGMAP-PARSER] Available gridInfo keys:`, Object.keys(gridInfo));
    throw new Error(`Missing grid dimensions (nx, ny, nz) in gridInfo`);
  }
  
  const totalPoints = gridInfo.nx * gridInfo.ny * gridInfo.nz;
  console.log(`[FRAGMAP-PARSER] Expected total points: ${totalPoints}`);
  console.log(`[FRAGMAP-PARSER] Actual gridData length: ${gridData.length}`);
  
  if (gridData.length !== totalPoints) {
    console.error(`[FRAGMAP-PARSER] Grid data length mismatch: expected ${totalPoints}, got ${gridData.length}`);
    throw new Error(`Grid data length mismatch: expected ${totalPoints}, got ${gridData.length}`);
  }
  
  // Create volume with proper Mol* structure
  console.log(`[FRAGMAP-PARSER] Creating volume data structure...`);
  const volumeData = {
    // Core volume data
    data: gridData,
    dimensions: [gridInfo.nx, gridInfo.ny, gridInfo.nz],
    origin: [gridInfo.origin_x || 0, gridInfo.origin_y || 0, gridInfo.origin_z || 0],
    spacing: [gridInfo.grid_spacing || 1, gridInfo.grid_spacing || 1, gridInfo.grid_spacing || 1],
    label: `fragmap-${fragMapId}`,
    
    // Mol* specific structure - this is what was missing!
    grid: {
      // Basic grid info
      data: gridData,
      dimensions: { 
        x: gridInfo.nx, 
        y: gridInfo.ny, 
        z: gridInfo.nz 
      },
      space: { 
        origin: { x: gridInfo.origin_x || 0, y: gridInfo.origin_y || 0, z: gridInfo.origin_z || 0 },
        delta: { x: gridInfo.grid_spacing || 1, y: gridInfo.grid_spacing || 1, z: gridInfo.grid_spacing || 1 }
      },
      
      // Statistics - this is what Mol* is looking for!
      stats: {
        min: stats.min,
        max: stats.max,
        mean: stats.mean,
        sigma: stats.stdDev,
        // Additional stats that Mol* might need
        minPositive: stats.min > 0 ? stats.min : 0.001,
        maxNegative: stats.max < 0 ? stats.max : -0.001
      },
      
      // Metadata
      cell: {
        size: { 
          x: gridInfo.nx * (gridInfo.grid_spacing || 1), 
          y: gridInfo.ny * (gridInfo.grid_spacing || 1), 
          z: gridInfo.nz * (gridInfo.grid_spacing || 1) 
        },
        angles: { alpha: 90, beta: 90, gamma: 90 },
        volume: gridInfo.nx * gridInfo.ny * gridInfo.nz * Math.pow(gridInfo.grid_spacing || 1, 3)
      },
      
      // SILCS-specific metadata
      sourceData: {
        ...gridInfo,
        ...stats,
        dataType: 'GFE', // Grid Free Energy
        unit: 'kcal/mol',
        description: 'SILCS FragMap Grid Free Energy',
        spaceGroup: 'P1', // Standard space group
        axisOrder: [0, 1, 2], // Standard axis order
        // Quality metrics
        qualityScore: calculateDataQuality(stats),
        recommendedIsoValue: calculateRecommendedIsoValue(stats)
      }
    },
    
    // Legacy gridInfo for backward compatibility
    gridInfo: {
      ...gridInfo,
      ...stats,
      dataType: 'GFE',
      unit: 'kcal/mol',
      description: 'SILCS FragMap Grid Free Energy',
      spaceGroup: 'P1',
      axisOrder: [0, 1, 2],
      qualityScore: calculateDataQuality(stats),
      recommendedIsoValue: calculateRecommendedIsoValue(stats)
    },
    
    // CCP4 specific format requirements
    CCP4: {
      mode: 2, // Float mode
      map: 'FOURIER',
      nlabl: 4,
      label: ['fragmap', fragMapId, 'SILCS', 'GFE']
    }
  };
  
  console.log(`[FRAGMAP-PARSER] Volume data structure created:`);
  console.log(`[FRAGMAP-PARSER] - data length: ${volumeData.data.length}`);
  console.log(`[FRAGMAP-PARSER] - dimensions: [${volumeData.dimensions.join(', ')}]`);
  console.log(`[FRAGMAP-PARSER] - origin: [${volumeData.origin.join(', ')}]`);
  console.log(`[FRAGMAP-PARSER] - spacing: [${volumeData.spacing.join(', ')}]`);
  console.log(`[FRAGMAP-PARSER] - label: ${volumeData.label}`);
  console.log(`[FRAGMAP-PARSER] - grid.stats:`, volumeData.grid.stats);
  console.log(`[FRAGMAP-PARSER] - gridInfo keys:`, Object.keys(volumeData.gridInfo));
  
  // Final validation
  console.log(`[FRAGMAP-PARSER] Final validation...`);
  if (!volumeData.data || volumeData.data.length === 0) {
    console.error(`[FRAGMAP-PARSER] Invalid volume data: empty or missing data array`);
    throw new Error(`Invalid volume data: empty or missing data array`);
  }
  
  if (!volumeData.dimensions || volumeData.dimensions.length !== 3) {
    console.error(`[FRAGMAP-PARSER] Invalid volume dimensions:`, volumeData.dimensions);
    throw new Error(`Invalid volume dimensions`);
  }
  
  if (!volumeData.grid || !volumeData.grid.stats) {
    console.error(`[FRAGMAP-PARSER] Invalid volume structure: missing grid.stats`);
    throw new Error(`Invalid volume structure: missing grid.stats`);
  }
  
  const expectedVolumePoints = volumeData.dimensions[0] * volumeData.dimensions[1] * volumeData.dimensions[2];
  if (volumeData.data.length !== expectedVolumePoints) {
    console.error(`[FRAGMAP-PARSER] Volume data length mismatch: expected ${expectedVolumePoints}, got ${volumeData.data.length}`);
    throw new Error(`Volume data length mismatch: expected ${expectedVolumePoints}, got ${volumeData.data.length}`);
  }
  
  console.log(`[FRAGMAP-PARSER] ✅ Volume conversion successful for ${fragMapId}:`);
  console.log(`[FRAGMAP-PARSER]   - Dimensions: ${volumeData.dimensions.join(' x ')}`);
  console.log(`[FRAGMAP-PARSER]   - Data range: ${stats.min.toFixed(3)} to ${stats.max.toFixed(3)} kcal/mol`);
  console.log(`[FRAGMAP-PARSER]   - Quality score: ${volumeData.gridInfo.qualityScore.toFixed(2)}/10`);
  console.log(`[FRAGMAP-PARSER]   - Recommended isovalue: ${volumeData.gridInfo.recommendedIsoValue.toFixed(2)}`);
  console.log(`[FRAGMAP-PARSER]   - Grid stats structure:`, volumeData.grid.stats);
  
  return volumeData;
};

/**
 * Calculates data quality score for SILCS FragMap validation
 * @param {Object} stats - Grid statistics
 * @returns {number} Quality score from 0-10
 */
const calculateDataQuality = (stats) => {
  let score = 10;
  
  // Check for reasonable data range
  if (stats.max > 5.0 || stats.min < -5.0) score -= 2;
  if (stats.max > 3.0 || stats.min < -3.0) score -= 1;
  
  // Check for reasonable standard deviation
  if (stats.stdDev < 0.1) score -= 1; // Too uniform
  if (stats.stdDev > 2.0) score -= 1; // Too variable
  
  // Check for reasonable mean
  if (Math.abs(stats.mean) > 1.0) score -= 1;
  
  return Math.max(0, score);
};

/**
 * Calculates recommended isovalue based on data statistics
 * @param {Object} stats - Grid statistics
 * @returns {number} Recommended isovalue
 */
const calculateRecommendedIsoValue = (stats) => {
  // Use mean - 0.5*stdDev as starting point for favorable regions
  // This is a common approach for SILCS GFE maps
  const recommended = stats.mean - 0.5 * stats.stdDev;
  
  // Clamp to reasonable range
  return Math.max(-2.0, Math.min(0.5, recommended));
};

/**
 * Generates enhanced sphere positions from grid data based on isovalue threshold
 * Creates cleaner, more professional FragMap visualization
 * @param {Float32Array} gridData - Grid data values
 * @param {Object} dimensions - Grid dimensions {nx, ny, nz}
 * @param {number} isovalue - Threshold value for sphere generation
 * @returns {Array} Array of enhanced sphere positions with improved visual properties
 */
export const generateSpheresFromGrid = (gridData, dimensions, isovalue) => {
  const spheres = [];
  const nx = dimensions.nx || 40;
  const ny = dimensions.ny || 40; 
  const nz = dimensions.nz || 40;
  const spacing = fragMapDefaults.gridSpacing;
  
  // Use grid origin from FragMap file data for positioning
  const origin = dimensions.origin || [0, 0, 0];
  
  console.log(`[FRAGMAP-PARSER] Grid analysis: grid points ${gridData.length}`);
  console.log(`[FRAGMAP-PARSER] Using isovalue threshold: ${isovalue}`);
  
  // Find max value without causing stack overflow
  let maxValue = -Infinity;
  for (let i = 0; i < Math.min(gridData.length, 10000); i++) {
    if (gridData[i] > maxValue) {
      maxValue = gridData[i];
    }
  }
  console.log(`[FRAGMAP-PARSER] Sampled max value: ${maxValue.toFixed(3)} (first 10k points)`);
  
  // Count points that meet criteria first
  let eligiblePoints = 0;
  for (let i = 0; i < gridData.length; i++) {
    if (gridData[i] <= isovalue) {
      eligiblePoints++;
    }
  }
  console.log(`[FRAGMAP-PARSER] Points with energy <= ${isovalue}: ${eligiblePoints}`);
  
  // Limit sphere count to prevent stack overflow (max 5000)
  const maxSpheres = 5000;
  const skipFactor = Math.ceil(eligiblePoints / maxSpheres);
  
  console.log(`[FRAGMAP-PARSER] Limiting to ${maxSpheres} spheres, skip factor: ${skipFactor}`);
  
  let sphereCount = 0;
  let skippedCount = 0;
  
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const index = z * nx * ny + y * nx + x;
        
        if (gridData[index] <= isovalue) {
          // Skip points to limit total sphere count
          if (skippedCount % skipFactor !== 0) {
            skippedCount++;
            continue;
          }
          
          // Calculate 3D coordinates
          const coordX = origin[0] + x * spacing;
          const coordY = origin[1] + y * spacing;
          const coordZ = origin[2] + z * spacing;
          
          spheres.push({
            x: coordX,
            y: coordY,
            z: coordZ,
            energy: gridData[index],
            gridIndex: index
          });
          
          sphereCount++;
          skippedCount++;
          
          // Stop if we reach max spheres
          if (sphereCount >= maxSpheres) {
            console.log(`[FRAGMAP-PARSER] Reached max sphere limit (${maxSpheres}), stopping generation`);
            break;
          }
        }
      }
      if (sphereCount >= maxSpheres) break;
    }
    if (sphereCount >= maxSpheres) break;
  }
  
  console.log(`[FRAGMAP-PARSER] Generated ${sphereCount} spheres from grid data (skipped ${eligiblePoints - sphereCount} points)`);
  return spheres;
};

/**
 * Validates FragMap data structure with enhanced SILCS-specific checks
 * @param {Object} fragMapData - FragMap data to validate
 * @returns {boolean} True if data is valid
 */
export const validateFragMapData = (fragMapData) => {
  if (!fragMapData || typeof fragMapData !== 'object') {
    console.error('[FRAGMAP-PARSER] Invalid FragMap data: not an object');
    return false;
  }
  
  const { gridInfo, gridData } = fragMapData;
  
  // Check grid info
  if (!gridInfo || typeof gridInfo !== 'object') {
    console.error('[FRAGMAP-PARSER] Invalid grid info: missing or not an object');
    return false;
  }
  
  const requiredGridInfo = ['nx', 'ny', 'nz'];
  for (const key of requiredGridInfo) {
    if (!gridInfo[key] || typeof gridInfo[key] !== 'number' || gridInfo[key] <= 0) {
      console.error(`[FRAGMAP-PARSER] Invalid grid dimension: ${key} = ${gridInfo[key]}`);
      return false;
    }
  }
  
  // Check grid data
  if (!gridData || !(gridData instanceof Float32Array)) {
    console.error('[FRAGMAP-PARSER] Invalid grid data: missing or not Float32Array');
    return false;
  }
  
  const expectedPoints = gridInfo.nx * gridInfo.ny * gridInfo.nz;
  if (gridData.length !== expectedPoints) {
    console.error(`[FRAGMAP-PARSER] Grid data length mismatch: expected ${expectedPoints}, got ${gridData.length}`);
    return false;
  }
  
  // SILCS-specific validation
  const stats = calculateGridStatistics(gridData);
  
  // Check for reasonable SILCS GFE value ranges
  if (stats.max > 10.0 || stats.min < -10.0) {
    console.warn(`[FRAGMAP-PARSER] Unusual SILCS GFE values: min=${stats.min.toFixed(3)}, max=${stats.max.toFixed(3)}`);
    console.warn('[FRAGMAP-PARSER] SILCS GFE values typically range from -2.0 to 2.0 kcal/mol');
  }
  
  // Check for NaN or infinite values
  for (let i = 0; i < gridData.length; i++) {
    if (!isFinite(gridData[i])) {
      console.error(`[FRAGMAP-PARSER] Invalid grid value at index ${i}: ${gridData[i]}`);
      return false;
    }
  }
  
  // Check grid spacing
  if (gridInfo.grid_spacing && (gridInfo.grid_spacing <= 0 || gridInfo.grid_spacing > 5.0)) {
    console.warn(`[FRAGMAP-PARSER] Unusual grid spacing: ${gridInfo.grid_spacing} Å`);
  }
  
  console.log(`[FRAGMAP-PARSER] FragMap validation passed: ${gridInfo.nx}x${gridInfo.ny}x${gridInfo.nz} grid, ${expectedPoints} points`);
  console.log(`[FRAGMAP-PARSER] Data statistics: mean=${stats.mean.toFixed(3)}, stdDev=${stats.stdDev.toFixed(3)}, range=[${stats.min.toFixed(3)}, ${stats.max.toFixed(3)}]`);
  
  return true;
};

/**
 * Calculates statistics for FragMap grid data
 * @param {Float32Array} gridData - Grid data values
 * @returns {Object} Statistics {min, max, mean, stdDev}
 */
export const calculateGridStatistics = (gridData) => {
  if (!gridData || gridData.length === 0) {
    return { min: 0, max: 0, mean: 0, stdDev: 0 };
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
  
  const stdDev = Math.sqrt(sumSquaredDiff / gridData.length);
  
  return { min, max, mean, stdDev };
};
