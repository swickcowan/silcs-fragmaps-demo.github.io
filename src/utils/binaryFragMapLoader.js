/**
 * Fast Binary FragMap Loader
 * Loads pre-processed binary FragMap files for instant visualization
 */

import { fragMapTypes } from '../config/fragMapTypes.js';

/**
 * Loads pre-processed binary FragMap data
 * @param {string} fragMapId - FragMap identifier
 * @returns {Promise<Object>} Parsed FragMap data
 */
export const loadBinaryFragMap = async (fragMapId) => {
  try {
    console.log(`⚡ [BINARY-LOADER] Loading binary FragMap ${fragMapId}...`);
    
    // Find the FragMap type to get the correct file name
    const fragMapType = fragMapTypes.find(type => type.id === fragMapId);
    if (!fragMapType) {
      throw new Error(`Unknown FragMap type: ${fragMapId}`);
    }
    
    // Construct binary file path
    const binaryFileName = fragMapType.fileName.replace('.dx', '.json');
    const binaryUrl = `/assets/fragmaps-binary/${binaryFileName}`;
    
    console.log(`📁 [BINARY-LOADER] Loading: ${binaryUrl}`);
    
    // Fetch binary data
    const response = await fetch(binaryUrl);
    if (!response.ok) {
      throw new Error(`Binary file not found: ${binaryUrl}`);
    }
    
    const binaryData = await response.json();
    
    // Decode base64 grid data back to Float32Array
    const gridDataBuffer = Buffer.from(binaryData.gridDataBase64, 'base64');
    const gridData = new Float32Array(gridDataBuffer.buffer);
    
    // Reconstruct the FragMap data structure
    const fragMapData = {
      gridInfo: binaryData.metadata.gridInfo,
      gridData,
      format: 'binary',
      fragMapId,
      loadedAt: new Date().toISOString(),
      sourceFile: binaryData.metadata.sourceFile
    };
    
    console.log(`✅ [BINARY-LOADER] Loaded ${fragMapId}:`, {
      gridDimensions: fragMapData.gridInfo,
      dataPoints: fragMapData.gridData.length,
      sourceFile: binaryData.metadata.sourceFile,
      loadTime: 'instant'
    });
    
    return fragMapData;
    
  } catch (error) {
    console.error(`❌ [BINARY-LOADER] Error loading binary FragMap ${fragMapId}:`, error);
    throw error;
  }
};

/**
 * Checks if binary files are available
 * @returns {Promise<boolean>} True if binary files exist
 */
export const checkBinaryFilesAvailable = async () => {
  try {
    const response = await fetch('/assets/fragmaps-binary/index.json');
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Batch loads multiple binary FragMaps
 * @param {Array<string>} fragMapIds - Array of FragMap IDs
 * @returns {Promise<Array>} Array of loaded FragMap data
 */
export const batchLoadBinaryFragMaps = async (fragMapIds) => {
  console.log(`📦 [BINARY-LOADER] Batch loading ${fragMapIds.length} FragMaps...`);
  
  const startTime = performance.now();
  const results = await Promise.allSettled(
    fragMapIds.map(id => loadBinaryFragMap(id))
  );
  
  const endTime = performance.now();
  const loadTime = (endTime - startTime).toFixed(1);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`✅ [BINARY-LOADER] Batch loading complete: ${successful} successful, ${failed} failed, ${loadTime}ms`);
  
  return results.map((result, index) => ({
    fragMapId: fragMapIds[index],
    status: result.status,
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null
  }));
};
