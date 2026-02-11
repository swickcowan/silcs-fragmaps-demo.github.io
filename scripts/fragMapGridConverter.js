#!/usr/bin/env node

/**
 * FragMap Grid to Sphere Converter
 * 
 * This script properly converts FragMap grid data to sphere coordinates
 * by reading the grid values and converting them to 3D sphere positions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const FRAGMAP_DIR = '/Users/henrycowan/Desktop/silcs-fragmaps-demo-main/from_silcsbio/maps';
const OUTPUT_DIR = '/Users/henrycowan/Silcs Bio Interactive Replica/src/data/converted';

/**
 * Parse FragMap grid file and extract grid parameters and data
 */
function parseFragMapGrid(mapPath) {
  console.log('🔍 Parsing FragMap grid:', mapPath);
  const content = fs.readFileSync(mapPath, 'utf8');
  const lines = content.split('\n');
  
  let gridInfo = {};
  let gridData = [];
  let inData = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('SPACING')) {
      gridInfo.spacing = parseFloat(line.split(/\s+/)[1]);
    } else if (line.includes('NELEMENTS')) {
      const parts = line.split(/\s+/);
      gridInfo.nx = parseInt(parts[1]);
      gridInfo.ny = parseInt(parts[2]);
      gridInfo.nz = parseInt(parts[3]);
    } else if (line.includes('CENTER')) {
      const parts = line.split(/\s+/);
      gridInfo.centerX = parseFloat(parts[1]);
      gridInfo.centerY = parseFloat(parts[2]);
      gridInfo.centerZ = parseFloat(parts[3]);
    } else if (line.includes('MACROMOLECULE')) {
      inData = true;
      continue;
    } else if (inData && line) {
      // Parse grid values
      const value = parseFloat(line);
      if (!isNaN(value)) {
        gridData.push(value);
      }
    }
  }
  
  console.log(`✅ Parsed grid: ${gridInfo.nx}×${gridInfo.ny}×${gridInfo.nz}, ${gridData.length} values`);
  console.log(`   Center: (${gridInfo.centerX}, ${gridInfo.centerY}, ${gridInfo.centerZ})`);
  console.log(`   Spacing: ${gridInfo.spacing} Å`);
  
  return { gridInfo, gridData };
}

/**
 * Convert grid data to sphere coordinates with enhanced accuracy
 */
function gridToSpheres(gridInfo, gridData, threshold = -0.5, options = {}) {
  console.log(`🔄 Converting grid to spheres (threshold: ${threshold})`);
  
  const {
    enableInterpolation = true,
    interpolationFactor = 2,  // 2x density increase
    enableVariableSizing = true,
    enableGradientWeighting = true
  } = options;
  
  const { nx, ny, nz, centerX, centerY, centerZ, spacing } = gridInfo;
  const spheres = [];
  
  // Calculate grid origin (bottom-left-back corner)
  const originX = centerX - (nx * spacing) / 2;
  const originY = centerY - (ny * spacing) / 2;
  const originZ = centerZ - (nz * spacing) / 2;
  
  console.log(`   Grid origin: (${originX.toFixed(1)}, ${originY.toFixed(1)}, ${originZ.toFixed(1)})`);
  console.log(`   Interpolation: ${enableInterpolation ? `${interpolationFactor}x density` : 'disabled'}`);
  
  // Helper function to get grid value at indices
  const getGridValue = (x, y, z) => {
    if (x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz) {
      return null;
    }
    const index = z * nx * ny + y * nx + x;
    return gridData[index];
  };
  
  // Helper function for trilinear interpolation
  const trilinearInterpolation = (x, y, z) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const x1 = Math.min(x0 + 1, nx - 1);
    const y1 = Math.min(y0 + 1, ny - 1);
    const z1 = Math.min(z0 + 1, nz - 1);
    
    const xd = x - x0;
    const yd = y - y0;
    const zd = z - z0;
    
    const c000 = getGridValue(x0, y0, z0) || 0;
    const c001 = getGridValue(x0, y0, z1) || 0;
    const c010 = getGridValue(x0, y1, z0) || 0;
    const c011 = getGridValue(x0, y1, z1) || 0;
    const c100 = getGridValue(x1, y0, z0) || 0;
    const c101 = getGridValue(x1, y0, z1) || 0;
    const c110 = getGridValue(x1, y1, z0) || 0;
    const c111 = getGridValue(x1, y1, z1) || 0;
    
    const c00 = c000 * (1 - xd) + c100 * xd;
    const c01 = c001 * (1 - xd) + c101 * xd;
    const c10 = c010 * (1 - xd) + c110 * xd;
    const c11 = c011 * (1 - xd) + c111 * xd;
    
    const c0 = c00 * (1 - yd) + c10 * yd;
    const c1 = c01 * (1 - yd) + c11 * yd;
    
    return c0 * (1 - zd) + c1 * zd;
  };
  
  // Helper function to calculate energy gradient magnitude
  const calculateGradient = (x, y, z) => {
    const dx = (getGridValue(x + 1, y, z) - getGridValue(x - 1, y, z)) / (2 * spacing);
    const dy = (getGridValue(x, y + 1, z) - getGridValue(x, y - 1, z)) / (2 * spacing);
    const dz = (getGridValue(x, y, z + 1) - getGridValue(x, y, z - 1)) / (2 * spacing);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
  
  // Step size for interpolated sampling
  const stepSize = enableInterpolation ? 1.0 / interpolationFactor : 1.0;
  
  // Process in chunks to manage memory for large datasets
  const chunkSize = 10000; // Process 10k spheres at a time
  let sphereCount = 0;
  
  // Convert grid indices to coordinates with optional interpolation
  for (let z = 0; z < nz; z += stepSize) {
    for (let y = 0; y < ny; y += stepSize) {
      for (let x = 0; x < nx; x += stepSize) {
        let value, gradient = 0;
        
        if (enableInterpolation && (x % 1 !== 0 || y % 1 !== 0 || z % 1 !== 0)) {
          // Use interpolation for sub-grid positions
          value = trilinearInterpolation(x, y, z);
          if (enableGradientWeighting) {
            gradient = calculateGradient(Math.floor(x), Math.floor(y), Math.floor(z));
          }
        } else {
          // Direct grid access for integer positions
          const index = Math.floor(z) * nx * ny + Math.floor(y) * nx + Math.floor(x);
          value = gridData[index];
          if (enableGradientWeighting) {
            gradient = calculateGradient(Math.floor(x), Math.floor(y), Math.floor(z));
          }
        }
        
        // Only include points below threshold (more negative = more favorable)
        if (value <= threshold) {
          // Convert to 3D coordinates
          const coordX = originX + x * spacing;
          const coordY = originY + y * spacing;
          const coordZ = originZ + z * spacing;
          
          // Calculate adaptive intensity based on energy and gradient
          let intensity = Math.abs(value);
          if (enableGradientWeighting) {
            // Boost intensity for areas with high gradients (edges/details)
            const gradientBoost = Math.min(gradient * 0.5, 1.0);
            intensity = intensity * (1.0 + gradientBoost);
          }
          
          // Calculate variable sphere size based on energy and local density
          let sphereSize = 0.25; // Base size
          if (enableVariableSizing) {
            // Smaller spheres for more negative energies (stronger interactions)
            const energyFactor = Math.max(0.3, Math.min(1.5, Math.abs(value) / 2.0));
            sphereSize = sphereSize / energyFactor;
          }
          
          spheres.push({
            x: coordX,
            y: coordY,
            z: coordZ,
            energy: value,
            intensity: Math.min(intensity, 2.0), // Cap intensity
            size: sphereSize,
            gradient: gradient,
            isInterpolated: (x % 1 !== 0 || y % 1 !== 0 || z % 1 !== 0)
          });
          
          sphereCount++;
          
          // Log progress for large datasets
          if (sphereCount % chunkSize === 0) {
            console.log(`   Processed ${sphereCount} spheres...`);
          }
        }
      }
    }
  }
  
  console.log(`✅ Generated ${spheres.length} spheres from grid data`);
  
  // Calculate coordinate ranges
  if (spheres.length > 0) {
    const xCoords = spheres.map(s => s.x);
    const yCoords = spheres.map(s => s.y);
    const zCoords = spheres.map(s => s.z);
    
    console.log(`   Sphere ranges:`);
    console.log(`     X: ${Math.min(...xCoords).toFixed(1)} to ${Math.max(...xCoords).toFixed(1)} Å`);
    console.log(`     Y: ${Math.min(...yCoords).toFixed(1)} to ${Math.max(...yCoords).toFixed(1)} Å`);
    console.log(`     Z: ${Math.min(...zCoords).toFixed(1)} to ${Math.max(...zCoords).toFixed(1)} Å`);
  }
  
  return spheres;
}

/**
 * Generate JavaScript module for spheres
 */
function generateSphereModule(spheres, fragMapType) {
  const moduleContent = `/**
 * Auto-generated FragMap spheres for ${fragMapType}
 * Generated by fragMapGridConverter.js
 */

export const spheres = ${JSON.stringify(spheres, null, 2)};

export const metadata = {
  type: '${fragMapType}',
  count: spheres.length,
  generated: new Date().toISOString()
};
`;

  return moduleContent;
}

/**
 * Process all FragMap files
 */
function processAllFragMaps() {
  console.log('🎯 Processing all FragMap files...\n');
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Find all FragMap files
  const fragMapFiles = fs.readdirSync(FRAGMAP_DIR)
    .filter(f => f.endsWith('.map'))
    .map(f => ({
      file: f,
      path: path.join(FRAGMAP_DIR, f),
      type: extractFragMapType(f)
    }));
  
  console.log(`📁 Found ${fragMapFiles.length} FragMap files:\n`);
  
  for (const { file, path, type } of fragMapFiles) {
    console.log(`🔄 Processing: ${file} (${type})`);
    
    try {
      // Parse grid data
      const { gridInfo, gridData } = parseFragMapGrid(path);
      
      // Convert to spheres with enhanced accuracy (reduce density for large datasets)
      const isLargeDataset = gridInfo.nx * gridInfo.ny * gridInfo.nz > 200000;
      const interpolationFactor = isLargeDataset ? 1.5 : 2; // Adaptive density
      
      const spheres = gridToSpheres(gridInfo, gridData, -0.5, {
        enableInterpolation: true,
        interpolationFactor: interpolationFactor,  // Adaptive density increase
        enableVariableSizing: true,
        enableGradientWeighting: true
      });
      
      // Generate JavaScript module
      const moduleContent = generateSphereModule(spheres, type);
      
      // Save to output directory
      const outputPath = `${OUTPUT_DIR}/${type}.js`;
      fs.writeFileSync(outputPath, moduleContent);
      
      console.log(`✅ Saved: ${type}.js (${spheres.length} spheres)\n`);
      
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message, '\n');
    }
  }
  
  console.log('🎉 FragMap conversion complete!');
}

/**
 * Extract FragMap type from filename
 */
function extractFragMapType(filename) {
  // Extract type from filename like "3fly.acec.gfe.map" -> "acec"
  const parts = filename.split('.');
  if (parts.length >= 3) {
    return parts[1]; // acec, arcc, etc.
  }
  return 'unknown';
}

/**
 * Generate index file for all converted FragMaps
 */
function generateIndexFile() {
  console.log('📝 Generating index file...');
  
  const convertedFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.js') && f !== 'index.js')
    .map(f => f.replace('.js', ''));
  
  const indexContent = `/**
 * Auto-generated index for converted FragMap data
 * Generated by fragMapGridConverter.js
 */

${convertedFiles.map(type => 
  `import { spheres as ${type}Spheres, metadata as ${type}Metadata } from './${type}.js';`
).join('\n')}

export const fragMaps = {
${convertedFiles.map(type => 
  `  '${type}': {
    spheres: ${type}Spheres,
    metadata: ${type}Metadata
  }`
).join(',\n')}
};

export default fragMaps;
`;
  
  fs.writeFileSync(`${OUTPUT_DIR}/index.js`, indexContent);
  console.log(`✅ Generated index.js with ${convertedFiles.length} FragMap types`);
}

// Run the conversion
processAllFragMaps();
generateIndexFile();
