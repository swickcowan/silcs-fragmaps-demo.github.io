#!/usr/bin/env node

import fs from 'fs';

const content = fs.readFileSync('/Users/henrycowan/Silcs Bio Interactive Replica/public/assets/fragmaps/3fly.acec.gfe.map', 'utf8');
const lines = content.split('\n');

let headerSection = true;
let expectedDataCount = null;
let actualDataCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.startsWith('#') || line === '') continue;
  
  if (headerSection) {
    if (line.startsWith('NELEMENTS')) {
      const parts = line.split(/\s+/);
      const nx = parseInt(parts[1]);
      const ny = parseInt(parts[2]); 
      const nz = parseInt(parts[3]);
      expectedDataCount = nx * ny * nz;
      console.log(`Line ${i+1}: NELEMENTS ${nx} ${ny} ${nz} = ${expectedDataCount}`);
    } else if (/^\s*[-]?[0-9]/.test(line)) {
      headerSection = false;
      console.log(`Line ${i+1}: Data starts with: ${line}`);
      // Fall through to count this data value
      actualDataCount++;
    }
  } else {
    if (/^\s*[-]?[0-9]/.test(line)) {
      actualDataCount++;
      if (actualDataCount >= expectedDataCount) {
        console.log(`Line ${i+1}: Reached ${actualDataCount} values, stopping`);
        break;
      }
    }
  }
}

console.log(`\nFinal count: ${actualDataCount} (expected: ${expectedDataCount})`);
console.log(`Match: ${actualDataCount === expectedDataCount ? 'YES' : 'NO'}`);
