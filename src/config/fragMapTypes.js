/**
 * Configuration for SILCS FragMap types
 * Defines the different FragMap categories, their visual properties, and default parameters
 */

export const fragMapTypes = [
  {
    id: 'hydrophobic',
    name: 'Hydrophobic',
    color: '#ffeb3b',
    description: 'Favorable regions for non-polar groups where van der Waals interactions and water exclusion drive binding. These areas typically correspond to protein pockets with low solvent accessibility.',
    isoValue: -0.8,
    minIsoValue: -2.0, // More negative = more stringent (only most favorable regions)
    maxIsoValue: 0.5,   // Less negative/positive = more permissive (include more sites)
    bindingRelevance: 'Critical for ligand affinity through hydrophobic effect and desolvation energy contributions.',
    fileName: '3fly.apolar.gfe.dx',
    thresholdMode: 'lower'
  },
  {
    id: 'hbond-donor',
    name: 'H-Bond Donor',
    color: '#2196f3',
    description: 'Optimal locations for hydrogen bond donors (NH, OH groups) to form favorable interactions with protein acceptors. Geometry constraints: D-H...A distance < 3.5Å, angle > 120°.',
    isoValue: -0.8,
    minIsoValue: -2.0, // More negative = more stringent (only most favorable regions)
    maxIsoValue: 0.5,   // Less negative/positive = more permissive (include more sites)
    bindingRelevance: 'Essential for specificity and binding enthalpy, particularly in the hinge region of kinases.',
    fileName: '3fly.hbdon.gfe.dx',
    thresholdMode: 'lower'
  },
  {
    id: 'hbond-acceptor',
    name: 'H-Bond Acceptor',
    color: '#f44336',
    description: 'Favorable sites for hydrogen bond acceptors (carbonyl O, heteroatoms) to receive hydrogen bonds from protein donors. Critical for anchoring ligands in the binding site.',
    isoValue: -0.8,
    minIsoValue: -2.0, // More negative = more stringent (only most favorable regions)
    maxIsoValue: 0.5,   // Less negative/positive = more permissive (include more sites)
    bindingRelevance: 'Provides directional interactions that determine binding orientation and specificity.',
    fileName: '3fly.hbacc.gfe.dx',
    thresholdMode: 'lower'
  },
  {
    id: 'positive',
    name: 'Positive Ion',
    color: '#4caf50',
    description: 'Regions where positively charged groups (amines, guanidinium) experience favorable electrostatic interactions with negative protein residues (Asp, Glu). Follows Coulombic attraction principles.',
    isoValue: -0.8,
    minIsoValue: -2.0, // More negative = more stringent (only most favorable regions)
    maxIsoValue: 0.5,   // Less negative/positive = more permissive (include more sites)
    bindingRelevance: 'Important for salt bridge formation and long-range electrostatic steering toward the binding site.',
    fileName: '3fly.mamn.gfe.dx',
    thresholdMode: 'lower'
  },
  {
    id: 'negative',
    name: 'Negative Ion',
    color: '#9c27b0',
    description: 'Areas where negatively charged groups (carboxylates, phosphates) can form favorable interactions with positive protein residues (Lys, Arg, His). Often found near active site entrances.',
    isoValue: -0.8,
    minIsoValue: -2.0, // More negative = more stringent (only most favorable regions)
    maxIsoValue: 0.5,   // Less negative/positive = more permissive (include more sites)
    bindingRelevance: 'Contributes to binding through ionic interactions and charge complementarity.',
    fileName: '3fly.meoo.gfe.dx',
    thresholdMode: 'lower'
  },
  {
    id: 'aromatic',
    name: 'Aromatic',
    color: '#ff9800',
    description: 'Favorable regions for aromatic ring systems to engage in π-π stacking or edge-to-face interactions. Optimal centroid distance: 3.4-4.0Å with specific orientation preferences.',
    isoValue: -0.8,
    minIsoValue: -2.0, // More negative = more stringent (only most favorable regions)
    maxIsoValue: 0.5,   // Less negative/positive = more permissive (include more sites)
    bindingRelevance: 'Provides additional binding energy through dispersion forces and quadrupole interactions.',
    fileName: '3fly.acec.gfe.dx',
    thresholdMode: 'lower'
  }
];

/**
 * FragMap color legend data for UI components
 */
export const fragMapLegend = [
  { color: '#ffeb3b', name: 'Hydrophobic', desc: 'Non-polar interactions' },
  { color: '#2196f3', name: 'H-Bond Donor', desc: 'Hydrogen bond donors' },
  { color: '#f44336', name: 'H-Bond Acceptor', desc: 'Hydrogen bond acceptors' },
  { color: '#4caf50', name: 'Positive Ion', desc: 'Cationic interactions' },
  { color: '#9c27b0', name: 'Negative Ion', desc: 'Anionic interactions' },
  { color: '#ff9800', name: 'Aromatic', desc: 'π-π stacking' }
];

/**
 * Default FragMap visualization parameters
 * Updated for SILCS GFE (Grid Free Energy) data interpretation
 */
export const fragMapDefaults = {
  // Visualization parameters
  gridSpacing: 1.0,
  sphereRadius: 0.3,
  opacity: 0.6,

  // Default isovalues for different FragMap types (optimized for SILCS GFE data)
  defaultIsoValues: {
    'hydrophobic': -0.8,    // Show strong hydrophobic regions
    'hbond-donor': -0.6,    // Show strong H-bond donor regions  
    'hbond-acceptor': -0.6, // Show strong H-bond acceptor regions
    'positive': -0.5,        // Show strong positive regions
    'negative': -0.5,        // Show strong negative regions
    'aromatic': -0.7,        // Show strong aromatic regions
    'water': 0.3,           // Strong water affinity regions
    'exclusion': 0.5        // Strong exclusion regions
  },
  gridSampleRate: 2, // Sample every Nth grid point for performance
  // Scientific presets for different stringency levels
  presetValues: [-1.5, -1.0, -0.5, 0.0], // Stringent to permissive
  // Performance optimizations
  adaptiveSampling: true,
  smoothingSigma: 0.8
};
