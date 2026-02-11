#!/usr/bin/env node

/**
 * Simple FragMap Build Script
 * Generates optimized JavaScript files for each FragMap type
 * Avoids large array concatenation issues
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
 * Build individual FragMap files
 */
async function buildFragMaps() {
  console.log('🚀 Starting simple FragMap build process...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const isovalues = [-2.0, -1.5, -1.0, -0.5, 0.0, 0.5];
  const summary = {};
  
  for (const fragMapType of fragMapTypes) {
    console.log(`📁 Processing ${fragMapType.fileName}...`);
    
    try {
      // Read and parse file
      const filePath = path.join(FRAGMAPS_DIR, fragMapType.fileName);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedData = parseFragMapFile(fileContent);
      
      console.log(`📊 Parsed: ${parsedData.gridData.length} grid points`);
      
      // Generate individual sphere files for each isovalue
      const sphereFiles = {};
      const stats = [];
      
      for (const isovalue of isovalues) {
        const spheres = generateSpheresFromGrid(parsedData.gridData, parsedData.gridInfo, isovalue);
        stats.push({ isovalue, count: spheres.length });
        
        // Create binary data file
        const sphereData = new Float32Array(spheres.length * 4);
        for (let i = 0; i < spheres.length; i++) {
          sphereData[i * 4] = spheres[i].x;
          sphereData[i * 4 + 1] = spheres[i].y;
          sphereData[i * 4 + 2] = spheres[i].z;
          sphereData[i * 4 + 3] = spheres[i].energy;
        }
        
        const sphereFileName = `${fragMapType.id}_${isovalue}.bin`;
        const sphereFilePath = path.join(OUTPUT_DIR, sphereFileName);
        fs.writeFileSync(sphereFilePath, Buffer.from(sphereData.buffer));
        
        sphereFiles[isovalue] = sphereFileName;
        console.log(`🎯 ${fragMapType.id} @ ${isovalue}: ${spheres.length} spheres → ${sphereFileName}`);
      }
      
      // Create JavaScript metadata file
      const metadataContent = `/**
 * ${fragMapType.id} FragMap Metadata
 * Generated on ${new Date().toISOString()}
 */

export const gridInfo = ${JSON.stringify(parsedData.gridInfo, null, 2)};

export const sphereFiles = ${JSON.stringify(sphereFiles, null, 2)};

export const stats = ${JSON.stringify(stats, null, 2)};

export const id = '${fragMapType.id}';

export const fileName = '${fragMapType.fileName}';
`;
      
      const metadataFilePath = path.join(OUTPUT_DIR, `${fragMapType.id}.js`);
      fs.writeFileSync(metadataFilePath, metadataContent);
      
      summary[fragMapType.id] = {
        gridPoints: parsedData.gridData.length,
        energyRange: {
          min: Math.min(...parsedData.gridData),
          max: Math.max(...parsedData.gridData)
        },
        sphereFiles: sphereFiles,
        stats: stats
      };
      
      console.log(`✅ Completed ${fragMapType.id}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${fragMapType.fileName}:`, error);
      process.exit(1);
    }
  }
  
  // Create main index file
  const indexContent = `/**
 * FragMap Data Index
 * Generated on ${new Date().toISOString()}
 */

${fragMapTypes.map(type => `import * as ${type.id} from './${type.id}.js';`).join('\n')}

export const fragMaps = {
${fragMapTypes.map(type => `  ${type.id}: ${type.id}`).join(',\n')}
};

export const fragMapIds = [${fragMapTypes.map(type => `'${type.id}'`).join(', ')}];

/**
 * Load spheres for a specific FragMap and isovalue
 */
export async function loadSpheres(fragMapId, isovalue) {
  const fragMap = fragMaps[fragMapId];
  if (!fragMap) return null;
  
  const sphereFileName = fragMap.sphereFiles[isovalue];
  if (!sphereFileName) return null;
  
  try {
    const response = await fetch(\`/src/data/\${sphereFileName}\`);
    const buffer = await response.arrayBuffer();
    const sphereData = new Float32Array(buffer);
    
    // Convert back to sphere objects
    const spheres = [];
    for (let i = 0; i < sphereData.length; i += 4) {
      spheres.push({
        x: sphereData[i],
        y: sphereData[i + 1],
        z: sphereData[i + 2],
        energy: sphereData[i + 3]
      });
    }
    
    return spheres;
  } catch (error) {
    console.error(\`Error loading spheres for \${fragMapId} @ \${isovalue}:\`, error);
    return null;
  }
}

export default fragMaps;
`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), indexContent);
  
  // Print summary
  console.log('\n🎉 Build Summary:');
  console.log('='.repeat(50));
  for (const [id, data] of Object.entries(summary)) {
    console.log(`📊 ${id}:`);
    console.log(`   Grid points: ${data.gridPoints.toLocaleString()}`);
    console.log(`   Energy range: ${data.energyRange.min.toFixed(3)} to ${data.energyRange.max.toFixed(3)}`);
    console.log(`   Isovalues: ${data.stats.length} presets`);
    const totalSpheres = data.stats.reduce((sum, stat) => sum + stat.count, 0);
    console.log(`   Total spheres: ${totalSpheres.toLocaleString()}`);
    console.log('');
  }
  
  console.log(`✅ Build completed successfully!`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`🚀 Ready for instant FragMap loading!`);
}

// Run the build
buildFragMaps().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
