/**
 * SILCS FragMap Loader
 * 
 * This module loads and maps SILCS FragMap data to our application's FragMap types.
 * It handles the conversion from SILCS grid-based FragMaps to sphere coordinates.
 */

import { fragMaps } from '../data/converted/index.js';

/**
 * Mapping from SILCS FragMap types to our application's FragMap types
 */
const SILCS_TO_APP_MAPPING = {
  // SILCS types -> Application types
  'apolar': 'hydrophobic',     // Hydrophobic interactions
  'hbdon': 'hbond-donor',      // Hydrogen bond donors
  'hbacc': 'hbond-acceptor',   // Hydrogen bond acceptors
  'acec': 'positive',          // Positive/acidic regions
  'mamn': 'negative',          // Negative/basic regions  
  'meoo': 'aromatic',          // Aromatic interactions
  'tipo': 'aromatic',          // Another aromatic type
  'excl': 'exclusion'          // Exclusion zones (not typically displayed)
};

/**
 * Get spheres for a specific FragMap type with adaptive thresholding and isoValue range
 */
export function getFragMapSpheres(appFragMapType, isoValue = -0.5, options = {}) {
  console.log(`🔍 [SILCS-LOADER] Getting spheres for: ${appFragMapType}`);
  
  const {
    enableAdaptiveThreshold = true,
    adaptivePercentile = 85,  // Keep top 15% most favorable spheres
    maxSpheres = 8000,  // Reduced from 15000
    enableRangeFiltering = true,  // New: enable range filtering
    isoValueRange = 0.3  // New: range width (e.g., -0.5 ± 0.3 = -0.8 to -0.2)
  } = options;
  
  // Find the SILCS type that maps to this application type
  const silcsType = Object.keys(SILCS_TO_APP_MAPPING)
    .find(key => SILCS_TO_APP_MAPPING[key] === appFragMapType);
  
  if (!silcsType) {
    console.warn(`⚠️ [SILCS-LOADER] No SILCS mapping found for: ${appFragMapType}`);
    return [];
  }
  
  const fragMapData = fragMaps[silcsType];
  if (!fragMapData) {
    console.warn(`⚠️ [SILCS-LOADER] No data found for SILCS type: ${silcsType}`);
    return [];
  }
  
  console.log(`✅ [SILCS-LOADER] Found ${fragMapData.spheres.length} spheres for ${appFragMapType} (${silcsType})`);
  
  let filteredSpheres = fragMapData.spheres;
  
  // Apply isoValue range filtering if enabled
  if (enableRangeFiltering) {
    const minEnergy = isoValue - isoValueRange;
    const maxEnergy = isoValue + isoValueRange;
    
    console.log(`🎯 [SILCS-LOADER] IsoValue range: ${minEnergy.toFixed(3)} to ${maxEnergy.toFixed(3)}`);
    
    filteredSpheres = fragMapData.spheres.filter(sphere => 
      sphere.energy >= minEnergy && sphere.energy <= maxEnergy
    );
    
    console.log(`📊 [SILCS-LOADER] Range filtering: ${fragMapData.spheres.length} → ${filteredSpheres.length} spheres`);
  } else if (enableAdaptiveThreshold && fragMapData.spheres.length > 0) {
    // Apply adaptive thresholding if enabled
    const energies = fragMapData.spheres.map(s => s.energy).sort((a, b) => a - b); // Sort ascending (more negative first)
    const percentileIndex = Math.floor(energies.length * (adaptivePercentile / 100));
    const adaptiveThreshold = energies[Math.min(percentileIndex, energies.length - 1)];
    
    console.log(`🎯 [SILCS-LOADER] Adaptive threshold: ${adaptiveThreshold.toFixed(3)} (percentile ${adaptivePercentile}%)`);
    console.log(`📊 [SILCS-LOADER] Energy range: ${energies[0].toFixed(3)} to ${energies[energies.length - 1].toFixed(3)}`);
    
    // Use the more permissive threshold (user-provided or adaptive)
    const effectiveThreshold = Math.max(isoValue, adaptiveThreshold);
    console.log(`🔧 [SILCS-LOADER] Effective threshold: ${effectiveThreshold.toFixed(3)}`);
    
    filteredSpheres = fragMapData.spheres.filter(sphere => 
      sphere.energy <= effectiveThreshold
    );
  } else {
    // Use standard threshold
    filteredSpheres = fragMapData.spheres.filter(sphere => 
      sphere.energy <= isoValue
    );
  }
  
  // Apply maximum sphere limit if specified
  if (maxSpheres && filteredSpheres.length > maxSpheres) {
    // Sort by energy (most favorable first) and take top spheres
    filteredSpheres = filteredSpheres
      .sort((a, b) => a.energy - b.energy)
      .slice(0, maxSpheres);
    console.log(`✂️ [SILCS-LOADER] Limited to ${filteredSpheres.length} spheres (max: ${maxSpheres})`);
  }
  
  console.log(`🎯 [SILCS-LOADER] Final result: ${filteredSpheres.length} spheres`);
  
  return filteredSpheres;
}

/**
 * Get all available FragMap types
 */
export function getAvailableFragMapTypes() {
  return Object.values(SILCS_TO_APP_MAPPING)
    .filter(type => type !== 'exclusion') // Exclude exclusion zones
    .filter((type, index, arr) => arr.indexOf(type) === index); // Remove duplicates
}

/**
 * Get FragMap metadata
 */
export function getFragMapMetadata(appFragMapType) {
  const silcsType = Object.keys(SILCS_TO_APP_MAPPING)
    .find(key => SILCS_TO_APP_MAPPING[key] === appFragMapType);
  
  if (!silcsType || !fragMaps[silcsType]) {
    return null;
  }
  
  return {
    ...fragMaps[silcsType].metadata,
    silcsType,
    appType: appFragMapType
  };
}

/**
 * Debug function to show coordinate ranges for all FragMap types
 */
export function debugFragMapCoordinates() {
  console.log('🎯 [SILCS-LOADER] Debug: FragMap coordinate ranges');
  
  Object.entries(SILCS_TO_APP_MAPPING).forEach(([silcsType, appType]) => {
    if (fragMaps[silcsType] && fragMaps[silcsType].spheres.length > 0) {
      const spheres = fragMaps[silcsType].spheres;
      const xCoords = spheres.map(s => s.x);
      const yCoords = spheres.map(s => s.y);
      const zCoords = spheres.map(s => s.z);
      
      console.log(`   ${appType} (${silcsType}):`);
      console.log(`     Count: ${spheres.length}`);
      console.log(`     X: ${Math.min(...xCoords).toFixed(1)} to ${Math.max(...xCoords).toFixed(1)} Å`);
      console.log(`     Y: ${Math.min(...yCoords).toFixed(1)} to ${Math.max(...yCoords).toFixed(1)} Å`);
      console.log(`     Z: ${Math.min(...zCoords).toFixed(1)} to ${Math.max(...zCoords).toFixed(1)} Å`);
    }
  });
}

export default {
  getFragMapSpheres,
  getAvailableFragMapTypes,
  getFragMapMetadata,
  debugFragMapCoordinates
};
