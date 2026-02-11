#!/usr/bin/env node

/**
 * SILCS FragMap to DX Converter
 * Converts SILCS .map files to OpenDX format for Mol* compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parses SILCS .map file format
 * @param {string} content - File content
 * @returns {Object} Parsed data with grid info and values
 */
const parseMapFile = (content) => {
  const lines = content.split('\n');
  const gridInfo = {};
  let gridData = [];
  let headerSection = true;
  let expectedDataCount = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') continue;
    
    // Parse header information
    if (headerSection) {
      const match = trimmed.match(/(\w+)\s+(.+)/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Convert numeric values
        if (!isNaN(value) && value !== '') {
          value = parseFloat(value);
        }
        
        // Handle NELEMENTS as dimensions - calculate expected data count
        if (key === 'NELEMENTS') {
          const elements = value.split(/\s+/).map(v => parseInt(v.trim()));
          if (elements.length === 3) {
            gridInfo.nx = elements[0];
            gridInfo.ny = elements[1];
            gridInfo.nz = elements[2];
            expectedDataCount = elements[0] * elements[1] * elements[2];
            console.log(`📊 Expected data count from NELEMENTS: ${expectedDataCount}`);
          }
        } 
        // Handle CENTER as coordinates - convert from center to corner for Mol*
        else if (key === 'CENTER') {
          if (typeof value === 'string' && value.includes(' ')) {
            const coords = value.split(/\s+/).map(v => parseFloat(v.trim()));
            if (coords.length === 3) {
              // Store center coordinates temporarily
              gridInfo.center_x = coords[0];
              gridInfo.center_y = coords[1];
              gridInfo.center_z = coords[2];
            }
          }
        } 
        // Handle SPACING
        else if (key === 'SPACING') {
          gridInfo.grid_spacing = value;
        }
        // Store other header values
        else {
          gridInfo[key] = value;
        }
      }
      // When we hit a line that starts with a number, header section ends
      else if (/^\s*[\d\.\-]/.test(trimmed)) {
        headerSection = false;
        // Fall through to grid data parsing
      }
    }
    
    // Parse grid data section - but ONLY read expectedDataCount values
    if (!headerSection && expectedDataCount !== null) {
      // Each line contains exactly one value, not multiple values
      if (/^\s*[-]?[0-9]/.test(trimmed)) {
        const value = parseFloat(trimmed);
        if (!isNaN(value)) {
          gridData.push(value);
          
          // Stop reading once we have all expected values
          if (gridData.length >= expectedDataCount) {
            console.log(`✅ Stopped reading at ${gridData.length} values (expected: ${expectedDataCount})`);
            break;
          }
        }
      }
    }
  }
  
  console.log(`📈 Final data count: ${gridData.length}`);
  return { gridInfo, gridData };
};

/**
 * Converts parsed map data to OpenDX format
 * @param {Object} mapData - Parsed map data
 * @param {string} fragMapId - FragMap identifier
 * @returns {string} DX format content
 */
const convertToDx = (mapData, fragMapId) => {
  const { gridInfo, gridData } = mapData;
  
  // Use the actual parsed data count - this MUST match the grid dimensions
  const actualDataCount = gridData.length;
  
  // Use dimensions from header (these should match data count)
  const nx = gridInfo.nx || 84;
  const ny = gridInfo.ny || 64;
  const nz = gridInfo.nz || 58;
  const expectedCount = nx * ny * nz;
  
  // Verify the counts match
  if (actualDataCount !== expectedCount) {
    console.error(`❌ CRITICAL: Data count mismatch!`);
    console.error(`   Actual data values: ${actualDataCount}`);
    console.error(`   Expected from grid: ${expectedCount} (${nx}×${ny}×${nz})`);
    throw new Error(`Data count ${actualDataCount} does not match grid dimensions ${nx}×${ny}×${nz} = ${expectedCount}`);
  }
  
  const spacing = gridInfo.grid_spacing || 0.8;
  
  // Calculate corner origin from center coordinates for Mol*
  // Corner = Center - (Dimensions * Spacing) / 2
  const centerX = gridInfo.center_x || 0;
  const centerY = gridInfo.center_y || 0;
  const centerZ = gridInfo.center_z || 0;
  
  const originX = centerX - (nx * spacing) / 2;
  const originY = centerY - (ny * spacing) / 2;
  const originZ = centerZ - (nz * spacing) / 2;
  
  let dxContent = '';
  
  // DX header
  dxContent += `# SILCS FragMap converted to OpenDX format\n`;
  dxContent += `# FragMap: ${fragMapId}\n`;
  dxContent += `# Generated: ${new Date().toISOString()}\n`;
  dxContent += `# Data points: ${actualDataCount}, Grid: ${nx}×${ny}×${nz} = ${expectedCount}\n\n`;
  
  // Grid object definition
  dxContent += `object 1 class gridpositions counts ${nx} ${ny} ${nz}\n`;
  
  // Origin (corner coordinates)
  dxContent += `origin ${originX.toFixed(6)} ${originY.toFixed(6)} ${originZ.toFixed(6)}\n`;
  
  // Delta (spacing) - uniform spacing in all directions
  dxContent += `delta ${spacing.toFixed(6)} 0 0\n`;
  dxContent += `delta 0 ${spacing.toFixed(6)} 0\n`;
  dxContent += `delta 0 0 ${spacing.toFixed(6)}\n`;
  
  // Grid connections object
  dxContent += `\nobject 2 class gridconnections counts ${nx} ${ny} ${nz}\n`;
  
  // Data array with DYNAMIC item count from actual data
  dxContent += `\nobject 3 class array type float rank 0 items ${actualDataCount} data follows\n`;
  
  // Write data values (6 per line for readability)
  for (let i = 0; i < gridData.length; i++) {
    if (i > 0 && i % 6 === 0) dxContent += '\n';
    dxContent += gridData[i].toFixed(6) + ' ';
  }
  dxContent += '\n';
  
  // Field object that combines positions, connections, and data
  dxContent += `\nobject "fragmap_${fragMapId}" class field\n`;
  dxContent += `component "positions" value 1\n`;
  dxContent += `component "connections" value 2\n`;
  dxContent += `component "data" value 3\n`;
  dxContent += `%\n`;
  
  return dxContent;
};

/**
 * Main conversion function
 */
const convertFragMaps = async () => {
  const fragMapsDir = path.join(__dirname, '..', 'public', 'assets', 'fragmaps');
  const outputDir = path.join(__dirname, '..', 'public', 'assets', 'fragmaps-dx');
  
  console.log('🔄 SILCS FragMap to DX Converter');
  console.log(`📂 Source directory: ${fragMapsDir}`);
  console.log(`📁 Output directory: ${outputDir}`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}`);
  }
  
  try {
    // Get all .map files
    const mapFiles = fs.readdirSync(fragMapsDir).filter(file => file.endsWith('.map'));
    console.log(`📋 Found ${mapFiles.length} .map files to convert`);
    
    for (const mapFile of mapFiles) {
      console.log(`\n🔄 Converting: ${mapFile}`);
      
      const mapPath = path.join(fragMapsDir, mapFile);
      const content = fs.readFileSync(mapPath, 'utf8');
      
      // Parse the map file
      const mapData = parseMapFile(content);
      console.log(`  📊 Grid: ${mapData.gridInfo.nx}x${mapData.gridInfo.ny}x${mapData.gridInfo.nz}`);
      console.log(`  📏 Spacing: ${mapData.gridInfo.grid_spacing}`);
      console.log(`  📍 Center: (${mapData.gridInfo.center_x}, ${mapData.gridInfo.center_y}, ${mapData.gridInfo.center_z})`);
      console.log(`  📈 Data points: ${mapData.gridData.length}`);
      
      // Extract FragMap ID from filename
      const fragMapId = path.basename(mapFile, '.map');
      
      // Convert to DX format
      const dxContent = convertToDx(mapData, fragMapId);
      
      // Write DX file
      const dxFile = mapFile.replace('.map', '.dx');
      const dxPath = path.join(outputDir, dxFile);
      fs.writeFileSync(dxPath, dxContent);
      
      console.log(`  ✅ Converted to: ${dxFile}`);
      console.log(`  📄 Output size: ${(dxContent.length / 1024).toFixed(1)} KB`);
    }
    
    console.log(`\n🎉 Conversion complete!`);
    console.log(`📁 All DX files saved to: ${outputDir}`);
    console.log(`\n📋 Next steps:`);
    console.log(`1. Update fragMapTypes.js to use .dx files`);
    console.log(`2. Update fragMapLoader.js to prefer .dx format`);
    console.log(`3. Test with Mol* viewer`);
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
};

// Run the conversion
convertFragMaps();
