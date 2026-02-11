/**
 * Configuration for ligand options
 * Defines available ligand structures and their properties
 */

export const ligandOptions = [
  {
    id: 'crystal',
    name: 'Crystal Ligand',
    description: 'Original ligand from X-ray crystal structure (PDB: 3FLY). This represents the experimentally observed binding conformation with high resolution (1.8Å), providing the gold standard reference for evaluating computational predictions.',
    file: '3fly_cryst_lig.sdf',
    type: 'crystal',
    significance: 'Serves as the experimental ground truth for P38 MAP kinase inhibition, demonstrating key interactions with the hinge region and ATP-binding pocket.'
  },
  {
    id: 'silcs-mc-posref',
    name: 'SILCS-MC Pose Refinement',
    description: 'SILCS-Monte Carlo refined pose of the crystal ligand after performing limited MC sampling of translation, rotation and dihedrals to achieve minimized pose and LGFE score in the field of FragMaps. Atom-wise GFE is provided in the properties section.',
    file: '3fly_cryst_lig_posref.sdf',
    type: 'silcs-mc',
    significance: 'Demonstrates the SILCS-MC Pose Refinement protocol capability to optimize ligand poses within the FragMaps field, potentially improving binding affinity and complementarity.'
  },
  {
    id: 'goldstein-05',
    name: 'Goldstein Ligand 05',
    description: 'Goldstein series ligand (compound 05_2e) docked using the SILCS-MC Pose Refinement protocol. This ligand was first aligned to the crystal ligand from PDB 3FLY before refinement.',
    file: 'p38_goldstein_05_2e.sdf',
    type: 'silcs-mc',
    significance: 'Represents a novel chemical scaffold optimized through SILCS-MC sampling, exploring alternative binding modes and interactions within the P38 MAP kinase binding pocket.'
  }
];

/**
 * Default ligand visualization parameters
 */
export const ligandDefaults = {
  representation: 'ball-and-stick',
  colorScheme: 'element',
  atomSize: 0.8,
  bondRadius: 0.3,
  includeParent: false
};

/**
 * Fallback ligand data for error scenarios
 */
export const fallbackLigand = {
  name: 'Test Ligand',
  content: `HEADER    Test Ligand
ATOM      1  C   TST A   1      30.000   30.000   30.000  1.00  0.00           C  
ATOM      2  C   TST A   1      31.000   30.000   30.000  1.00  0.00           C  
ATOM      3  C   TST A   1      30.500   30.866   30.000  1.00  0.00           C  
ATOM      4  C   TST A   1      31.000   31.500   30.000  1.00  0.00           C  
ATOM      5  C   TST A   1      30.500   31.366   30.000  1.00  0.00           C  
ATOM      6  C   TST A   1      30.000   31.366   30.000  1.00  0.00           C  
END
`
};
