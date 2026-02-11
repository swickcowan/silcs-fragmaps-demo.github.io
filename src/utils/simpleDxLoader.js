/**
 * Simple DX Volume Loader for Mol*
 * Uses Mol*'s native DX parsing capabilities
 */

/**
 * Loads a DX file and creates volume representation in Mol*
 * @param {Object} viewer - Mol* plugin instance
 * @param {string} dxUrl - URL to DX file
 * @param {Object} options - Rendering options
 * @returns {Promise<Object>} Volume and representation objects
 */
export const loadDxVolume = async (viewer, dxUrl, options = {}) => {
  try {
    console.log('[DX-LOADER] Loading DX volume:', dxUrl);
    
    // Debug: Check what builders are available
    console.log('[DX-LOADER] Available builders:', Object.keys(viewer.builders));
    
    // 1. Download the DX file
    const data = await viewer.builders.data.download({
      url: dxUrl,
      isBinary: false
    }, { state: { isGhost: false } });
    
    console.log('[DX-LOADER] DX data downloaded successfully');
    
    // 2. Get DX format parser
    const dxProvider = viewer.dataFormats.get('dx');
    if (!dxProvider) {
      throw new Error('DX format provider not available in Mol* build');
    }
    
    console.log('[DX-LOADER] DX provider found:', dxProvider);
    
    // 3. Parse volume using DX provider
    const volume = await dxProvider.parse(viewer, data);
    
    console.log('[DX-LOADER] DX volume parsed successfully');
    console.log('  Volume dimensions:', volume.grid.cells.space.dimensions);
    console.log('  Data points:', volume.grid.cells.data.length);
    
    // 4. Create isosurface representation
    const representation = await viewer.builders.volume.representation.add(volume, {
      type: 'isosurface',
      typeParams: {
        isoValue: {
          kind: 'absolute',
          absoluteValue: options.isoValue || -0.8  // SILCS fragmap threshold
        },
        alpha: options.alpha || 0.6,           // transparency
        smoothness: options.smoothness || 1,
      },
      color: 'uniform',
      colorParams: {
        value: options.color || 0xff0000  // default red
      }
    });
    
    console.log('[DX-LOADER] ✅ Volume representation created successfully');
    console.log('  IsoValue:', options.isoValue || -0.8);
    console.log('  Alpha:', options.alpha || 0.6);
    
    return { volume, representation };
    
  } catch (error) {
    console.error('[DX-LOADER] Failed to load DX volume:', error);
    throw new Error(`DX volume loading failed: ${error.message}`);
  }
};
