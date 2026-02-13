/**
 * 3Dmol.js Viewer Utility
 * Provides a wrapper around 3Dmol.js for molecular visualization
 * Imports 3Dmol.js from the npm package (no CDN dependency)
 */

import * as $3Dmol from '3dmol';

/**
 * Gets the correct base path for assets based on the environment
 * @returns {string} Base path for assets
 */
const getBasePath = () => {
  // In development, check if we're running with a base path
  if (import.meta.env.DEV) {
    // For development with GitHub Pages base path, use the same base path
    return import.meta.env.BASE_URL || '';
  }
  // In production (GitHub Pages), use the configured base path
  return import.meta.env.BASE_URL || '';
};

/**
 * Creates and initializes a 3Dmol.js viewer
 * @param {HTMLElement} container - Container element for the viewer
 * @param {Object} options - Viewer configuration options
 * @returns {Promise<Object>} Viewer instance with helper methods
 */
export const create3DmolViewer = async (container, options = {}) => {
  console.log('Creating 3Dmol viewer with container:', container);

  try {
    if (!$3Dmol || !$3Dmol.createViewer) {
      throw new Error('3Dmol.js module did not load correctly — createViewer not found');
    }

    console.log('✅ 3Dmol.js loaded from npm package');

    const defaultOptions = {
      backgroundColor: 'black',
      antialias: true,
      quality: 'high',
      ...options
    };

    // Create the 3Dmol viewer
    const viewer = $3Dmol.createViewer(container, {
      backgroundColor: defaultOptions.backgroundColor,
      antialias: defaultOptions.antialias,
      quality: defaultOptions.quality
    });

    if (!viewer) {
      throw new Error('Failed to create 3Dmol viewer');
    }

    console.log('✅ 3Dmol.js viewer instance created');

    // Wrapper object with helper methods
    const viewerWrapper = {
      // Core viewer instance
      viewer,
      // Expose $3Dmol for external use (e.g. FragMap loader)
      $3Dmol,

      // State tracking
      models: new Map(),
      representations: new Map(),
      // Track custom shapes (spheres) separately from molecule models
      shapeIds: new Map(),

      /**
       * Loads a protein structure from PDB file
       * @param {string} url - URL to PDB file
       * @param {Object} options - Loading options
       * @returns {Promise<Object>} Model reference
       */
      async loadProtein(url, options = {}) {
        try {
          // Add base path to URL if it's a relative path
          const fullUrl = url.startsWith('http') ? url : `${getBasePath()}${url}`;
          console.log(`Loading protein from: ${fullUrl}`);

          const response = await fetch(fullUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDB file: ${response.status}`);
          }

          const pdbData = await response.text();
          const model = viewer.addModel(pdbData, 'pdb');

          this.models.set(model, {
            type: 'protein',
            url: fullUrl,
            loadedAt: new Date().toISOString()
          });

          console.log(`✅ Protein loaded, model:`, model);
          return model;

        } catch (error) {
          console.error('Error loading protein:', error);
          throw error;
        }
      },

      /**
       * Loads a ligand structure from SDF file
       * @param {string} url - URL to SDF file
       * @param {Object} options - Loading options
       * @returns {Promise<Object>} Model reference
       */
      async loadLigand(url, options = {}) {
        try {
          // Add base path to URL if it's a relative path
          const fullUrl = url.startsWith('http') ? url : `${getBasePath()}${url}`;
          console.log(`Loading ligand from: ${fullUrl}`);

          const response = await fetch(fullUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch SDF file: ${response.status}`);
          }

          const sdfData = await response.text();
          const model = viewer.addModel(sdfData, 'sdf');

          this.models.set(model, {
            type: 'ligand',
            url: fullUrl,
            loadedAt: new Date().toISOString()
          });

          console.log(`✅ Ligand loaded, model:`, model);
          return model;

        } catch (error) {
          console.error('Error loading ligand:', error);
          throw error;
        }
      },

      /**
       * Creates a cartoon representation for protein
       * @param {Object} model - Model reference
       * @param {Object} options - Representation options
       * @returns {Promise<string>} Representation ID
       */
      async addCartoonRepresentation(model, options = {}) {
        try {
          // In 3Dmol.js, color schemes (spectrum, chain, ssJmol, etc.)
          // go in 'colorscheme', not 'color'. 'color' is for literal hex/CSS colors.
          const cartoonStyle = {
            opacity: options.opacity ?? 1.0
          };

          // Determine the appropriate color scheme
          const scheme = options.colorscheme || options.scheme || options.color || 'spectrum';
          const lowerScheme = typeof scheme === 'string' ? scheme.toLowerCase() : '';

          // 'spectrum' is a special value in 3Dmol.js - it goes in the `color` property
          // of cartoon style, NOT in colorscheme. The cartoon renderer detects
          // cartoon.color === 'spectrum' and applies a rainbow gradient.
          if (lowerScheme === 'spectrum') {
            cartoonStyle.color = 'spectrum';
          } else {
            // Map common names to 3Dmol colorscheme names
            const schemeMap = {
              'chainid': 'chain',
              'chain': 'chain',
              'chainhetatm': 'chainHetatm',
              'ssjmol': 'ssJmol',
              'jmol': 'Jmol',
              'amino': 'amino',
              'shapely': 'shapely',
              'nucleic': 'nucleic',
              'taylor': 'taylor',
              'turn': 'turn',
              'strand': 'strand'
            };
            const mappedScheme = schemeMap[lowerScheme];
            if (mappedScheme) {
              cartoonStyle.colorscheme = mappedScheme;
            } else {
              // Treat as a literal color (hex or CSS color name)
              cartoonStyle.color = scheme;
            }
          }

          viewer.setStyle({ model }, { cartoon: cartoonStyle });

          const repId = `cartoon_${Date.now()}`;
          this.representations.set(repId, {
            type: 'cartoon',
            model,
            options
          });

          console.log(`✅ Cartoon representation added`);
          return repId;

        } catch (error) {
          console.error('Error adding cartoon representation:', error);
          throw error;
        }
      },

      /**
       * Creates a ball-and-stick representation for ligands
       * @param {Object} model - Model reference
       * @param {Object} options - Representation options
       * @returns {Promise<string>} Representation ID
       */
      async addBallAndStickRepresentation(model, options = {}) {
        try {
          viewer.setStyle({ model }, {
            stick: {
              radius: options.bondRadius ?? 0.15,
              colorscheme: options.colorscheme || 'default'
            },
            sphere: {
              scale: options.scale ?? 0.3,
              colorscheme: options.colorscheme || 'default'
            }
          });

          const repId = `ballandstick_${Date.now()}`;
          this.representations.set(repId, {
            type: 'ballandstick',
            model,
            options
          });

          console.log(`✅ Ball-and-stick representation added`);
          return repId;

        } catch (error) {
          console.error('Error adding ball-and-stick representation:', error);
          throw error;
        }
      },

      /**
       * Removes all representations for a specific model
       * @param {Object} model - Model reference
       */
      clearRepresentations(model) {
        try {
          viewer.removeModel(model);

          // Clean up representations map
          for (const [repId, rep] of this.representations) {
            if (rep.model === model) {
              this.representations.delete(repId);
            }
          }

          this.models.delete(model);
          console.log(`Cleared representations for model`);

        } catch (error) {
          console.error('Error clearing representations:', error);
        }
      },

      /**
       * Removes all representations of a specific type
       * @param {string} type - Representation type ('cartoon', 'ballandstick', etc.)
       */
      clearRepresentationsOfType(type) {
        try {
          const repsToRemove = [];
          for (const [repId, rep] of this.representations) {
            if (rep.type === type) {
              repsToRemove.push({ repId, model: rep.model });
            }
          }

          for (const { repId, model } of repsToRemove) {
            viewer.removeModel(model);
            this.representations.delete(repId);
            this.models.delete(model);
          }

          console.log(`Cleared ${repsToRemove.length} representations of type: ${type}`);

        } catch (error) {
          console.error('Error clearing representations by type:', error);
        }
      },

      /**
       * Resets the camera view
       */
      async resetView() {
        try {
          viewer.zoomTo();
          viewer.render();
          console.log('Camera view reset');
        } catch (error) {
          console.error('Error resetting view:', error);
        }
      },

      /**
       * Zooms to specific models or all content
       * @param {Array} modelIds - Array of model IDs to zoom to (optional)
       */
      async zoomTo(modelIds = null) {
        try {
          if (modelIds && modelIds.length > 0) {
            viewer.zoomTo({ model: modelIds });
          } else {
            viewer.zoomTo();
          }
          viewer.render();
        } catch (error) {
          console.error('Error zooming:', error);
        }
      },

      /**
       * Enables/disables spinning animation
       * @param {boolean} spin - Whether to spin
       */
      setSpin(spin) {
        try {
          if (spin) {
            viewer.spin('y');
          } else {
            viewer.spin(false);
          }
          console.log(`Spin ${spin ? 'enabled' : 'disabled'}`);
        } catch (error) {
          console.error('Error setting spin:', error);
        }
      },

      /**
       * Renders the scene
       */
      render() {
        try {
          viewer.render();
        } catch (error) {
          console.error('Error rendering:', error);
        }
      },

      /**
       * Gets the current viewer state
       * @returns {Object} Viewer state
       */
      getState() {
        return {
          models: Array.from(this.models.entries()),
          representations: Array.from(this.representations.entries()),
          viewerInitialized: !!viewer
        };
      },

      /**
       * Disposes the viewer
       */
      dispose() {
        try {
          viewer.clear();
          this.models.clear();
          this.representations.clear();
          this.shapeIds.clear();
          console.log('Viewer disposed');
        } catch (error) {
          console.error('Error disposing viewer:', error);
        }
      }
    };

    return viewerWrapper;

  } catch (error) {
    console.error('Error creating 3Dmol viewer:', error);
    throw error;
  }
};

/**
 * Creates a mock viewer for development/testing
 * @returns {Object} Mock viewer instance
 */
export const createMockViewer = () => {
  return {
    viewer: null,
    models: new Map(),
    representations: new Map(),

    async loadProtein(url) {
      console.log(`Mock loading protein from: ${url}`);
      return 'mock_protein_id';
    },

    async loadLigand(url) {
      console.log(`Mock loading ligand from: ${url}`);
      return 'mock_ligand_id';
    },

    async addCartoonRepresentation(modelId, options = {}) {
      console.log(`Mock adding cartoon representation for model: ${modelId}`);
      return `mock_cartoon_${modelId}`;
    },

    async addBallAndStickRepresentation(modelId, options = {}) {
      console.log(`Mock adding ball-and-stick representation for model: ${modelId}`);
      return `mock_ballandstick_${modelId}`;
    },

    async addVolumeData(volumeData, options = {}) {
      console.log(`Mock adding volume data:`, volumeData, options);
      return 'mock_volume_id';
    },

    clearRepresentations(modelId) {
      console.log(`Mock clearing representations for model: ${modelId}`);
    },

    clearRepresentationsOfType(type) {
      console.log(`Mock clearing representations of type: ${type}`);
    },

    async resetView() {
      console.log('Mock resetting view');
    },

    async zoomTo(modelIds = null) {
      console.log(`Mock zooming to:`, modelIds || 'all content');
    },

    setSpin(spin, speed = 1) {
      console.log(`Mock spin ${spin ? 'enabled' : 'disabled'}`);
    },

    render() {
      console.log('Mock rendering');
    },

    getState() {
      return {
        models: [],
        representations: [],
        viewerInitialized: false
      };
    },

    dispose() {
      console.log('Mock viewer disposed');
    }
  };
};
