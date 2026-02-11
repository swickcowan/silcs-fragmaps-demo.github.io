#!/usr/bin/env node

/**
 * Minimal FragMap Build Script
 * Processes one FragMap at a time to avoid memory issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRAGMAPS_DIR = path.join(__dirname, '../public/assets/fragmaps');
const OUTPUT_DIR = path.join(__dirname, '../src/data');

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
  
  // Ensure correct number of grid points
  const expectedPoints = headerInfo.nx * headerInfo.ny * headerInfo.nz;
  if (gridData.length > expectedPoints) {
    gridData.length = expectedPoints;
  } else if (gridData.length < expectedPoints) {
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
 */
function generateSpheresFromGrid(gridData, gridInfo, isovalue) {
  const spheres = [];
  const { nx, ny, nz, grid_spacing, origin_x, origin_y, origin_z } = gridInfo;
  
  for (let i = 0; i < gridData.length; i++) {
    const energy = gridData[i];
    if (energy <= isovalue) {
      const z = Math.floor(i / (nx * ny));
      const y = Math.floor((i % (nx * ny)) / nx);
      const x = i % nx;
      
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
 * Build a single FragMap
 */
async function buildSingleFragMap(fragMapType) {
  console.log(`📁 Processing ${fragMapType.fileName}...`);
  
  try {
    // Read and parse file
    const filePath = path.join(FRAGMAPS_DIR, fragMapType.fileName);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsedData = parseFragMapFile(fileContent);
    
    console.log(`📊 Parsed: ${parsedData.gridData.length} grid points`);
    
    // Generate spheres for key isovalues
    const isovalues = [-0.5]; // Focus on the most useful isovalue
    const sphereData = {};
    
    for (const isovalue of isovalues) {
      const spheres = generateSpheresFromGrid(parsedData.gridData, parsedData.gridInfo, isovalue);
      
      // Create binary data file
      const sphereArray = new Float32Array(spheres.length * 4);
      for (let i = 0; i < spheres.length; i++) {
        sphereArray[i * 4] = spheres[i].x;
        sphereArray[i * 4 + 1] = spheres[i].y;
        sphereArray[i * 4 + 2] = spheres[i].z;
        sphereArray[i * 4 + 3] = spheres[i].energy;
      }
      
      const sphereFileName = `${fragMapType.id}.bin`;
      const sphereFilePath = path.join(OUTPUT_DIR, sphereFileName);
      fs.writeFileSync(sphereFilePath, Buffer.from(sphereArray.buffer));
      
      sphereData[isovalue] = {
        fileName: sphereFileName,
        count: spheres.length,
        spheres: spheres // Keep the actual spheres for now
      };
      
      console.log(`🎯 ${fragMapType.id} @ ${isovalue}: ${spheres.length} spheres → ${sphereFileName}`);
    }
    
    // Create simple JavaScript file with inline data
    const jsContent = `/**
 * ${fragMapType.id} FragMap Data
 * Generated on ${new Date().toISOString()}
 */

export const id = '${fragMapType.id}';
export const fileName = '${fragMapType.fileName}';

export const gridInfo = {
  grid_spacing: ${parsedData.gridInfo.grid_spacing},
  nx: ${parsedData.gridInfo.nx},
  ny: ${parsedData.gridInfo.ny},
  nz: ${parsedData.gridInfo.nz},
  origin_x: ${parsedData.gridInfo.origin_x},
  origin_y: ${parsedData.gridInfo.origin_y},
  origin_z: ${parsedData.gridInfo.origin_z}
};

// Pre-computed spheres for isovalue -0.5
export const spheres = [
${sphereData[-0.5].spheres.map(s => `  {x: ${s.x}, y: ${s.y}, z: ${s.z}, energy: ${s.energy}}`).join(',\n')}
];

export const sphereCount = ${sphereData[-0.5].count};
export const isovalue = -0.5;
`;
    
    const jsFilePath = path.join(OUTPUT_DIR, `${fragMapType.id}.js`);
    fs.writeFileSync(jsFilePath, jsContent);
    
    console.log(`✅ Completed ${fragMapType.id}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${fragMapType.fileName}:`, error);
    return false;
  }
}

/**
 * Build all FragMaps one at a time
 */
async function buildAllFragMaps() {
  console.log('🚀 Starting minimal FragMap build process...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const results = [];
  
  for (const fragMapType of fragMapTypes) {
    const success = await buildSingleFragMap(fragMapType);
    results.push({ id: fragMapType.id, success });
    
    // Add a small delay to prevent memory issues
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Create index file
  const indexContent = `/**
 * FragMap Data Index
 * Generated on ${new Date().toISOString()}
 */

${fragMapTypes.map(type => `import { spheres as ${type.id}Spheres, gridInfo as ${type.id}GridInfo, sphereCount as ${type.id}Count } from './${type.id}.js';`).join('\n')}

export const fragMaps = {
${fragMapTypes.map(type => `  ${type.id}: { spheres: ${type.id}Spheres, gridInfo: ${type.id}GridInfo, count: ${type.id}Count }`).join(',\n')}
};

export const fragMapIds = [${fragMapTypes.map(type => `'${type.id}'`).join(', ')}];

export function getPrecomputedSpheres(fragMapId, isovalue = -0.5) {
  const fragMap = fragMaps[fragMapId];
  if (!fragMap) return null;
  return fragMap.spheres;
}

export function getFragMapInfo(fragMapId) {
  const fragMap = fragMaps[fragMapId];
  if (!fragMap) return null;
  return fragMap.gridInfo;
}

export function isFragMapAvailable(fragMapId) {
  return !!fragMaps[fragMapId];
}

export default fragMaps;
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), indexContent);
  
  // Print summary
  console.log('\n🎉 Build Summary:');
  console.log('='.repeat(50));
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.id}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Successfully built ${successCount}/${fragMapTypes.length} FragMaps`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`🚀 Ready for instant FragMap loading!`);
}

// Run the build
buildAllFragMaps().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
