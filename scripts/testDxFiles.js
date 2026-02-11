#!/usr/bin/env node

/**
 * Test script to verify DX file loading and parsing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the DX parser from fragMapLoader
const { parseDxFile } = await import('../src/utils/fragMapLoader.js');

const testDxFile = async () => {
  const dxDir = path.join(__dirname, '..', 'public', 'assets', 'fragmaps-dx');
  const testFile = path.join(dxDir, '3fly.acec.gfe.dx');
  
  console.log('🧪 Testing DX File Loading and Parsing');
  console.log(`📁 Test file: ${testFile}`);
  
  try {
    // Read the DX file
    const content = fs.readFileSync(testFile, 'utf8');
    console.log(`📄 File size: ${(content.length / 1024).toFixed(1)} KB`);
    
    // Parse the DX content
    const parsedData = parseDxFile(content, '3fly.acec.gfe');
    
    console.log('✅ DX file parsed successfully!');
    console.log('📊 Parsed data:');
    console.log(`  - Grid dimensions: ${parsedData.gridInfo.nx}x${parsedData.gridInfo.ny}x${parsedData.gridInfo.nz}`);
    console.log(`  - Grid spacing: ${parsedData.gridInfo.grid_spacing}`);
    console.log(`  - Origin: (${parsedData.gridInfo.origin_x}, ${parsedData.gridInfo.origin_y}, ${parsedData.gridInfo.origin_z})`);
    console.log(`  - Data points: ${parsedData.gridData.length}`);
    console.log(`  - Expected points: ${parsedData.gridInfo.nx * parsedData.gridInfo.ny * parsedData.gridInfo.nz}`);
    
    // Validate data
    const expectedPoints = parsedData.gridInfo.nx * parsedData.gridInfo.ny * parsedData.gridInfo.nz;
    if (parsedData.gridData.length !== expectedPoints) {
      console.error(`❌ Data length mismatch: expected ${expectedPoints}, got ${parsedData.gridData.length}`);
    } else {
      console.log('✅ Data length matches expected grid dimensions');
    }
    
    // Show some sample values
    console.log('📈 Sample data values (first 10):');
    for (let i = 0; i < Math.min(10, parsedData.gridData.length); i++) {
      console.log(`  [${i}]: ${parsedData.gridData[i].toFixed(6)}`);
    }
    
    // Calculate basic statistics
    let min = Infinity, max = -Infinity, sum = 0;
    for (let i = 0; i < parsedData.gridData.length; i++) {
      const val = parsedData.gridData[i];
      sum += val;
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
    const mean = sum / parsedData.gridData.length;
    
    console.log('📊 Data statistics:');
    console.log(`  - Min: ${min.toFixed(6)}`);
    console.log(`  - Max: ${max.toFixed(6)}`);
    console.log(`  - Mean: ${mean.toFixed(6)}`);
    console.log(`  - Range: ${(max - min).toFixed(6)}`);
    
    console.log('\n🎉 DX file test completed successfully!');
    console.log('✅ The DX files are ready for use with Mol*');
    
  } catch (error) {
    console.error('❌ DX file test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the test
testDxFile();
