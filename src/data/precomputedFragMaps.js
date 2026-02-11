/**
 * Pre-computed FragMap Data
 * All FragMap files are pre-parsed and stored for instant loading
 * Eliminates runtime parsing and provides immediate visualization
 */

// This will be populated at build time with pre-parsed FragMap data
export const precomputedFragMaps = new Map();

/**
 * Initialize FragMap data loading
 * Called once at app startup to parse and cache all FragMap files
 */
export const initializeFragMaps = async () => {
  console.log('🚀 [FRAGMAP-LOADER] Initializing pre-computed FragMap data...');
  
  const fragMapTypes = [
    { id: 'hydrophobic', fileName: '3fly.apolar.gfe.map' },
    { id: 'hbond-donor', fileName: '3fly.hbdon.gfe.map' },
    { id: 'hbond-acceptor', fileName: '3fly.hbacc.gfe.map' },
    { id: 'positive', fileName: '3fly.mamn.gfe.map' },
    { id: 'negative', fileName: '3fly.meoo.gfe.map' },
    { id: 'aromatic', fileName: '3fly.acec.gfe.map' }
  ];

  const loadPromises = fragMapTypes.map(async (fragMap) => {
    try {
      console.log(`📁 [FRAGMAP-LOADER] Loading ${fragMap.fileName}...`);
      
      const response = await fetch(`/assets/fragmaps/${fragMap.fileName}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${fragMap.fileName}: ${response.status}`);
      }
      
      const fileContent = await response.text();
      console.log(`📊 [FRAGMAP-LOADER] Loaded ${fragMap.fileName}: ${fileContent.length} characters`);
      
      // Parse the FragMap file
      const { parseFragMapFile } = await import('../utils/fragMapParser.js');
      const parsedData = parseFragMapFile(fileContent);
      console.log(`✅ [FRAGMAP-LOADER] Parsed ${fragMap.fileName}: ${parsedData.gridData.length} grid points`);
      
      // Pre-generate spheres at different isovalues for instant access
      const { generateSpheresFromGrid } = await import('../utils/fragMapParser.js');
      const isovalues = [-2.0, -1.5, -1.0, -0.5, 0.0, 0.5];
      
      const sphereCache = new Map();
      for (const isovalue of isovalues) {
        const spheres = generateSpheresFromGrid(
          parsedData.gridData, 
          parsedData.gridInfo, 
          isovalue
        );
        sphereCache.set(isovalue, spheres);
        console.log(`🎯 [FRAGMAP-LOADER] ${fragMap.id} @ ${isovalue}: ${spheres.length} spheres`);
      }
      
      // Store parsed data and pre-computed spheres
      precomputedFragMaps.set(fragMap.id, {
        id: fragMap.id,
        fileName: fragMap.fileName,
        gridInfo: parsedData.gridInfo,
        gridData: parsedData.gridData,
        spheres: sphereCache,
        loadedAt: new Date().toISOString()
      });
      
      console.log(`✅ [FRAGMAP-LOADER] Successfully cached ${fragMap.id}`);
      
    } catch (error) {
      console.error(`❌ [FRAGMAP-LOADER] Error loading ${fragMap.fileName}:`, error);
    }
  });

  await Promise.all(loadPromises);
  
  console.log(`🎉 [FRAGMAP-LOADER] Initialization complete! Cached ${precomputedFragMaps.size} FragMaps`);
  
  // Log summary
  for (const [id, data] of precomputedFragMaps) {
    const totalSpheres = Array.from(data.spheres.values())
      .reduce((sum, spheres) => sum + spheres.length, 0);
    console.log(`📊 [FRAGMAP-LOADER] ${id}: ${data.spheres.size} isovalue presets, ${totalSpheres} total spheres`);
  }
};

/**
 * Get pre-computed spheres for a FragMap at specific isovalue
 * @param {string} fragMapId - FragMap ID
 * @param {number} isovalue - Isovalue threshold
 * @returns {Array} Pre-computed spheres or null if not available
 */
export const getPrecomputedSpheres = (fragMapId, isovalue) => {
  const fragMapData = precomputedFragMaps.get(fragMapId);
  if (!fragMapData) {
    console.warn(`⚠️ [FRAGMAP-LOADER] No pre-computed data for ${fragMapId}`);
    return null;
  }
  
  // Find closest pre-computed isovalue
  const isovalues = Array.from(fragMapData.spheres.keys()).sort((a, b) => a - b);
  const closestIsovalue = isovalues.reduce((prev, curr) => 
    Math.abs(curr - isovalue) < Math.abs(prev - isovalue) ? curr : prev
  );
  
  const spheres = fragMapData.spheres.get(closestIsovalue);
  console.log(`🎯 [FRAGMAP-LOADER] ${fragMapId} @ ${isovalue} → using ${closestIsovalue}: ${spheres.length} spheres`);
  
  return spheres;
};

/**
 * Get FragMap grid information
 * @param {string} fragMapId - FragMap ID
 * @returns {Object} Grid information or null if not available
 */
export const getFragMapInfo = (fragMapId) => {
  const fragMapData = precomputedFragMaps.get(fragMapId);
  return fragMapData ? fragMapData.gridInfo : null;
};

/**
 * Check if FragMap data is loaded
 * @param {string} fragMapId - FragMap ID
 * @returns {boolean} True if data is available
 */
export const isFragMapLoaded = (fragMapId) => {
  return precomputedFragMaps.has(fragMapId);
};

/**
 * Get all loaded FragMap IDs
 * @returns {Array} Array of FragMap IDs
 */
export const getLoadedFragMapIds = () => {
  return Array.from(precomputedFragMaps.keys());
};
