/**
 * SILCS FragMap Loader Utility
 * Handles loading and processing of real SILCS FragMap files
 * Supports both .map and .dx formats for easy integration
 */

import { parseFragMapFile } from './fragMapParser.js';
import { validateVolumeData } from './volumeRenderer.js';
import { loadBinaryFragMap, checkBinaryFilesAvailable } from './binaryFragMapLoader.js';

/**
 * Parses SILCS .map format files
 * @param {string} fileContent - Raw file content
 * @param {string} fragMapId - FragMap identifier
 * @returns {Object} Parsed FragMap data
 */
const parseMapFile = (fileContent, fragMapId) => {
  console.log(`Parsing .map file for ${fragMapId}`);
  
  const parsedData = parseFragMapFile(fileContent);
  
  // Add format-specific metadata
  return {
    ...parsedData,
    format: 'map',
    fragMapId,
    loadedAt: new Date().toISOString()
  };
};

/**
 * Parses OpenDX .dx format files
 * @param {string} fileContent - Raw file content
 * @param {string} fragMapId - FragMap identifier
 * @returns {Object} Parsed FragMap data
 */
const parseDxFile = (fileContent, fragMapId) => {
  console.log(`Parsing .dx file for ${fragMapId}`);
  
  const lines = fileContent.split('\n');
  const gridInfo = {};
  let gridData = [];
  let readingData = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#') || trimmed === '') continue;
    
    // Parse grid information
    if (trimmed.includes('object 1 class grid')) {
      // Extract dimensions from line like: object 1 class grid counts 40 40 40
      const match = trimmed.match(/counts\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        gridInfo.nx = parseInt(match[1]);
        gridInfo.ny = parseInt(match[2]);
        gridInfo.nz = parseInt(match[3]);
      }
      continue;
    }
    
    // Parse origin
    if (trimmed.includes('origin')) {
      const match = trimmed.match(/origin\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
      if (match) {
        gridInfo.origin_x = parseFloat(match[1]);
        gridInfo.origin_y = parseFloat(match[2]);
        gridInfo.origin_z = parseFloat(match[3]);
      }
      continue;
    }
    
    // Parse delta (spacing)
    if (trimmed.includes('delta')) {
      const match = trimmed.match(/delta\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
      if (match) {
        gridInfo.grid_spacing = parseFloat(match[1]); // Assuming uniform spacing
      }
      continue;
    }
    
    // Parse data section - look for any object with "array" and "data follows"
    if (trimmed.includes('class array') && trimmed.includes('data follows')) {
      readingData = true;
      continue;
    }
    
    if (readingData && trimmed) {
      const values = trimmed.split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
      gridData = gridData.concat(values);
    }
  }
  
  // Ensure we have required grid info
  gridInfo.nx = gridInfo.nx || 40;
  gridInfo.ny = gridInfo.ny || 40;
  gridInfo.nz = gridInfo.nz || 40;
  gridInfo.grid_spacing = gridInfo.grid_spacing || 0.8;
  gridInfo.origin_x = gridInfo.origin_x || 4.81;
  gridInfo.origin_y = gridInfo.origin_y || -5.26;
  gridInfo.origin_z = gridInfo.origin_z || 15.16;
  
  // Convert to Float32Array
  const expectedPoints = gridInfo.nx * gridInfo.ny * gridInfo.nz;
  if (gridData.length !== expectedPoints) {
    console.warn(`DX file has ${gridData.length} values, expected ${expectedPoints}`);
    // Pad or truncate as needed
    if (gridData.length < expectedPoints) {
      const paddedData = new Float32Array(expectedPoints);
      paddedData.set(gridData);
      gridData = paddedData;
    } else {
      gridData = new Float32Array(gridData.slice(0, expectedPoints));
    }
  } else {
    gridData = new Float32Array(gridData);
  }
  
  return {
    gridInfo,
    gridData,
    format: 'dx',
    fragMapId,
    loadedAt: new Date().toISOString()
  };
};

/**
 * Configuration for different FragMap file formats
 */
const FRAGMAP_FORMATS = {
  MAP: {
    extension: '.map',
    parser: parseMapFile,
    description: 'SILCS native format with grid metadata'
  },
  DX: {
    extension: '.dx',
    parser: parseDxFile,
    description: 'OpenDX format for volumetric data'
  }
};

/**
 * Loads FragMap data from file URL
 * @param {string} fragMapId - FragMap identifier
 * @param {string} baseUrl - Base URL for FragMap files
 * @param {string} preferredFormat - Preferred format ('map' or 'dx')
 * @returns {Promise<Object>} Parsed FragMap data
 */
export const loadFragMapData = async (fragMapId, baseUrl = '/assets/fragmaps-dx', preferredFormat = 'dx') => {
  try {
    console.log(`Loading FragMap ${fragMapId}...`);
    
    // Import fragMapTypes to get the correct file name
    const { fragMapTypes } = await import('../config/fragMapTypes.js');
    const fragMapType = fragMapTypes.find(type => type.id === fragMapId);
    
    if (!fragMapType) {
      throw new Error(`Unknown FragMap type: ${fragMapId}`);
    }
    
    // Try binary loader first for instant loading
    const binaryAvailable = await checkBinaryFilesAvailable();
    if (binaryAvailable) {
      try {
        console.log(`🚀 [FRAGMAP-LOADER] Using binary loader for instant loading`);
        const binaryData = await loadBinaryFragMap(fragMapId);
        
        // Validate the loaded data
        if (!validateFragMapData(binaryData)) {
          throw new Error(`Invalid binary FragMap data for ${fragMapId}`);
        }
        
        console.log(`✅ [FRAGMAP-LOADER] Successfully loaded binary FragMap ${fragMapId}:`, {
          gridDimensions: binaryData.gridInfo,
          dataPoints: binaryData.gridData.length,
          energyRange: getEnergyRange(binaryData.gridData),
          loadMethod: 'binary'
        });
        
        return binaryData;
      } catch (binaryError) {
        console.warn(`⚠️ [FRAGMAP-LOADER] Binary load failed, falling back to DX:`, binaryError.message);
      }
    }
    
    // Fallback to original DX file loading
    console.log(`📁 [FRAGMAP-LOADER] Using DX file loader for ${fragMapId}`);
    
    // Use the fileName from the configuration
    const fileName = fragMapType.fileName || `${fragMapId}${preferredFormat === 'dx' ? '.dx' : '.map'}`;
    
    // Only try the preferred format since we're now using DX files
    console.log(`Loading FragMap file: ${fileName}`);
    const fragMapData = await tryLoadFile(fileName, baseUrl, preferredFormat);
    
    if (!fragMapData) {
      throw new Error(`Could not load FragMap ${fragMapId} (${fileName}) - file not found or parsing failed`);
    }
    
    // Validate the loaded data
    if (!validateFragMapData(fragMapData)) {
      throw new Error(`Invalid FragMap data for ${fragMapId}`);
    }
    
    console.log(`Successfully loaded FragMap ${fragMapId}:`, {
      gridDimensions: fragMapData.gridInfo,
      dataPoints: fragMapData.gridData.length,
      energyRange: getEnergyRange(fragMapData.gridData),
      loadMethod: 'dx'
    });
    
    return fragMapData;
    
  } catch (error) {
    console.error(`Error loading FragMap ${fragMapId}:`, error);
    throw error;
  }
};

/**
 * Attempts to load FragMap file with specific name
 * Enhanced with comprehensive debugging for file loading issues
 * @param {string} fileName - File name to load
 * @param {string} baseUrl - Base URL for files
 * @param {string} format - File format ('map' or 'dx')
 * @returns {Promise<Object|null>} Parsed data or null if failed
 */
const tryLoadFile = async (fileName, baseUrl, format) => {
  try {
    console.log(`[FRAGMAP-LOADER] === FILE LOAD START ===`);
    console.log(`[FRAGMAP-LOADER] Attempting to load: ${fileName}`);
    console.log(`[FRAGMAP-LOADER] Base URL: ${baseUrl}`);
    console.log(`[FRAGMAP-LOADER] Format: ${format}`);
    
    const formatConfig = FRAGMAP_FORMATS[format.toUpperCase()];
    if (!formatConfig) {
      console.error(`[FRAGMAP-LOADER] Unsupported format: ${format}`);
      return null;
    }
    
    const fileUrl = `${baseUrl}/${fileName}`;
    console.log(`[FRAGMAP-LOADER] Full file URL: ${fileUrl}`);
    
    // Fetch the file
    console.log(`[FRAGMAP-LOADER] Initiating fetch request...`);
    const response = await fetch(fileUrl);
    console.log(`[FRAGMAP-LOADER] Fetch response status: ${response.status} ${response.statusText}`);
    console.log(`[FRAGMAP-LOADER] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.log(`[FRAGMAP-LOADER] File not found or not accessible: ${fileUrl}`);
      return null;
    }
    
    const fileContent = await response.text();
    console.log(`[FRAGMAP-LOADER] File content length: ${fileContent.length} characters`);
    console.log(`[FRAGMAP-LOADER] First 200 characters:`, fileContent.substring(0, 200));
    console.log(`[FRAGMAP-LOADER] Last 200 characters:`, fileContent.substring(-200));
    
    // Count lines for debugging
    const lines = fileContent.split('\n');
    console.log(`[FRAGMAP-LOADER] Total lines in file: ${lines.length}`);
    
    // Show first few lines
    console.log(`[FRAGMAP-LOADER] First 10 lines:`);
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`[FRAGMAP-LOADER] Line ${i + 1}: "${line}"`);
    });
    
    // Check if file looks empty or contains only headers
    const dataLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#') && /^[\d\.\d]/.test(trimmed);
    });
    console.log(`[FRAGMAP-LOADER] Data lines (starting with numbers): ${dataLines.length}`);
    
    if (dataLines.length === 0) {
      console.warn(`[FRAGMAP-LOADER] No data lines found in file - this might be the issue`);
    }
    
    // Parse based on format
    console.log(`[FRAGMAP-LOADER] Parsing with ${format} format parser...`);
    const parsedData = formatConfig.parser(fileContent, fileName);
    console.log(`[FRAGMAP-LOADER] Parse result:`, parsedData);
    
    if (parsedData && parsedData.gridData) {
      console.log(`[FRAGMAP-LOADER] ✅ Successfully parsed ${parsedData.gridData.length} grid values`);
    } else {
      console.error(`[FRAGMAP-LOADER] ❌ Parse failed - no grid data found`);
    }
    
    return parsedData;
    
  } catch (error) {
    console.error(`[FRAGMAP-LOADER] Failed to load ${format} format for ${fileName}:`, error);
    console.error(`[FRAGMAP-LOADER] Error details:`, error.message, error.stack);
    return null;
  }
};

/**
 * Validates FragMap data structure
 * @param {Object} fragMapData - FragMap data to validate
 * @returns {boolean} True if valid
 */
const validateFragMapData = (fragMapData) => {
  if (!fragMapData || typeof fragMapData !== 'object') {
    return false;
  }
  
  const { gridInfo, gridData } = fragMapData;
  
  // Check grid info
  if (!gridInfo || typeof gridInfo !== 'object') {
    return false;
  }
  
  const requiredGridInfo = ['nx', 'ny', 'nz'];
  for (const key of requiredGridInfo) {
    if (!gridInfo[key] || typeof gridInfo[key] !== 'number') {
      return false;
    }
  }
  
  // Check grid data
  if (!gridData || !(gridData instanceof Float32Array)) {
    return false;
  }
  
  const expectedPoints = gridInfo.nx * gridInfo.ny * gridInfo.nz;
  if (gridData.length !== expectedPoints) {
    return false;
  }
  
  return true;
};

/**
 * Calculates energy range from grid data
 * @param {Float32Array} gridData - Grid data values
 * @returns {Object} Energy range statistics
 */
const getEnergyRange = (gridData) => {
  if (!gridData || gridData.length === 0) {
    return { min: 0, max: 0, mean: 0 };
  }
  
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < gridData.length; i++) {
    const value = gridData[i];
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  
  const mean = sum / gridData.length;
  
  return { min, max, mean };
};

/**
 * Gets available FragMap files from a directory
 * @param {string} baseUrl - Base URL for FragMap files
 * @returns {Promise<Array>} List of available FragMap files
 */
export const getAvailableFragMaps = async (baseUrl = '/assets/fragmaps') => {
  try {
    // This would typically require server-side listing or a manifest file
    // For now, return the standard SILCS FragMap types
    const standardTypes = [
      'hydrophobic', 'hbond-donor', 'hbond-acceptor',
      'positive', 'negative', 'aromatic'
    ];
    
    const availableMaps = [];
    
    for (const type of standardTypes) {
      for (const format of Object.keys(FRAGMAP_FORMATS)) {
        const fileUrl = `${baseUrl}/${type}${FRAGMAP_FORMATS[format].extension}`;
        
        try {
          const response = await fetch(fileUrl, { method: 'HEAD' });
          if (response.ok) {
            availableMaps.push({
              id: type,
              format: format.toLowerCase(),
              url: fileUrl,
              available: true
            });
            break; // Found this type, don't check other formats
          }
        } catch (error) {
          // File not available, continue checking
        }
      }
    }
    
    return availableMaps;
    
  } catch (error) {
    console.error('Error getting available FragMaps:', error);
    return [];
  }
};

/**
 * Creates a manifest of FragMap files for easy integration
 * @param {string} baseUrl - Base URL for FragMap files
 * @returns {Promise<Object>} Manifest object
 */
export const createFragMapManifest = async (baseUrl = '/assets/fragmaps') => {
  const availableMaps = await getAvailableFragMaps(baseUrl);
  
  return {
    version: '1.0',
    created: new Date().toISOString(),
    baseUrl,
    supportedFormats: Object.keys(FRAGMAP_FORMATS).map(key => ({
      name: key.toLowerCase(),
      extension: FRAGMAP_FORMATS[key].extension,
      description: FRAGMAP_FORMATS[key].description
    })),
    availableMaps,
    metadata: {
      protein: 'P38 MAP Kinase',
      pdbId: '3FLY',
      description: 'SILCS FragMaps for P38 MAP Kinase binding site'
    }
  };
};
