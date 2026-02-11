/**
 * Simple test script to validate the volume conversion works
 * Run this in the browser console after the app loads
 */

async function testVolumeConversion() {
  console.log('=== TESTING VOLUME CONVERSION ===');
  
  try {
    // Test the grid origin calculation first
    console.log('Testing grid origin calculation...');
    window.testGridOriginCalculation();
    
    // Test the volume conversion with sample data
    console.log('Testing volume conversion...');
    const result = await window.testVolumeConversion();
    
    if (result.success) {
      console.log('✅ All tests passed!');
      console.log('Volume created:', result.volume);
      console.log('Validation passed:', result.isValid);
    } else {
      console.error('❌ Tests failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Auto-run the test when the page loads
setTimeout(() => {
  if (window.testVolumeConversion && window.testGridOriginCalculation) {
    console.log('Volume converter tests are available. Run testVolumeConversion() to test.');
  } else {
    console.log('Volume converter tests not yet loaded...');
  }
}, 2000);

// Make the test function globally available
window.testVolumeConversionComplete = testVolumeConversion;
