#!/usr/bin/env node

/**
 * Pre-process FragMap DX files to binary format for faster loading
 * Converts DX files to compact binary JSON format
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const fragMapsDir = path.join(projectRoot, 'public', 'assets', 'fragmaps-dx');
const outputDir = path.join(projectRoot, 'public', 'assets', 'fragmaps-binary');

/**
 * Parses a DX file and converts to binary format
 */
const parseDxFile = (content) => {
  const lines = content.split('\n');
  const gridInfo = {};
  let gridData = [];
  let readingData = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#') || trimmed === '') continue;
    
    // Parse grid information
    if (trimmed.includes('object 1 class grid')) {
      const match = trimmed.match(/counts\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        gridInfo.nx = parseInt(match[1]);
        gridInfo.ny = parseInt(match[2]);
        gridInfo.nz = parseInt(match[3]);
      }
      continue;
    }
    
    // Parse origin
    if (trimmed.includes('origin')) {
      const match = trimmed.match(/origin\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
      if (match) {
        gridInfo.origin_x = parseFloat(match[1]);
        gridInfo.origin_y = parseFloat(match[2]);
        gridInfo.origin_z = parseFloat(match[3]);
      }
      continue;
    }
    
    // Parse delta (spacing)
    if (trimmed.includes('delta')) {
      const match = trimmed.match(/delta\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
      if (match) {
        gridInfo.grid_spacing = parseFloat(match[1]);
      }
      continue;
    }
    
    // Parse data section
    if (trimmed.includes('class array') && trimmed.includes('data follows')) {
      readingData = true;
      continue;
    }
    
    if (readingData && trimmed) {
      const values = trimmed.split(/\s+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
      gridData = gridData.concat(values);
    }
  }

  // Convert to Float32Array for binary efficiency
  const expectedPoints = gridInfo.nx * gridInfo.ny * gridInfo.nz;
  if (gridData.length !== expectedPoints) {
    console.warn(`DX file has ${gridData.length} values, expected ${expectedPoints}`);
    if (gridData.length < expectedPoints) {
      const paddedData = new Float32Array(expectedPoints);
      paddedData.set(gridData);
      gridData = paddedData;
    } else {
      gridData = new Float32Array(gridData.slice(0, expectedPoints));
    }
  } else {
    gridData = new Float32Array(gridData);
  }

  return { gridInfo, gridData };
};

/**
 * Process all DX files and convert to binary format
 */
const processFragMaps = async () => {
  console.log('🚀 Starting FragMap pre-processing...');
  
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Get all DX files
    const files = await fs.readdir(fragMapsDir);
    const dxFiles = files.filter(file => file.endsWith('.dx'));
    
    console.log(`Found ${dxFiles.length} DX files to process`);
    
    const results = [];
    
    for (const file of dxFiles) {
      console.log(`Processing ${file}...`);
      
      const filePath = path.join(fragMapsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Parse DX file
      const { gridInfo, gridData } = parseDxFile(content);
      
      // Create binary data structure
      const binaryData = {
        metadata: {
          format: 'binary',
          version: '1.0',
          sourceFile: file,
          generatedAt: new Date().toISOString(),
          gridInfo,
          dataPoints: gridData.length
        },
        // Convert Float32Array to base64 for browser-compatible JSON storage
        gridDataBase64: Buffer.from(gridData.buffer).toString('base64')
      };
      
      // Save binary version
      const outputFile = file.replace('.dx', '.json');
      const outputPath = path.join(outputDir, outputFile);
      await fs.writeFile(outputPath, JSON.stringify(binaryData, null, 2));
      
      // Calculate compression ratio
      const originalSize = content.length;
      const compressedSize = JSON.stringify(binaryData).length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      
      results.push({
        file,
        originalSize: `${(originalSize / 1024 / 1024).toFixed(1)}MB`,
        compressedSize: `${(compressedSize / 1024 / 1024).toFixed(1)}MB`,
        compression: `${compressionRatio}%`,
        dataPoints: gridData.length
      });
      
      console.log(`✅ ${file} -> ${outputFile} (${compressionRatio}% compression)`);
    }
    
    // Create summary report
    console.log('\n📊 Processing Summary:');
    console.table(results);
    
    // Create index file for easy loading
    const index = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      fragMaps: dxFiles.map(file => ({
        id: file.replace('.dx', ''),
        binaryFile: file.replace('.dx', '.json'),
        originalFile: file
      }))
    };
    
    await fs.writeFile(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));
    console.log('\n📋 Created index.json');
    
    console.log('\n🎉 FragMap pre-processing complete!');
    console.log(`Binary files saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Error processing FragMaps:', error);
    process.exit(1);
  }
};

// Run the processor
processFragMaps();
