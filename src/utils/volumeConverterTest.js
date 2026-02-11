/**
 * Test utility for validating the Mol* volume converter
 * Tests the conversion pipeline with sample SILCS data
 */

import { convertSilcsToMolstarVolume, validateVolumeConversion } from './molstarVolumeConverter.js';

/**
 * Test the volume conversion with a small sample of SILCS data
 */
export const testVolumeConversion = async () => {
  console.log('=== TESTING VOLUME CONVERSION ===');
  
  // Create a minimal SILCS .map file content for testing
  const testSilcsData = `GRID_PARAMETER_FILE 
GRID_DATA_FILE 
MACROMOLECULE 
SPACING 1.000
NELEMENTS 4 4 4
CENTER 2.0 2.0 2.0
0.192
0.136
0.160
0.126
0.132
0.126
0.126
0.072
0.023
0.066
0.126
0.136
0.167
0.167
0.132
0.215
0.215
0.170
0.084
0.132
0.139
0.156
0.126
0.126
0.203
0.119
0.126
0.048
0.103
0.149
0.043
0.037
0.116
0.075
0.255
0.116
0.129
0.109
0.139
0.146
0.143
0.174
0.075
0.136
0.192
0.136
0.160
0.126
0.132
0.126
0.126
0.072
0.023
0.066
0.126
0.136
0.167
0.167
0.132
0.215
0.215
0.170
0.084
0.132
0.139
0.156
0.126
0.126
0.203
0.119
0.126
0.048
0.103
0.149
0.043
0.037
0.116
0.075
0.255
0.116
0.129
0.109
0.139
0.146
0.143
0.174
0.075
0.136`;

  try {
    console.log('Testing with sample SILCS data...');
    console.log('Data length:', testSilcsData.length);
    
    // Test the conversion
    const volume = await convertSilcsToMolstarVolume(testSilcsData, 'test-fragmap');
    
    console.log('✅ Volume conversion successful!');
    console.log('Volume object:', volume);
    
    // Test validation
    const fragMapConfig = {
      id: 'test-fragmap',
      isoValue: -0.5,
      color: '#ff8800'
    };
    
    const isValid = validateVolumeConversion(volume, fragMapConfig);
    console.log('✅ Volume validation:', isValid ? 'PASSED' : 'FAILED');
    
    return { success: true, volume, isValid };
    
  } catch (error) {
    console.error('❌ Volume conversion test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Test grid origin calculation specifically
 */
export const testGridOriginCalculation = () => {
  console.log('=== TESTING GRID ORIGIN CALCULATION ===');
  
  const testCases = [
    {
      description: 'Center at origin, unit spacing',
      centerX: 0, centerY: 0, centerZ: 0,
      nx: 10, ny: 10, nz: 10,
      spacing: 1.0,
      expectedOrigin: { x: -5, y: -5, z: -5 }
    },
    {
      description: 'Center at (2,2,2), unit spacing',
      centerX: 2, centerY: 2, centerZ: 2,
      nx: 4, ny: 4, nz: 4,
      spacing: 1.0,
      expectedOrigin: { x: 0, y: 0, z: 0 }
    },
    {
      description: 'Real SILCS data',
      centerX: 42.746, centerY: 34.792, centerZ: 30.762,
      nx: 84, ny: 64, nz: 58,
      spacing: 1.0,
      expectedOrigin: { x: 0.746, y: 2.792, z: 1.762 }
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const originX = testCase.centerX - (testCase.nx * testCase.spacing) / 2;
    const originY = testCase.centerY - (testCase.ny * testCase.spacing) / 2;
    const originZ = testCase.centerZ - (testCase.nz * testCase.spacing) / 2;
    
    const calculatedOrigin = { x: originX, y: originY, z: originZ };
    const isCorrect = 
      Math.abs(calculatedOrigin.x - testCase.expectedOrigin.x) < 0.001 &&
      Math.abs(calculatedOrigin.y - testCase.expectedOrigin.y) < 0.001 &&
      Math.abs(calculatedOrigin.z - testCase.expectedOrigin.z) < 0.001;
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Expected origin: (${testCase.expectedOrigin.x}, ${testCase.expectedOrigin.y}, ${testCase.expectedOrigin.z})`);
    console.log(`  Calculated origin: (${calculatedOrigin.x.toFixed(3)}, ${calculatedOrigin.y.toFixed(3)}, ${calculatedOrigin.z.toFixed(3)})`);
    console.log(`  Result: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
  });
};

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  window.testVolumeConversion = testVolumeConversion;
  window.testGridOriginCalculation = testGridOriginCalculation;
  console.log('Volume converter tests available as window.testVolumeConversion() and window.testGridOriginCalculation()');
}
