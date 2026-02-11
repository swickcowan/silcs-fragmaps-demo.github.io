/**
 * Generate Realistic SILCS FragMap Test Data
 * Creates proper 40x40x40 grids with realistic free energy values
 * following SILCS conventions for P38 MAP Kinase binding site
 */

const fs = require('fs');
const path = require('path');

// Real binding site center from 3FLY PDB
const BINDING_SITE_CENTER = [20.81, 10.74, 31.16];

// Grid parameters following SILCS conventions
const GRID_PARAMS = {
  nx: 40,
  ny: 40,
  nz: 40,
  origin_x: BINDING_SITE_CENTER[0] - 16, // Center grid on binding site
  origin_y: BINDING_SITE_CENTER[1] - 16,
  origin_z: BINDING_SITE_CENTER[2] - 16,
  grid_spacing: 0.8,
  data_type: "GOC", // Grid Of Contacts
  energy_units: "kcal/mol"
};

// FragMap types with realistic energy distributions
const FRAGMAP_TYPES = [
  {
    id: 'hydrophobic',
    name: 'Hydrophobic',
    description: 'Favorable regions for non-polar groups where van der Waals interactions and water exclusion drive binding',
    energy_range: { min: -2.5, max: 1.5, favorable: -0.8 },
    spatial_pattern: 'pocket_centered'
  },
  {
    id: 'hbond-donor',
    name: 'H-Bond Donor',
    description: 'Optimal locations for hydrogen bond donors to form favorable interactions with protein acceptors',
    energy_range: { min: -3.0, max: 2.0, favorable: -1.2 },
    spatial_pattern: 'directional'
  },
  {
    id: 'hbond-acceptor',
    name: 'H-Bond Acceptor',
    description: 'Favorable sites for hydrogen bond acceptors to receive hydrogen bonds from protein donors',
    energy_range: { min: -3.0, max: 2.0, favorable: -1.2 },
    spatial_pattern: 'directional'
  },
  {
    id: 'positive',
    name: 'Positive Ion',
    description: 'Regions where positively charged groups experience favorable electrostatic interactions',
    energy_range: { min: -2.0, max: 2.5, favorable: -0.6 },
    spatial_pattern: 'electrostatic'
  },
  {
    id: 'negative',
    name: 'Negative Ion',
    description: 'Areas where negatively charged groups can form favorable interactions with positive residues',
    energy_range: { min: -2.0, max: 2.5, favorable: -0.6 },
    spatial_pattern: 'electrostatic'
  },
  {
    id: 'aromatic',
    name: 'Aromatic',
    description: 'Favorable regions for aromatic ring systems to engage in π-π stacking interactions',
    energy_range: { min: -2.2, max: 1.8, favorable: -0.7 },
    spatial_pattern: 'planar'
  }
];

/**
 * Generates realistic free energy values for a grid point
 * @param {number} x - Grid x coordinate
 * @param {number} y - Grid y coordinate  
 * @param {number} z - Grid z coordinate
 * @param {Object} fragMapType - FragMap configuration
 * @returns {number} Free energy value
 */
function generateEnergyValue(x, y, z, fragMapType) {
  const { energy_range, spatial_pattern } = fragMapType;
  const { min, max, favorable } = energy_range;
  
  // Calculate distance from grid center
  const centerX = GRID_PARAMS.nx / 2;
  const centerY = GRID_PARAMS.ny / 2;
  const centerZ = GRID_PARAMS.nz / 2;
  
  const dx = x - centerX;
  const dy = y - centerY;
  const dz = z - centerZ;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  let baseEnergy = max; // Start with unfavorable value
  
  switch (spatial_pattern) {
    case 'pocket_centered':
      // Hydrophobic regions are typically in pocket centers
      if (distance < 8) {
        baseEnergy = favorable + (distance / 8) * (max - favorable);
      } else {
        // Add some noise
        baseEnergy = max - Math.random() * 0.5;
      }
      break;
      
    case 'directional':
      // H-bond regions are more directional and specific
      const angle = Math.atan2(dy, dx);
      const directionalFactor = Math.cos(angle * 2) * 0.5 + 0.5;
      
      if (distance < 6 && directionalFactor > 0.6) {
        baseEnergy = favorable + (1 - directionalFactor) * (max - favorable);
      } else {
        baseEnergy = max - Math.random() * 0.3;
      }
      break;
      
    case 'electrostatic':
      // Electrostatic interactions have longer range
      const electrostaticRange = 12;
      if (distance < electrostaticRange) {
        const electrostaticFactor = 1 - (distance / electrostaticRange);
        baseEnergy = favorable + electrostaticFactor * (max - favorable) * 0.7;
      } else {
        baseEnergy = max - Math.random() * 0.4;
      }
      break;
      
    case 'planar':
      // Aromatic regions are more planar
      const planarFactor = Math.abs(dz) < 3 ? 0.8 : 0.3;
      if (distance < 10 && planarFactor > 0.5) {
        baseEnergy = favorable + (1 - planarFactor) * (max - favorable);
      } else {
        baseEnergy = max - Math.random() * 0.6;
      }
      break;
      
    default:
      baseEnergy = max - Math.random() * 0.5;
  }
  
  // Add realistic noise
  const noise = (Math.random() - 0.5) * 0.4;
  baseEnergy += noise;
  
  // Clamp to valid range
  return Math.max(min, Math.min(max, baseEnergy));
}

/**
 * Generates complete grid data for a FragMap
 * @param {Object} fragMapType - FragMap configuration
 * @returns {Float32Array} Grid data
 */
function generateGridData(fragMapType) {
  const { nx, ny, nz } = GRID_PARAMS;
  const totalPoints = nx * ny * nz;
  const gridData = new Float32Array(totalPoints);
  
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        const index = x + y * nx + z * nx * ny;
        gridData[index] = generateEnergyValue(x, y, z, fragMapType);
      }
    }
  }
  
  return gridData;
}

/**
 * Creates FragMap file content in proper format
 * @param {Object} fragMapType - FragMap configuration
 * @returns {string} File content
 */
function createFragMapFile(fragMapType) {
  const gridData = generateGridData(fragMapType);
  
  let content = `# SILCS FragMap - ${fragMapType.name}\n`;
  content += `# Generated for P38 MAP Kinase (3FLY)\n`;
  content += `# Grid spacing: ${GRID_PARAMS.grid_spacing} Å\n`;
  content += `# Grid dimensions: ${GRID_PARAMS.nx}x${GRID_PARAMS.ny}x${GRID_PARAMS.nz}\n`;
  content += `# Origin: (${GRID_PARAMS.origin_x.toFixed(1)}, ${GRID_PARAMS.origin_y.toFixed(1)}, ${GRID_PARAMS.origin_z.toFixed(1)})\n`;
  content += `# Energy range: ${fragMapType.energy_range.min.toFixed(1)} to ${fragMapType.energy_range.max.toFixed(1)} kcal/mol\n\n`;
  
  content += `# Header\n`;
  content += `&grid_info\n`;
  content += `  nx = ${GRID_PARAMS.nx}, ny = ${GRID_PARAMS.ny}, nz = ${GRID_PARAMS.nz}\n`;
  content += `  origin_x = ${GRID_PARAMS.origin_x.toFixed(3)}, origin_y = ${GRID_PARAMS.origin_y.toFixed(3)}, origin_z = ${GRID_PARAMS.origin_z.toFixed(3)}\n`;
  content += `  grid_spacing = ${GRID_PARAMS.grid_spacing}\n`;
  content += `  data_type = "${GRID_PARAMS.data_type}"\n`;
  content += `  fragmap_type = "${fragMapType.name}"\n`;
  content += `  protein_pdb = "3FLY"\n`;
  content += `  energy_units = "${GRID_PARAMS.energy_units}"\n`;
  content += `  favorable_threshold = ${fragMapType.energy_range.favorable.toFixed(2)}\n`;
  content += `/\n\n`;
  
  content += `# Grid data (${gridData.length} values)\n`;
  
  // Write grid data in rows of 10 values for readability
  const valuesPerRow = 10;
  for (let i = 0; i < gridData.length; i += valuesPerRow) {
    const row = [];
    for (let j = 0; j < valuesPerRow && (i + j) < gridData.length; j++) {
      row.push(gridData[i + j].toFixed(3));
    }
    content += row.join(' ') + '\n';
  }
  
  return content;
}

/**
 * Main function to generate all FragMap files
 */
function generateAllFragMaps() {
  console.log('Generating realistic SILCS FragMap test data...\n');
  
  const outputDir = path.join(__dirname, '..', 'public', 'assets', 'fragmaps');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate each FragMap type
  for (const fragMapType of FRAGMAP_TYPES) {
    console.log(`Generating ${fragMapType.id}...`);
    
    const fileContent = createFragMapFile(fragMapType);
    const filePath = path.join(outputDir, `${fragMapType.id}.map`);
    
    fs.writeFileSync(filePath, fileContent);
    
    // Calculate statistics
    const gridData = generateGridData(fragMapType);
    const min = Math.min(...gridData);
    const max = Math.max(...gridData);
    const mean = gridData.reduce((a, b) => a + b, 0) / gridData.length;
    
    console.log(`  ✓ ${fragMapType.id}.map created`);
    console.log(`    Energy range: ${min.toFixed(2)} to ${max.toFixed(2)} kcal/mol`);
    console.log(`    Mean energy: ${mean.toFixed(2)} kcal/mol`);
    console.log(`    Favorable points (< ${fragMapType.energy_range.favorable}): ${gridData.filter(v => v < fragMapType.energy_range.favorable).length}/${gridData.length}\n`);
  }
  
  console.log('✅ All FragMap files generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log('\nFiles created:');
  FRAGMAP_TYPES.forEach(type => {
    console.log(`  - ${type.id}.map (${type.name})`);
  });
}

// Run the generator
if (require.main === module) {
  generateAllFragMaps();
}

module.exports = {
  generateAllFragMaps,
  generateGridData,
  createFragMapFile,
  GRID_PARAMS,
  FRAGMAP_TYPES
};
