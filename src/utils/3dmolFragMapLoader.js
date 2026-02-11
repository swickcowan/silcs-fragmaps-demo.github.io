/**
 * 3Dmol.js FragMap Loader Utility
 * Handles loading and rendering of SILCS FragMaps using 3Dmol.js
 * Uses addCustomGeo / addSphere for FragMap visualisation so that
 * molecule models (protein / ligand) are never affected.
 */

import { loadFragMapData } from './fragMapLoader.js';

/**
 * Loads and renders a FragMap as an isosurface in 3Dmol.js
 * @param {Object} viewerWrapper - 3Dmol viewer wrapper instance
 * @param {string} fragMapId - FragMap identifier
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {Promise<Object>} Result with shape handle and metadata
 */
export const load3DmolFragMap = async (viewerWrapper, fragMapId, fragMapConfig) => {
  try {
    console.log(`⚡ [3DMOL-FRAGMAP] Loading FragMap ${fragMapId} for 3Dmol.js...`);

    const fragMapData = await loadFragMapData(fragMapId);

    if (!fragMapData) {
      throw new Error(`Failed to load FragMap data for ${fragMapId}`);
    }

    console.log(`✅ [3DMOL-FRAGMAP] FragMap data loaded:`, {
      gridDimensions: fragMapData.gridInfo,
      dataPoints: fragMapData.gridData.length,
      energyRange: getEnergyRange(fragMapData.gridData)
    });

    // For now fall through to sphere-based representation
    return await load3DmolSphereFragMap(viewerWrapper, fragMapId, fragMapConfig);

  } catch (error) {
    console.error(`❌ [3DMOL-FRAGMAP] Error loading FragMap ${fragMapId}:`, error);
    throw error;
  }
};

/**
 * Removes a FragMap visualization (set of spheres) from the viewer
 * @param {Object} viewerWrapper - 3Dmol viewer wrapper instance
 * @param {string} shapeGroupId - Shape group ID returned from load
 * @returns {Promise<boolean>} Success status
 */
export const remove3DmolFragMap = async (viewerWrapper, shapeGroupId) => {
  try {
    console.log(`🗑️ [3DMOL-FRAGMAP] Removing FragMap shapes (group: ${shapeGroupId})...`);
    const viewer = viewerWrapper.viewer;

    // Retrieve the list of shape handles we stored on creation
    const handles = viewerWrapper.shapeIds?.get(shapeGroupId);
    if (handles && Array.isArray(handles)) {
      for (const handle of handles) {
        try {
          viewer.removeShape(handle);
        } catch (_) {
          // shape may already be gone – that's fine
        }
      }
      viewerWrapper.shapeIds.delete(shapeGroupId);
    } else {
      // Fallback – remove all shapes (less precise, but cleans up)
      console.warn(`⚠️ [3DMOL-FRAGMAP] No shape handles found for ${shapeGroupId}, clearing all shapes`);
      viewer.removeAllShapes();
    }

    viewer.render();
    console.log(`✅ [3DMOL-FRAGMAP] FragMap shapes removed`);
    return true;

  } catch (error) {
    console.error(`❌ [3DMOL-FRAGMAP] Error removing FragMap:`, error);
    return false;
  }
};

/**
 * Creates sphere-based representation for FragMap data.
 * Uses viewer.addSphere() which creates shapes that are independent
 * of the molecule models (protein / ligand) so setStyle won't clobber them.
 *
 * @param {Object} viewerWrapper - 3Dmol viewer wrapper instance
 * @param {string} fragMapId - FragMap identifier
 * @param {Object} fragMapConfig - FragMap configuration
 * @returns {Promise<Object|null>} Result with modelId (shape group key) or null
 */
export const load3DmolSphereFragMap = async (viewerWrapper, fragMapId, fragMapConfig) => {
  try {
    console.log(`⚡ [3DMOL-SPHERES] Loading sphere-based FragMap ${fragMapId}...`);

    // Load the FragMap data
    const fragMapData = await loadFragMapData(fragMapId);

    if (!fragMapData) {
      throw new Error(`Failed to load FragMap data for ${fragMapId}`);
    }

    // Calculate filter center (prefer selectedProteinPart, fallback to ligand center)
    let filterCenter = null;
    let filterRadius = 15.0; // Default radius around ligand

    if (!fragMapConfig.selectedProteinPart?.bounds && viewerWrapper.models) {
      // Try to find ligand to center on
      let ligandModel = null;
      for (const [key, m] of viewerWrapper.models) {
        if (m.type === 'ligand') {
          ligandModel = key; // The key is the GLModel object itself
          break;
        }
      }

      if (ligandModel) {
        const atoms = ligandModel.selectedAtoms({});
        if (atoms.length > 0) {
          let x = 0, y = 0, z = 0;
          atoms.forEach(a => { x += a.x; y += a.y; z += a.z; });
          filterCenter = { x: x / atoms.length, y: y / atoms.length, z: z / atoms.length };
          console.log(`🎯 [3DMOL-SPHERES] Filtering spheres around ligand center:`, filterCenter);
        }
      }
    }

    // Generate spheres from grid data
    const spheres = generateSpheresFromGrid(fragMapData, {
      ...fragMapConfig,
      filterCenter,
      filterRadius
    });

    if (!spheres || spheres.length === 0) {
      console.warn(`⚠️ [3DMOL-SPHERES] No spheres generated for ${fragMapId}`);
      return null;
    }

    console.log(`✅ [3DMOL-SPHERES] Generated ${spheres.length} spheres for ${fragMapId}`);

    const viewer = viewerWrapper.viewer;
    const shapeHandles = [];

    // Add each sphere as a 3Dmol shape (independent of molecule models)
    for (const sphere of spheres) {
      const handle = viewer.addSphere({
        center: { x: sphere.x, y: sphere.y, z: sphere.z },
        radius: sphere.radius,
        color: sphere.color,
        alpha: sphere.alpha
      });
      if (handle !== undefined && handle !== null) {
        shapeHandles.push(handle);
      }
    }

    // Generate a unique group key so we can remove just this set later
    const shapeGroupId = `fragmap_${fragMapId}_${Date.now()}`;
    viewerWrapper.shapeIds.set(shapeGroupId, shapeHandles);

    // Render the updated scene
    viewer.render();

    console.log(`✅ [3DMOL-SPHERES] Sphere representation created for ${fragMapId} (${shapeHandles.length} shapes, group: ${shapeGroupId})`);

    return {
      modelId: shapeGroupId,   // used by FragMapManager to track & remove
      sphereCount: spheres.length,
      representation: {
        type: 'spheres',
        shapeGroupId,
        fragMapId,
        config: fragMapConfig
      }
    };

  } catch (error) {
    console.error(`❌ [3DMOL-SPHERES] Error loading sphere FragMap ${fragMapId}:`, error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Generates spheres from grid data for visualization
 */
const generateSpheresFromGrid = (fragMapData, config) => {
  const { gridInfo, gridData } = fragMapData;
  const spheres = [];

  const {
    isoValue = 1.0,
    sphereSize = 0.25,
    maxSpheres = 1500,
    selectedProteinPart,
    isoValueRange = 0.1,
    maxDistance = 100.0,
    color = 'white',
    filterCenter,
    filterRadius = 15.0
  } = config;


  // Determine logic direction:
  // 'lower' = values <= threshold (GFE, binding energy)
  // 'higher' = values >= threshold (Exclusion, density)
  const thresholdMode = config.thresholdMode || (isoValue < 0 ? 'lower' : 'higher');
  const isLowerMode = thresholdMode === 'lower';

  // Make threshold consistently "stricter" by adding range away from zero
  // Lower mode (GFE): -0.8 -> -0.9 (stricter)
  // Higher mode (Excl): 0.5 -> 0.6 (stricter)
  const threshold = isLowerMode
    ? isoValue - isoValueRange
    : isoValue + isoValueRange;

  const spacing = gridInfo.grid_spacing || 0.8;

  // Convert color name to hex
  const sphereColor = convertColorToHex(color);

  for (let i = 0; i < gridData.length; i++) {
    const value = gridData[i];
    let includeSphere = false;

    if (isLowerMode) {
      // GFE maps: value <= threshold (more negative is better)
      if (value <= threshold) includeSphere = true;
    } else {
      // Exclusion/Density maps: value >= threshold (more positive is significant)
      if (value >= threshold) includeSphere = true;
    }

    if (includeSphere) {
      // Convert 1D index to 3D coordinates
      const ix = i % gridInfo.nx;
      const iy = Math.floor(i / gridInfo.nx) % gridInfo.ny;
      const iz = Math.floor(i / (gridInfo.nx * gridInfo.ny));

      const x = ix * spacing + (gridInfo.origin_x || 0);
      const y = iy * spacing + (gridInfo.origin_y || 0);
      const z = iz * spacing + (gridInfo.origin_z || 0);

      // Check distance to selected protein region or filter center
      if (selectedProteinPart?.bounds) {
        const dist = calculateDistanceToBounds(x, y, z, selectedProteinPart.bounds);
        if (dist > maxDistance) {
          continue;
        }
      } else if (filterCenter) {
        // Filter around center point (e.g. ligand)
        const dx = x - filterCenter.x;
        const dy = y - filterCenter.y;
        const dz = z - filterCenter.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > filterRadius) {
          continue;
        }
      }

      spheres.push({
        x,
        y,
        z,
        radius: sphereSize,
        color: sphereColor,
        alpha: config.alpha || 0.6,
        intensity: value
      });
    }
  }

  // Sort spheres by intensity based on logic direction
  if (isLowerMode) {
    // Ascending: most negative/favorable first
    spheres.sort((a, b) => a.intensity - b.intensity);
  } else {
    // Descending: most positive/significant first
    spheres.sort((a, b) => b.intensity - a.intensity);
  }

  // Limit number of spheres to avoid performance issues
  if (spheres.length > maxSpheres) {
    // Keep top N most significant spheres
    return spheres.slice(0, maxSpheres);
  }

  return spheres;
};

/**
 * Converts a color name or hex string to a hex string that 3Dmol understands.
 */
const convertColorToHex = (colorName) => {
  const colorMap = {
    'yellow': '#FFFF00',
    'blue': '#0000FF',
    'red': '#FF0000',
    'green': '#00FF00',
    'purple': '#800080',
    'orange': '#FFA500',
    'white': '#FFFFFF',
    'gray': '#808080',
    'black': '#000000'
  };

  if (typeof colorName !== 'string') return '#FFFFFF';

  // Already a hex string
  if (colorName.startsWith('#')) return colorName;

  return colorMap[colorName.toLowerCase()] || colorName;
};

/**
 * Calculates distance from point to bounding box
 */
const calculateDistanceToBounds = (x, y, z, bounds) => {
  if (!bounds) return 0;

  const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX);
  const dy = Math.max(bounds.minY - y, 0, y - bounds.maxY);
  const dz = Math.max(bounds.minZ - z, 0, z - bounds.maxZ);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculates energy range from grid data
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
 * Batch loads multiple FragMaps
 */
export const batchLoad3DmolFragMaps = async (viewerWrapper, fragMapConfigs, options = {}) => {
  const { useSpheres = true, maxConcurrent = 3 } = options;
  const results = [];

  console.log(`📦 [3DMOL-FRAGMAP] Batch loading ${fragMapConfigs.length} FragMaps...`);

  for (let i = 0; i < fragMapConfigs.length; i += maxConcurrent) {
    const batch = fragMapConfigs.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(async (config) => {
      try {
        if (useSpheres) {
          return await load3DmolSphereFragMap(viewerWrapper, config.id, config);
        } else {
          return await load3DmolFragMap(viewerWrapper, config.id, config);
        }
      } catch (error) {
        console.error(`❌ [3DMOL-FRAGMAP] Failed to load ${config.id}:`, error);
        return { error, fragMapId: config.id };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i + maxConcurrent < fragMapConfigs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ [3DMOL-FRAGMAP] Batch loading complete. ${results.filter(r => !r?.error).length} successful, ${results.filter(r => r?.error).length} failed.`);

  return results;
};
