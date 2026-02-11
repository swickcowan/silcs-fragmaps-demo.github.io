#!/usr/bin/env node

/**
 * FragMap Build Script
 * Pre-processes all FragMap files and generates optimized JavaScript data
 * Eliminates runtime parsing for maximum performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRAGMAPS_DIR = path.join(__dirname, '../public/assets/fragmaps');
const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'fragMapData.js');

// FragMap types configuration
const fragMapTypes = [
  { id: 'hydrophobic', fileName: '3fly.apolar.gfe.map' },
  { id: 'hbond-donor', fileName: '3fly.hbdon.gfe.map' },
  { id: 'hbond-acceptor', fileName: '3fly.hbacc.gfe.map' },
  { id: 'positive', fileName: '3fly.mamn.gfe.map' },
  { id: 'negative', fileName: '3fly.meoo.gfe.map' },
  { id: 'aromatic', fileName: '3fly.acec.gfe.map' }
];

/**
 * Parse FragMap file content
 * @param {string} content - Raw file content
 * @returns {Object} Parsed grid data
 */
function parseFragMapFile(content) {
  const lines = content.split('\n');
  const headerInfo = {};
  let dataStartIndex = 0;
  
  // Parse header
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('SPACING')) {
      headerInfo.grid_spacing = parseFloat(line.split(/\s+/)[1]);
    } else if (line.startsWith('NELEMENTS')) {
      const parts = line.split(/\s+/);
      headerInfo.nx = parseInt(parts[1]);
      headerInfo.ny = parseInt(parts[2]);
      headerInfo.nz = parseInt(parts[3]);
    } else if (line.startsWith('CENTER')) {
      const parts = line.split(/\s+/);
      headerInfo.origin_x = parseFloat(parts[1]);
      headerInfo.origin_y = parseFloat(parts[2]);
      headerInfo.origin_z = parseFloat(parts[3]);
    } else if (line.match(/^-?\d+\.?\d*$/)) {
      // First data line found
      dataStartIndex = i;
      break;
    }
  }
  
  // Parse grid data
  const gridData = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) {
      const values = line.split(/\s+/).map(parseFloat);
      gridData.push(...values);
    }
  }
  
  // Ensure we have the correct number of grid points
  const expectedPoints = headerInfo.nx * headerInfo.ny * headerInfo.nz;
  if (gridData.length > expectedPoints) {
    // Truncate excess data
    gridData.length = expectedPoints;
  } else if (gridData.length < expectedPoints) {
    // Pad with zeros if needed
    const padding = new Array(expectedPoints - gridData.length).fill(0);
    gridData.push(...padding);
  }
  
  return {
    gridInfo: headerInfo,
    gridData: new Float32Array(gridData)
  };
}

/**
 * Generate spheres from grid data
 * @param {Float32Array} gridData - Grid energy values
 * @param {Object} gridInfo - Grid information
 * @param {number} isovalue - Energy threshold
 * @returns {Array} Array of sphere objects
 */
function generateSpheresFromGrid(gridData, gridInfo, isovalue) {
  const spheres = [];
  const { nx, ny, nz, grid_spacing, origin_x, origin_y, origin_z } = gridInfo;
  
  for (let i = 0; i < gridData.length; i++) {
    const energy = gridData[i];
    if (energy <= isovalue) {
      // Convert 1D index to 3D coordinates
      const z = Math.floor(i / (nx * ny));
      const y = Math.floor((i % (nx * ny)) / nx);
      const x = i % nx;
      
      // Convert grid coordinates to real coordinates
      const realX = origin_x + x * grid_spacing;
      const realY = origin_y + y * grid_spacing;
      const realZ = origin_z + z * grid_spacing;
      
      spheres.push({
        x: realX,
        y: realY,
        z: realZ,
        energy: energy,
        gridIndex: i
      });
    }
  }
  
  return spheres;
}

/**
 * Build all FragMap data
 */
async function buildFragMaps() {
  console.log('🚀 Starting FragMap build process...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const allFragMapData = {};
  const isovalues = [-2.0, -1.5, -1.0, -0.5, 0.0, 0.5];
  
  for (const fragMapType of fragMapTypes) {
    console.log(`📁 Processing ${fragMapType.fileName}...`);
    
    try {
      // Read file
      const filePath = path.join(FRAGMAPS_DIR, fragMapType.fileName);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log(`📊 Loaded ${fileContent.length} characters`);
      
      // Parse file
      const parsedData = parseFragMapFile(fileContent);
      console.log(`✅ Parsed: ${parsedData.gridData.length} grid points`);
      
      // Generate spheres for each isovalue
      const sphereCache = {};
      for (const isovalue of isovalues) {
        const spheres = generateSpheresFromGrid(parsedData.gridData, parsedData.gridInfo, isovalue);
        sphereCache[isovalue] = spheres;
        console.log(`🎯 ${fragMapType.id} @ ${isovalue}: ${spheres.length} spheres`);
      }
      
      // Store data
      allFragMapData[fragMapType.id] = {
        id: fragMapType.id,
        fileName: fragMapType.fileName,
        gridInfo: parsedData.gridInfo,
        spheres: sphereCache,
        stats: {
          totalGridPoints: parsedData.gridData.length,
          minEnergy: Math.min(...parsedData.gridData),
          maxEnergy: Math.max(...parsedData.gridData),
          isovalues: isovalues.map(iso => ({
            value: iso,
            sphereCount: sphereCache[iso].length
          }))
        }
      };
      
      console.log(`✅ Completed ${fragMapType.id}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${fragMapType.fileName}:`, error);
      process.exit(1);
    }
  }
  
  // Generate JavaScript output file
  console.log('📝 Generating JavaScript output...');
  
  // Create a more efficient format that doesn't use JSON.stringify for large arrays
  const outputContent = `/**
 * Pre-computed FragMap Data
 * Generated by buildFragMaps.js on ${new Date().toISOString()}
 * All FragMap files are pre-parsed and optimized for instant loading
 */

// Grid information
export const gridInfo = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(allFragMapData).map(([id, data]) => [id, data.gridInfo])
  ), null, 2
)};

// Statistics
export const stats = ${JSON.stringify(
  Object.fromEntries(
    Object.entries(allFragMapData).map(([id, data]) => [id, data.stats])
  ), null, 2
)};

// Pre-computed spheres (stored as Float32Array for efficiency)
export const sphereData = {
${Object.entries(allFragMapData).map(([id, data]) => {
  return `  ${id}: {
    gridData: new Float32Array([${Array.from(data.gridData).join(', ')}]),
    spheres: {${Object.entries(data.spheres).map(([isovalue, spheres]) => {
      return `      ${isovalue}: new Float32Array([${spheres.flatMap(s => [s.x, s.y, s.z, s.energy]).join(', ')}])`;
    }).join(',\n')}
    }
  }`;
}).join(',\n')}
};

/**
 * Get pre-computed spheres for a FragMap at specific isovalue
 * @param {string} fragMapId - FragMap ID
 * @param {number} isovalue - Isovalue threshold
 * @returns {Array} Pre-computed spheres or null if not available
 */
export const getPrecomputedSpheres = (fragMapId, isovalue) => {
  const fragMap = sphereData[fragMapId];
  if (!fragMap) return null;
  
  // Find closest pre-computed isovalue
  const isovalues = Object.keys(fragMap.spheres).map(Number).sort((a, b) => a - b);
  const closestIsovalue = isovalues.reduce((prev, curr) => 
    Math.abs(curr - isovalue) < Math.abs(prev - isovalue) ? curr : prev
  );
  
  const data = fragMap.spheres[closestIsovalue];
  if (!data) return null;
  
  // Convert Float32Array back to sphere objects
  const spheres = [];
  for (let i = 0; i < data.length; i += 4) {
    spheres.push({
      x: data[i],
      y: data[i + 1],
      z: data[i + 2],
      energy: data[i + 3]
    });
  }
  
  return spheres;
};

/**
 * Get FragMap grid information
 * @param {string} fragMapId - FragMap ID
 * @returns {Object} Grid information or null if not available
 */
export const getFragMapInfo = (fragMapId) => {
  return gridInfo[fragMapId] || null;
};

/**
 * Check if FragMap data is available
 * @param {string} fragMapId - FragMap ID
 * @returns {boolean} True if data is available
 */
export const isFragMapAvailable = (fragMapId) => {
  return !!sphereData[fragMapId];
};

/**
 * Get all available FragMap IDs
 * @returns {Array} Array of FragMap IDs
 */
export const getAvailableFragMapIds = () => {
  return Object.keys(sphereData);
};

/**
 * Get FragMap statistics
 * @param {string} fragMapId - FragMap ID
 * @returns {Object} Statistics or null if not available
 */
export const getFragMapStats = (fragMapId) => {
  return stats[fragMapId] || null;
};

// Export all data for direct access
export default { gridInfo, stats, sphereData };
`;
  
  // Write output file
  fs.writeFileSync(OUTPUT_FILE, outputContent);
  console.log(`✅ Generated ${OUTPUT_FILE}`);
  
  // Print summary
  console.log('\n🎉 Build Summary:');
  console.log('='.repeat(50));
  for (const [id, data] of Object.entries(allFragMapData)) {
    console.log(`📊 ${id}:`);
    console.log(`   Grid points: ${data.stats.totalGridPoints.toLocaleString()}`);
    console.log(`   Energy range: ${data.stats.minEnergy.toFixed(3)} to ${data.stats.maxEnergy.toFixed(3)}`);
    console.log(`   Isovalues: ${data.stats.isovalues.length} presets`);
    const totalSpheres = data.stats.isovalues.reduce((sum, iso) => sum + iso.sphereCount, 0);
    console.log(`   Total spheres: ${totalSpheres.toLocaleString()}`);
    console.log('');
  }
  
  console.log(`✅ Build completed successfully!`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`🚀 Ready for instant FragMap loading!`);
}

// Run the build
buildFragMaps().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
