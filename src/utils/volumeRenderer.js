/**
 * 3Dmol.js Volume Rendering Utilities for SILCS FragMaps
 * This file is deprecated - using 3Dmol.js instead of Mol*
 * Kept for compatibility but will be removed in future cleanup
 */

// Export empty functions to prevent import errors
export const createVolumeRepresentation = async () => {
  console.warn('volumeRenderer.js is deprecated for 3Dmol.js implementation');
  return null;
};

export const updateVolumeIsovalue = async () => {
  console.warn('volumeRenderer.js is deprecated for 3Dmol.js implementation');
  return null;
};

export const removeVolumeRepresentation = async () => {
  console.warn('volumeRenderer.js is deprecated for 3Dmol.js implementation');
  return null;
};

export const validateVolumeData = () => {
  console.warn('volumeRenderer.js is deprecated for 3Dmol.js implementation');
  return false;
};
