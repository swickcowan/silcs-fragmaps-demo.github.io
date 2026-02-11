/**
 * Spatial Filtering Utilities for SILCS FragMaps
 * Enhanced filtering based on distance and energy rather than bounding boxes
 */

/**
 * Calculates Euclidean distance between two 3D points
 * @param {Object} point1 - First point {x, y, z}
 * @param {Object} point2 - Second point {x, y, z}
 * @returns {number} Distance in Å
 */
export const calculateDistance = (point1, point2) => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Filters spheres based on proximity to selected protein residues
 * @param {Array} spheres - Array of sphere objects {x, y, z, energy}
 * @param {Array} residues - Array of residue objects with coordinates
 * @param {number} maxDistance - Maximum distance in Å
 * @returns {Array} Filtered spheres within distance threshold
 */
export const filterSpheresByProximity = (spheres, residues, maxDistance = 5.0) => {
  console.log(`🔍 [SPATIAL-FILTER] Filtering ${spheres.length} spheres by proximity to ${residues.length} residues`);
  console.log(`🔍 [SPATIAL-FILTER] Max distance threshold: ${maxDistance}Å`);
  
  if (!residues || residues.length === 0) {
    console.log(`⚠️ [SPATIAL-FILTER] No residues provided, returning all spheres`);
    return spheres;
  }
  
  const filteredSpheres = [];
  let processedCount = 0;
  
  for (const sphere of spheres) {
    let minDistance = Infinity;
    
    // Find minimum distance to any selected residue
    for (const residue of residues) {
      if (residue.coordinates) {
        const distance = calculateDistance(sphere, residue.coordinates);
        minDistance = Math.min(minDistance, distance);
        
        // Early exit if we're already within threshold
        if (minDistance <= maxDistance) {
          break;
        }
      }
    }
    
    // Include sphere if it's within distance threshold
    if (minDistance <= maxDistance) {
      filteredSpheres.push({
        ...sphere,
        minDistance: minDistance,
        proximityScore: 1.0 - (minDistance / maxDistance) // Higher score = closer to residues
      });
    }
    
    processedCount++;
    
    // Progress logging for large datasets
    if (processedCount % 10000 === 0) {
      console.log(`📊 [SPATIAL-FILTER] Processed ${processedCount}/${spheres.length} spheres, found ${filteredSpheres.length} matches`);
    }
  }
  
  console.log(`✅ [SPATIAL-FILTER] Filtered to ${filteredSpheres.length} spheres (${((filteredSpheres.length / spheres.length) * 100).toFixed(1)}% of original)`);
  
  return filteredSpheres;
};

/**
 * Applies energy-based weighting to filtered spheres
 * @param {Array} spheres - Array of filtered spheres
 * @param {number} energyThreshold - Maximum energy threshold (kcal/mol)
 * @returns {Array} Energy-weighted spheres
 */
export const weightSpheresByEnergy = (spheres, energyThreshold = 0.0) => {
  console.log(`⚡ [SPATIAL-FILTER] Weighting ${spheres.length} spheres by energy (threshold: ${energyThreshold})`);
  
  const weightedSpheres = spheres
    .filter(sphere => sphere.energy <= energyThreshold)
    .map(sphere => ({
      ...sphere,
      energyWeight: calculateEnergyWeight(sphere.energy),
      combinedScore: calculateCombinedScore(sphere)
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore); // Sort by combined score (highest first)
  
  console.log(`✅ [SPATIAL-FILTER] Energy filtering: ${spheres.length} → ${weightedSpheres.length} spheres`);
  console.log(`⚡ [SPATIAL-FILTER] Energy range: ${Math.min(...weightedSpheres.map(s => s.energy)).toFixed(2)} to ${Math.max(...weightedSpheres.map(s => s.energy)).toFixed(2)} kcal/mol`);
  
  return weightedSpheres;
};

/**
 * Calculates energy weight for a sphere
 * @param {number} energy - Energy value in kcal/mol
 * @returns {number} Weight between 0 and 1
 */
const calculateEnergyWeight = (energy) => {
  // Lower (more negative) energies are more favorable
  // Scale: -2.0 = 1.0 (best), 0.0 = 0.5 (neutral), +2.0 = 0.0 (worst)
  const normalizedEnergy = Math.max(-2.0, Math.min(2.0, energy));
  return (2.0 - normalizedEnergy) / 4.0;
};

/**
 * Calculates combined score from proximity and energy
 * @param {Object} sphere - Sphere object with proximityScore and energy
 * @returns {number} Combined score between 0 and 1
 */
const calculateCombinedScore = (sphere) => {
  const proximityWeight = 0.6; // 60% weight to proximity
  const energyWeight = 0.4;    // 40% weight to energy
  
  const proximityScore = sphere.proximityScore || 0;
  const energyScore = calculateEnergyWeight(sphere.energy);
  
  return (proximityScore * proximityWeight) + (energyScore * energyWeight);
};

/**
 * Creates adaptive spatial filter for specific protein regions
 * @param {Array} residues - Selected protein residues
 * @param {Object} options - Filtering options
 * @returns {Object} Filter object with filter and weight functions
 */
export const createRegionFilter = (residues, options = {}) => {
  const {
    maxDistance = 5.0,
    energyThreshold = 0.0,
    maxSpheres = 5000,
    adaptiveDistance = true
  } = options;
  
  console.log(`🎯 [SPATIAL-FILTER] Creating region filter for ${residues.length} residues`);
  console.log(`🎯 [SPATIAL-FILTER] Options:`, { maxDistance, energyThreshold, maxSpheres, adaptiveDistance });
  
  // Calculate adaptive distance based on region size
  let effectiveMaxDistance = maxDistance;
  if (adaptiveDistance && residues.length > 0) {
    const regionSize = calculateRegionSize(residues);
    effectiveMaxDistance = maxDistance * (1.0 + regionSize / 20.0); // Remove the Math.min cap!
    console.log(`📏 [SPATIAL-FILTER] Adaptive distance: ${effectiveMaxDistance.toFixed(1)}Å (region size: ${regionSize.toFixed(1)}Å)`);
  }
  
  return {
    /**
     * Filters spheres based on region criteria
     * @param {Array} spheres - Input spheres
     * @returns {Array} Filtered spheres
     */
    filter: (spheres) => {
      // Step 1: Proximity filtering
      const proximityFiltered = filterSpheresByProximity(spheres, residues, effectiveMaxDistance);
      
      // Step 2: Energy filtering
      const energyFiltered = weightSpheresByEnergy(proximityFiltered, energyThreshold);
      
      // Step 3: Limit to max spheres (keep best scoring)
      const limited = energyFiltered.slice(0, maxSpheres);
      
      console.log(`🎯 [SPATIAL-FILTER] Final result: ${spheres.length} → ${limited.length} spheres`);
      
      return limited;
    },
    
    /**
     * Calculates weight for a specific sphere
     * @param {Object} sphere - Sphere object
     * @returns {number} Weight score
     */
    weight: (sphere) => {
      let minDistance = Infinity;
      
      for (const residue of residues) {
        if (residue.coordinates) {
          const distance = calculateDistance(sphere, residue.coordinates);
          minDistance = Math.min(minDistance, distance);
        }
      }
      
      const proximityScore = minDistance <= effectiveMaxDistance ? 
        1.0 - (minDistance / effectiveMaxDistance) : 0;
      const energyScore = calculateEnergyWeight(sphere.energy);
      
      return (proximityScore * 0.6) + (energyScore * 0.4);
    },
    
    /**
     * Gets filter statistics
     * @returns {Object} Statistics about the filter
     */
    getStats: () => ({
      residueCount: residues.length,
      maxDistance: effectiveMaxDistance,
      energyThreshold,
      regionSize: residues.length > 0 ? calculateRegionSize(residues) : 0
    })
  };
};

/**
 * Calculates the size of a protein region
 * @param {Array} residues - Array of residue objects
 * @returns {number} Region size in Å (maximum dimension)
 */
const calculateRegionSize = (residues) => {
  if (residues.length === 0) return 0;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const residue of residues) {
    if (residue.coordinates) {
      const { x, y, z } = residue.coordinates;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
  }
  
  return Math.max(maxX - minX, maxY - minY, maxZ - minZ);
};

/**
 * Legacy bounding box filter for backward compatibility
 * @param {Array} spheres - Array of spheres
 * @param {Object} bounds - Bounding box {min: [x,y,z], max: [x,y,z]}
 * @returns {Array} Filtered spheres
 */
export const filterSpheresByBounds = (spheres, bounds) => {
  if (!bounds) return spheres;
  
  return spheres.filter(sphere => {
    return sphere.x >= bounds.min[0] && sphere.x <= bounds.max[0] &&
           sphere.y >= bounds.min[1] && sphere.y <= bounds.max[1] &&
           sphere.z >= bounds.min[2] && sphere.z <= bounds.max[2];
  });
};

/**
 * Enhanced filtering that combines proximity and energy with adaptive parameters
 * Optimized to preserve high-energy detail spheres while maintaining performance
 * @param {Array} spheres - Input spheres
 * @param {Array} residues - Selected residues
 * @param {Object} options - Filtering options
 * @returns {Array} Filtered and weighted spheres
 */
export const enhancedSpatialFilter = (spheres, residues, options = {}) => {
  console.log(`🚀 [SPATIAL-FILTER] Enhanced spatial filtering: ${spheres.length} spheres, ${residues.length} residues`);
  
  const {
    maxDistance = 25.0,
    energyThreshold = -0.8,
    maxSpheres = 8000,
    adaptiveDistance = true,
    preserveHighEnergy = true,  // New option to preserve high-energy spheres
    highEnergyPercentile = 10,  // Preserve top 10% most favorable spheres
    detailPreservationRadius = 5.0  // Preserve detail spheres within this radius
  } = options;
  
  // Separate high-energy spheres (most favorable) before filtering
  let highEnergySpheres = [];
  let regularSpheres = [...spheres];
  
  if (preserveHighEnergy && spheres.length > 0) {
    const energies = spheres.map(s => s.energy).sort((a, b) => a - b); // More negative first
    const highEnergyThreshold = energies[Math.floor(energies.length * (highEnergyPercentile / 100))];
    
    highEnergySpheres = spheres.filter(s => s.energy <= highEnergyThreshold);
    regularSpheres = spheres.filter(s => s.energy > highEnergyThreshold);
    
    console.log(`💎 [SPATIAL-FILTER] Preserving ${highEnergySpheres.length} high-energy spheres (threshold: ${highEnergyThreshold.toFixed(3)})`);
  }
  
  // Apply standard filtering to regular spheres
  const filter = createRegionFilter(residues, {
    maxDistance,
    energyThreshold,
    maxSpheres: maxSpheres - highEnergySpheres.length,  // Reserve space for high-energy spheres
    adaptiveDistance
  });
  
  const filteredRegular = filter.filter(regularSpheres);
  
  // Combine filtered regular spheres with preserved high-energy spheres
  let combinedSpheres = [...highEnergySpheres, ...filteredRegular];
  
  // Enhanced scoring that gives extra weight to high-energy spheres near residues
  combinedSpheres = combinedSpheres.map(sphere => {
    let minDistance = Infinity;
    
    for (const residue of residues) {
      if (residue.coordinates) {
        const distance = calculateDistance(sphere, residue.coordinates);
        minDistance = Math.min(minDistance, distance);
      }
    }
    
    const proximityScore = minDistance <= maxDistance ? 
      1.0 - (minDistance / maxDistance) : 0;
    const energyScore = calculateEnergyWeight(sphere.energy);
    
    // Boost score for high-energy spheres that are close to residues
    let detailBonus = 0;
    if (preserveHighEnergy && sphere.energy <= (energyThreshold - 0.5)) {
      if (minDistance <= detailPreservationRadius) {
        detailBonus = 0.3; // 30% bonus for high-energy detail spheres
      }
    }
    
    const combinedScore = (proximityScore * 0.5) + (energyScore * 0.3) + detailBonus;
    
    return {
      ...sphere,
      minDistance,
      proximityScore,
      energyScore: calculateEnergyWeight(sphere.energy),
      combinedScore
    };
  });
  
  // Sort by combined score and apply final limit
  combinedSpheres.sort((a, b) => b.combinedScore - a.combinedScore);
  const finalResult = combinedSpheres.slice(0, maxSpheres);
  
  const stats = {
    ...filter.getStats(),
    highEnergyPreserved: highEnergySpheres.length,
    detailBonusApplied: finalResult.filter(s => s.combinedScore > 0.8).length
  };
  
  console.log(`📊 [SPATIAL-FILTER] Enhanced filter stats:`, stats);
  console.log(`🎯 [SPATIAL-FILTER] Final result: ${spheres.length} → ${finalResult.length} spheres`);
  console.log(`💎 [SPATIAL-FILTER] Top sphere score: ${finalResult.length > 0 ? finalResult[0].combinedScore?.toFixed(3) : 'N/A'}`);
  
  return finalResult;
};
