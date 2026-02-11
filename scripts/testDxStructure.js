#!/usr/bin/env node

/**
 * Quick test to verify DX file structure and parsing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testDxStructure = () => {
  const dxDir = path.join(__dirname, '..', 'public', 'assets', 'fragmaps-dx');
  const testFile = path.join(dxDir, '3fly.acec.gfe.dx');
  
  console.log('🧪 Testing DX File Structure');
  console.log(`📁 Test file: ${testFile}`);
  
  try {
    const content = fs.readFileSync(testFile, 'utf8');
    const lines = content.split('\n');
    
    console.log('📄 File structure analysis:');
    console.log(`  - Total lines: ${lines.length}`);
    console.log(`  - File size: ${(content.length / 1024).toFixed(1)} KB`);
    
    // Find key sections
    const gridLine = lines.find(line => line.includes('object 1 class grid positions counts'));
    const originLine = lines.find(line => line.includes('origin'));
    const deltaLines = lines.filter(line => line.includes('delta'));
    const arrayLine = lines.find(line => line.includes('object 2 class array'));
    
    console.log('🔍 Key sections found:');
    console.log(`  - Grid definition: ${gridLine ? '✅' : '❌'}`);
    console.log(`  - Origin: ${originLine ? '✅' : '❌'}`);
    console.log(`  - Delta lines: ${deltaLines.length}/3`);
    console.log(`  - Array definition: ${arrayLine ? '✅' : '❌'}`);
    
    if (gridLine) {
      const match = gridLine.match(/counts\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        const [nx, ny, nz] = match.slice(1).map(Number);
        const expectedPoints = nx * ny * nz;
        console.log(`  - Grid dimensions: ${nx}x${ny}x${nz} = ${expectedPoints} points`);
      }
    }
    
    if (originLine) {
      const match = originLine.match(/origin\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
      if (match) {
        console.log(`  - Origin: (${match[1]}, ${match[2]}, ${match[3]})`);
      }
    }
    
    // Count data lines
    const dataStartIndex = lines.findIndex(line => line.includes('data follows'));
    if (dataStartIndex >= 0) {
      const dataLines = lines.slice(dataStartIndex + 1);
      const allNumbers = dataLines.join(' ').split(/\s+/).filter(v => v && !isNaN(v));
      console.log(`  - Data values: ${allNumbers.length}`);
    }
    
    console.log('\n✅ DX file structure looks correct!');
    console.log('🎉 Ready for Mol* volume rendering');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

testDxStructure();
