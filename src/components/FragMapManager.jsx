import React, { useCallback, useEffect } from 'react';
import { useViewer } from '../context/ViewerContext.jsx';
import { fragMapTypes } from '../config/fragMapTypes.js';
import { load3DmolFragMap, load3DmolSphereFragMap, remove3DmolFragMap } from '../utils/3dmolFragMapLoader.js';

/**
 * FragMapManager Component
 * Handles FragMap loading, parsing, and visualization management
 * Provides robust synchronization between 3Dmol.js viewer and application state
 */
const FragMapManager = () => {
  const { state, actions } = useViewer();
  const { viewer, activeFragMaps, isoValues, selectedProteinPart } = state;
  const { setNarrative } = actions;

  // Track active representations to prevent redundant toggles and enable proper cleanup
  const activeRepsRef = React.useRef(new Map());
  const processingRef = React.useRef(new Set());

  /**
   * Updates FragMap visualization based on desired state
   */
  const updateFragMapVisualization = useCallback(async (fragMapId, isActivating, forceRefresh = false) => {
    if (!viewer) return;

    // Prevent concurrent processing of the same FragMap
    if (processingRef.current.has(fragMapId) && !forceRefresh) return;

    const currentRepRef = activeRepsRef.current.get(fragMapId);

    // Skip if state already matches and no refresh forced
    // Note: currentRepRef can be null even for active FragMaps if no spheres were generated
    if (!forceRefresh && isActivating && currentRepRef) {
      console.log(`⏭️ [FRAGMAP-MANAGER] ${fragMapId} already active with representation, skipping`);
      return;
    }
    if (!forceRefresh && !isActivating && !currentRepRef && !activeFragMaps.has(fragMapId)) {
      console.log(`⏭️ [FRAGMAP-MANAGER] ${fragMapId} already inactive, skipping`);
      return;
    }

    processingRef.current.add(fragMapId);
    console.log(`🔄 [FRAGMAP-MANAGER] ${isActivating ? 'Activating' : 'Deactivating'} FragMap: ${fragMapId} (force: ${forceRefresh})`);

    try {
      const fragMap = fragMapTypes.find(fm => fm.id === fragMapId);
      if (!fragMap) return;

      // 1. Cleanup existing representation if any
      if (currentRepRef || forceRefresh) {
        console.log('🧹 Cleaning up existing 3Dmol FragMap representation...');

        if (currentRepRef) {
          await remove3DmolFragMap(viewer, currentRepRef);
        }

        activeRepsRef.current.delete(fragMapId);
      }

      // 2. Create new representation if activating
      if (isActivating) {
        // If no protein part is selected, we'll show FragMaps globally (limited by maxSpheres)
        if (!selectedProteinPart?.residues?.length) {
          console.log(`ℹ️ [FRAGMAP-MANAGER] No protein region selected - showing global FragMap for ${fragMapId}`);
        }

        const currentIsoValue = isoValues[fragMapId] || fragMap.isoValue;

        try {
          console.log(`⚡ [FRAGMAP-MANAGER] Loading 3Dmol FragMap for ${fragMapId}...`);

          // Use sphere-based representation for better performance and compatibility
          const result = await load3DmolSphereFragMap(viewer, fragMapId, {
            ...fragMap,
            isoValue: currentIsoValue,
            alpha: 0.6,
            sphereSize: 0.25,
            selectedProteinPart: selectedProteinPart,
            isoValueRange: 0.1,
            maxDistance: 100.0
          });

          // Check if result is valid
          if (!result) {
            console.warn(`[FRAGMAP-MANAGER] No spheres returned for ${fragMapId} - may be outside selected region or energy range`);
            setNarrative(`No ${fragMap.name} spheres found in selected region. Try adjusting isovalues or selecting a different protein region.`);
            return;
          }

          const { modelId } = result;

          // Store representation reference using the modelId
          activeRepsRef.current.set(fragMapId, modelId);
          console.log(`✅ [FRAGMAP-MANAGER] Created 3Dmol sphere representation for ${fragMap.name}`);

        } catch (sphereError) {
          console.error(`[FRAGMAP-MANAGER] 3Dmol sphere rendering failed for ${fragMapId}:`, sphereError);
          setNarrative(`Failed to load ${fragMap.name} spheres. Please try adjusting the isovalue.`);
        }
      }
    } catch (error) {
      console.error(`[FRAGMAP-MANAGER] Error updating ${fragMapId}:`, error);
    } finally {
      processingRef.current.delete(fragMapId);
    }
  }, [viewer, selectedProteinPart, isoValues]);

  // Synchronize visualizations when activeFragMaps change
  useEffect(() => {
    if (!viewer) return;

    fragMapTypes.forEach(fragMap => {
      const shouldBeActive = activeFragMaps.has(fragMap.id);
      updateFragMapVisualization(fragMap.id, shouldBeActive);
    });
  }, [activeFragMaps, viewer, updateFragMapVisualization]);

  // Refresh visualizations when isovalues or protein selection change
  useEffect(() => {
    if (!viewer || activeFragMaps.size === 0) return;

    activeFragMaps.forEach(fragMapId => {
      updateFragMapVisualization(fragMapId, true, true);
    });
  }, [isoValues, selectedProteinPart, viewer, updateFragMapVisualization]);

  // FragMaps are now always accessible - no auto-enable needed

  // Ligand loaded event listener
  useEffect(() => {
    const handleLigandLoaded = (event) => {
      // Auto-enable FragMaps even if no protein part is selected (only if user hasn't interacted)
      const hasUserInteracted = localStorage.getItem('fragmap-user-interacted') === 'true';
      
      if (activeFragMaps.size === 0 && !hasUserInteracted) {
        fragMapTypes.forEach(fm => actions.toggleFragMap(fm.id));
        setNarrative(`${event.detail.ligandName} loaded. Automatically enabled FragMaps.`);
      }
    };

    window.addEventListener('ligandLoaded', handleLigandLoaded);
    return () => window.removeEventListener('ligandLoaded', handleLigandLoaded);
  }, [activeFragMaps.size, actions, setNarrative]);

  // Track user interaction with FragMaps
  useEffect(() => {
    if (activeFragMaps.size > 0) {
      localStorage.setItem('fragmap-user-interacted', 'true');
    }
  }, [activeFragMaps.size]);

  return null;
};

export default FragMapManager;
