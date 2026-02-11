/**
 * Utility functions for parsing and processing ligand files
 */

import { ligandDefaults, fallbackLigand } from '../config/ligandOptions.js';

/**
 * Converts SDF file content to PDB format
 * @param {string} sdfContent - Raw SDF file content
 * @param {string} ligandName - Name for the ligand in PDB format
 * @returns {string} PDB formatted content
 */
export const convertSDFToPDB = (sdfContent, ligandName = 'LIG') => {
  const lines = sdfContent.split('\n');
  let pdbContent = `HEADER    ${ligandName}\n`;
  let atomIndex = 1;
  let inAtomBlock = false;
  let atomCount = 0;
  let atomsRead = 0;
  const elementMap = new Map(); // Track element frequencies

  console.log('🔄 [PDB CONVERSION] Starting SDF to PDB conversion');
  console.log('📄 [PDB CONVERSION] SDF file lines:', lines.length);
  console.log('📄 [PDB CONVERSION] First few lines:', lines.slice(0, 10));

  // Parse atoms from SDF - MDL Molfile V2000 format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and end markers
    if (trimmedLine === '' || trimmedLine === 'M  END' || trimmedLine === '$$$$') {
      continue;
    }

    // Skip header lines (first 3 lines)
    if (i < 3) {
      continue;
    }

    // Parse counts line (line 4 in V2000 format) - format: aaabbblllfffcccsssxxxrrrpppiiimmmvvvvvv
    // aaa = atom count, bbb = bond count
    if (i === 3) {
      const countsMatch = trimmedLine.match(/^\s*(\d+)\s+(\d+)/);
      if (countsMatch) {
        atomCount = parseInt(countsMatch[1], 10);
        console.log(`📊 [PDB CONVERSION] Counts line: ${atomCount} atoms expected`);
        inAtomBlock = true;
      }
      continue;
    }

    // If we're in the atom block and haven't read all atoms yet
    if (inAtomBlock && atomsRead < atomCount) {
      // MDL V2000 atom line format (fixed width):
      // Positions:   0-9: x coordinate (10 chars)
      //             10-19: y coordinate (10 chars)  
      //             20-29: z coordinate (10 chars)
      //             30: space
      //             31-33: atom symbol (3 chars)
      //             34+: mass difference, charge, etc.

      if (line.length >= 34) {
        const x = line.substring(0, 10).trim();
        const y = line.substring(10, 20).trim();
        const z = line.substring(20, 30).trim();
        const element = line.substring(31, 34).trim();

        // Validate we have valid coordinate numbers and element symbol
        if (x && y && z && element &&
          !isNaN(parseFloat(x)) && !isNaN(parseFloat(y)) && !isNaN(parseFloat(z)) &&
          /^[A-Z][a-z]?$/.test(element)) {

          console.log(`🧬 [PDB CONVERSION] Found atom ${atomIndex}: ${element} at (${x}, ${y}, ${z})`);
          
          // Track element frequency
          elementMap.set(element, (elementMap.get(element) || 0) + 1);

          const xCoord = parseFloat(x).toFixed(3).padStart(8);
          const yCoord = parseFloat(y).toFixed(3).padStart(8);
          const zCoord = parseFloat(z).toFixed(3).padStart(8);
          
          // Ensure element symbol is properly formatted for consistent coloring
          const formattedElement = element.toUpperCase().padEnd(2);
          console.log(`🎨 [PDB CONVERSION] Element formatting: '${element}' -> '${formattedElement}'`);

          pdbContent += `ATOM  ${atomIndex.toString().padStart(5)}  ${formattedElement.padEnd(4)}LIG A   1    ${xCoord}${yCoord}${zCoord}  1.00  0.00           ${element.padStart(2)}\n`;
          atomIndex++;
          atomsRead++;
          continue;
        } else {
          console.log(`⚠️ [PDB CONVERSION] Skipping invalid atom line ${i}:`, {
            x, y, z, element,
            xValid: x && !isNaN(parseFloat(x)),
            yValid: y && !isNaN(parseFloat(y)),
            zValid: z && !isNaN(parseFloat(z)),
            elementValid: /^[A-Z][a-z]?$/.test(element),
            lineLength: line.length
          });
        }
      }
    }

    // Once we've read all atoms, stop processing (rest is bonds data)
    if (atomsRead >= atomCount && atomCount > 0) {
      break;
    }
  }

  if (atomIndex === 1) {
    throw new Error('No atoms found in SDF file during conversion');
  }

  pdbContent += 'END\n';

  console.log('📊 [PDB CONVERSION] Element frequency map:', Object.fromEntries(elementMap));
  
  // Log the actual element symbols found
  const elementSymbols = Array.from(elementMap.keys());
  console.log('🧪 [PDB CONVERSION] Element symbols found:', elementSymbols);
  console.log('🧪 [PDB CONVERSION] Element counts:', elementSymbols.map(el => `${el}: ${elementMap.get(el)}`));
  
  console.log('📄 [PDB CONVERSION] Generated PDB content:');
  console.log(pdbContent);
  console.log(`✅ [PDB CONVERSION] Total atoms converted: ${atomIndex - 1}`);

  return pdbContent;
};


/**
 * Creates a fallback test ligand when parsing fails
 * @param {string} ligandName - Name for the test ligand
 * @returns {string} PDB formatted test ligand
 */
export const createTestLigand = (ligandName = 'Test Ligand') => {
  console.log(`Creating test ligand: ${ligandName}`);

  return `HEADER    ${ligandName}
ATOM      1  C   TST A   1      30.000   30.000   30.000  1.00  0.00           C  
ATOM      2  C   TST A   1      31.000   30.000   30.000  1.00  0.00           C  
ATOM      3  C   TST A   1      30.500   30.866   30.000  1.00  0.00           C  
ATOM      4  C   TST A   1      31.000   31.500   30.000  1.00  0.00           C  
ATOM      5  C   TST A   1      30.500   31.366   30.000  1.00  0.00           C  
ATOM      6  C   TST A   1      30.000   31.366   30.000  1.00  0.00           C  
END
`;
};

/**
 * Validates ligand structure data
 * @param {Object} ligandData - Ligand structure data from Mol*
 * @returns {boolean} True if ligand data is valid
 */
export const validateLigandData = (ligandData) => {
  if (!ligandData || typeof ligandData !== 'object') {
    return false;
  }

  // Check for atoms in various possible locations
  let atoms = 0;

  // Check 1: Standard atomicHierarchy
  if (ligandData?.atomicHierarchy?.atoms?.length > 0) {
    atoms = ligandData.atomicHierarchy.atoms.length;
  }
  // Check 2: Direct atoms property
  else if (ligandData?.atoms?.length > 0) {
    atoms = ligandData.atoms.length;
  }
  // Check 3: mmCIF atom_site data
  else if (ligandData?.sourceData?.data?.db?.atom_site) {
    const atomSite = ligandData.sourceData.data.db.atom_site;
    if (Array.isArray(atomSite)) {
      atoms = atomSite.length;
    } else if (atomSite._rowCount) {
      atoms = atomSite._rowCount;
    }
  }
  // Check 4: Source data atoms
  else if (ligandData?.sourceData?.atoms?.length > 0) {
    atoms = ligandData.sourceData.atoms.length;
  }
  // Check 5: Coords array
  else if (ligandData?.coords && Array.isArray(ligandData.coords)) {
    atoms = ligandData.coords.length / 3; // Assuming x,y,z triples
  }
  // Check 6: Parsed from PDB content
  else if (ligandData?.data && typeof ligandData.data === 'string') {
    const atomMatches = ligandData.data.match(/ATOM\s+\d+/g);
    if (atomMatches) {
      atoms = atomMatches.length;
    }
  }

  return atoms > 0;
};

/**
 * Extracts atom count from ligand structure data
 * @param {Object} ligandData - Ligand structure data from Mol*
 * @returns {Object} Atom count and source information
 */
export const extractAtomCount = (ligandData) => {
  let atoms = 0;
  let atomSource = '';

  // Check 1: Standard atomicHierarchy
  if (ligandData?.atomicHierarchy?.atoms?.length > 0) {
    atoms = ligandData.atomicHierarchy.atoms.length;
    atomSource = 'atomicHierarchy.atoms';
  }
  // Check 2: Direct atoms property
  else if (ligandData?.atoms?.length > 0) {
    atoms = ligandData.atoms.length;
    atomSource = 'atoms';
  }
  // Check 3: mmCIF atom_site data
  else if (ligandData?.sourceData?.data?.db?.atom_site) {
    const atomSite = ligandData.sourceData.data.db.atom_site;
    if (Array.isArray(atomSite)) {
      atoms = atomSite.length;
      atomSource = 'mmCIF atom_site array';
    } else if (atomSite._rowCount) {
      atoms = atomSite._rowCount;
      atomSource = 'mmCIF atom_site rowCount';
    }
  }
  // Check 4: Source data atoms
  else if (ligandData?.sourceData?.atoms?.length > 0) {
    atoms = ligandData.sourceData.atoms.length;
    atomSource = 'sourceData.atoms';
  }
  // Check 5: Coords array
  else if (ligandData?.coords && Array.isArray(ligandData.coords)) {
    atoms = ligandData.coords.length / 3; // Assuming x,y,z triples
    atomSource = 'coords array';
  }
  // Check 6: Parsed from PDB content
  else if (ligandData?.data && typeof ligandData.data === 'string') {
    const atomMatches = ligandData.data.match(/ATOM\s+\d+/g);
    if (atomMatches) {
      atoms = atomMatches.length;
      atomSource = 'PDB string parsing';
    }
  }

  return { atoms, atomSource };
};

/**
 * Creates a blob URL from PDB content
 * @param {string} pdbContent - PDB formatted content
 * @returns {string} Blob URL
 */
export const createPdbBlobUrl = (pdbContent) => {
  const blob = new Blob([pdbContent], { type: 'text/plain' });
  return URL.createObjectURL(blob);
};

/**
 * Cleans up blob URLs to prevent memory leaks
 * @param {string} blobUrl - Blob URL to revoke
 */
export const cleanupBlobUrl = (blobUrl) => {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
};

/**
 * Handles ligand parsing errors with appropriate fallbacks
 * @param {Error} error - The parsing error
 * @param {string} ligandName - Name of the ligand being parsed
 * @returns {string} Fallback PDB content
 */
export const handleLigandParsingError = (error, ligandName) => {
  console.log(`Ligand parsing failed for ${ligandName}:`, error.message);
  console.log('Using fallback ligand');

  return fallbackLigand.content;
};
