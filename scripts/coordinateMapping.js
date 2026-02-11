#!/usr/bin/env node

/**
 * Strategic FragMap Coordinate Mapping Script
 * 
 * This script analyzes the coordinate systems and determines the proper
 * transformation needed to align FragMap grid data with protein/ligand coordinates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const PROTEIN_PDB = '/Users/henrycowan/Desktop/silcs-fragmaps-demo-main/from_silcsbio/3fly.pdb';
const LIGAND_SDF = '/Users/henrycowan/Desktop/silcs-fragmaps-demo-main/from_silcsbio/3fly_cryst_lig.sdf';
const FRAGMAP_DIR = '/Users/henrycowan/Desktop/silcs-fragmaps-demo-main/from_silcsbio/maps';

/**
 * Parse PDB file to extract atom coordinates
 */
function parsePDB(pdbPath) {
  console.log('🔍 Parsing PDB file:', pdbPath);
  const content = fs.readFileSync(pdbPath, 'utf8');
  const lines = content.split('\n');
  const atoms = [];
  
  for (const line of lines) {
    if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
      const x = parseFloat(line.substring(30, 38).trim());
      const y = parseFloat(line.substring(38, 46).trim());
      const z = parseFloat(line.substring(46, 54).trim());
      const element = line.substring(76, 78).trim();
      const resName = line.substring(17, 20).trim();
      const resSeq = parseInt(line.substring(22, 26).trim());
      
      atoms.push({ x, y, z, element, resName, resSeq });
    }
  }
  
  console.log(`✅ Parsed ${atoms.length} atoms from PDB`);
  return atoms;
}

/**
 * Parse SDF file to extract ligand coordinates
 */
function parseSDF(sdfPath) {
  console.log('🔍 Parsing SDF file:', sdfPath);
  const content = fs.readFileSync(sdfPath, 'utf8');
  const lines = content.split('\n');
  const atoms = [];
  
  // Find the counts line (line 4) and start parsing atoms from line 5
  const countsLine = lines[3].trim();
  const numAtoms = parseInt(countsLine.split(/\s+/)[0]);
  console.log(`   SDF expects ${numAtoms} atoms`);
  
  // Parse atoms from line 5 onwards
  for (let i = 4; i < 4 + numAtoms; i++) {
    if (i < lines.length) {
      const line = lines[i];
      // SDF format: x(0-10) y(10-20) z(20-30) element(31-34)
      const x = parseFloat(line.substring(0, 10).trim());
      const y = parseFloat(line.substring(10, 20).trim());
      const z = parseFloat(line.substring(20, 30).trim());
      const element = line.substring(31, 34).trim();
      
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        atoms.push({ x, y, z, element });
      }
    }
  }
  
  console.log(`✅ Parsed ${atoms.length} atoms from SDF`);
  return atoms;
}

/**
 * Parse FragMap grid header to get grid parameters
 */
function parseFragMapHeader(mapPath) {
  console.log('🔍 Parsing FragMap header:', mapPath);
  const content = fs.readFileSync(mapPath, 'utf8');
  const lines = content.split('\n');
  
  let gridInfo = {};
  for (const line of lines) {
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
    }
  }
  
  console.log('✅ Grid info:', gridInfo);
  return gridInfo;
}

/**
 * Calculate coordinate ranges
 */
function calculateRanges(atoms, label) {
  if (atoms.length === 0) return null;
  
  const xCoords = atoms.map(a => a.x);
  const yCoords = atoms.map(a => a.y);
  const zCoords = atoms.map(a => a.z);
  
  const ranges = {
    x: { min: Math.min(...xCoords), max: Math.max(...xCoords) },
    y: { min: Math.min(...yCoords), max: Math.max(...yCoords) },
    z: { min: Math.min(...zCoords), max: Math.max(...zCoords) }
  };
  
  console.log(`📊 ${label} coordinate ranges:`);
  console.log(`   X: ${ranges.x.min.toFixed(1)} to ${ranges.x.max.toFixed(1)} Å`);
  console.log(`   Y: ${ranges.y.min.toFixed(1)} to ${ranges.y.max.toFixed(1)} Å`);
  console.log(`   Z: ${ranges.z.min.toFixed(1)} to ${ranges.z.max.toFixed(1)} Å`);
  
  return ranges;
}

/**
 * Calculate center of mass
 */
function calculateCenter(atoms) {
  if (atoms.length === 0) return { x: 0, y: 0, z: 0 };
  
  const sum = atoms.reduce((acc, atom) => ({
    x: acc.x + atom.x,
    y: acc.y + atom.y,
    z: acc.z + atom.z
  }), { x: 0, y: 0, z: 0 });
  
  return {
    x: sum.x / atoms.length,
    y: sum.y / atoms.length,
    z: sum.z / atoms.length
  };
}

/**
 * Main analysis function
 */
function analyzeCoordinateSystems() {
  console.log('🎯 Starting coordinate system analysis...\n');
  
  // Parse all coordinate systems
  const proteinAtoms = parsePDB(PROTEIN_PDB);
  const ligandAtoms = parseSDF(LIGAND_SDF);
  
  // Find FragMap files
  const fragMapFiles = fs.readdirSync(FRAGMAP_DIR)
    .filter(f => f.endsWith('.map'))
    .map(f => path.join(FRAGMAP_DIR, f));
  
  console.log(`\n📁 Found ${fragMapFiles.length} FragMap files`);
  
  // Parse first FragMap header for grid info
  const gridInfo = parseFragMapHeader(fragMapFiles[0]);
  
  // Calculate ranges
  const proteinRanges = calculateRanges(proteinAtoms, 'Protein');
  const ligandRanges = calculateRanges(ligandAtoms, 'Ligand');
  
  // Calculate centers
  const proteinCenter = calculateCenter(proteinAtoms);
  const ligandCenter = calculateCenter(ligandAtoms);
  
  console.log('\n📍 Center of mass:');
  console.log(`   Protein: (${proteinCenter.x.toFixed(1)}, ${proteinCenter.y.toFixed(1)}, ${proteinCenter.z.toFixed(1)})`);
  console.log(`   Ligand:  (${ligandCenter.x.toFixed(1)}, ${ligandCenter.y.toFixed(1)}, ${ligandCenter.z.toFixed(1)})`);
  console.log(`   FragMap: (${gridInfo.centerX.toFixed(1)}, ${gridInfo.centerY.toFixed(1)}, ${gridInfo.centerZ.toFixed(1)})`);
  
  // Calculate transformations
  const proteinToLigand = {
    x: ligandCenter.x - proteinCenter.x,
    y: ligandCenter.y - proteinCenter.y,
    z: ligandCenter.z - proteinCenter.z
  };
  
  const proteinToFragMap = {
    x: gridInfo.centerX - proteinCenter.x,
    y: gridInfo.centerY - proteinCenter.y,
    z: gridInfo.centerZ - proteinCenter.z
  };
  
  console.log('\n🔄 Coordinate transformations:');
  console.log(`   Protein → Ligand: (${proteinToLigand.x.toFixed(1)}, ${proteinToLigand.y.toFixed(1)}, ${proteinToLigand.z.toFixed(1)})`);
  console.log(`   Protein → FragMap: (${proteinToFragMap.x.toFixed(1)}, ${proteinToFragMap.y.toFixed(1)}, ${proteinToFragMap.z.toFixed(1)})`);
  
  // Determine the alignment strategy
  console.log('\n📋 Alignment Strategy:');
  
  // Check if FragMap grid is offset from protein
  const offsetMagnitude = Math.sqrt(
    proteinToFragMap.x ** 2 + 
    proteinToFragMap.y ** 2 + 
    proteinToFragMap.z ** 2
  );
  
  console.log(`   FragMap offset magnitude: ${offsetMagnitude.toFixed(1)} Å`);
  
  if (offsetMagnitude > 20) {
    console.log('   ⚠️  Large offset detected - FragMap grid needs coordinate transformation');
    console.log('   🎯 Strategy: Apply offset correction to align FragMap with protein coordinates');
    
    // Calculate the transformation needed
    const transformation = {
      offsetX: -proteinToFragMap.x,
      offsetY: -proteinToFragMap.y,
      offsetZ: -proteinToFragMap.z
    };
    
    console.log(`   📐 Transformation: offset by (${transformation.offsetX.toFixed(1)}, ${transformation.offsetY.toFixed(1)}, ${transformation.offsetZ.toFixed(1)})`);
    
    return transformation;
  } else {
    console.log('   ✅ FragMap grid appears aligned with protein coordinates');
    return { offsetX: 0, offsetY: 0, offsetZ: 0 };
  }
}

/**
 * Apply coordinate transformation to FragMap data
 */
function applyTransformation(transformation) {
  console.log('\n🔧 Applying coordinate transformation...');
  
  // Read FragMap files and apply transformation
  const fragMapFiles = fs.readdirSync(FRAGMAP_DIR)
    .filter(f => f.endsWith('.map'));
  
  for (const file of fragMapFiles) {
    const filePath = path.join(FRAGMAP_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Parse grid data and apply transformation
    const lines = content.split('\n');
    let headerLines = [];
    let dataLines = [];
    let inData = false;
    
    for (const line of lines) {
      if (line.includes('MACROMOLECULE')) {
        inData = true;
        headerLines.push(line);
      } else if (inData) {
        // Apply transformation to grid values
        const value = parseFloat(line.trim());
        if (!isNaN(value)) {
          // This is grid data - no transformation needed for values
          dataLines.push(line);
        } else {
          // This might be additional header info
          headerLines.push(line);
        }
      } else {
        headerLines.push(line);
      }
    }
    
    // Create transformed file
    const transformedContent = [
      ...headerLines,
      ...dataLines
    ].join('\n');
    
    // Save transformed file
    const outputPath = filePath.replace('.map', '_transformed.map');
    fs.writeFileSync(outputPath, transformedContent);
    
    console.log(`✅ Transformed: ${file} → ${path.basename(outputPath)}`);
  }
}

// Run the analysis
const transformation = analyzeCoordinateSystems();

if (transformation.offsetX !== 0 || transformation.offsetY !== 0 || transformation.offsetZ !== 0) {
  console.log('\n🚀 Applying coordinate transformation...');
  // applyTransformation(transformation);
} else {
  console.log('\n✅ No transformation needed');
}

export { analyzeCoordinateSystems, applyTransformation };
