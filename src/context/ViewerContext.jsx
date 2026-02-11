import React, { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * Initial state for the molecular viewer context
 */
const initialState = {
  // Viewer state
  viewer: null,
  isLoading: true,
  error: null,

  // FragMap state
  activeFragMaps: new Set([]),
  isoValues: {},
  fragMapVolumes: {},
  fragMapRepresentations: {},

  // Protein selection state
  selectedProteinPart: null,
  proteinSelectionBounds: null,

  // Ligand state
  selectedLigand: 'crystal',
  loadedLigands: new Set(),

  // UI state
  currentNarrative: '',
  isSpinning: false,
  cameraReset: false
};

/**
 * Action types for state management
 */
const actionTypes = {
  // Viewer actions
  SET_VIEWER: 'SET_VIEWER',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',

  // FragMap actions
  TOGGLE_FRAGMAP: 'TOGGLE_FRAGMAP',
  SET_ISOVALUE: 'SET_ISOVALUE',
  SET_FRAGMAP_VOLUMES: 'SET_FRAGMAP_VOLUMES',
  SET_FRAGMAP_REPRESENTATIONS: 'SET_FRAGMAP_REPRESENTATIONS',

  // Protein selection actions
  SET_PROTEIN_PART: 'SET_PROTEIN_PART',
  SET_PROTEIN_SELECTION_BOUNDS: 'SET_PROTEIN_SELECTION_BOUNDS',

  // Ligand actions
  SET_SELECTED_LIGAND: 'SET_SELECTED_LIGAND',
  ADD_LOADED_LIGAND: 'ADD_LOADED_LIGAND',
  CLEAR_LOADED_LIGANDS: 'CLEAR_LOADED_LIGANDS',

  // UI actions
  SET_NARRATIVE: 'SET_NARRATIVE',
  TOGGLE_SPIN: 'TOGGLE_SPIN',
  RESET_CAMERA: 'RESET_CAMERA',
  CLEAR_FRAGMAPS: 'CLEAR_FRAGMAPS'
};

/**
 * Reducer function for state management
 */
const viewerReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_VIEWER:
      return { ...state, viewer: action.payload, error: null };

    case actionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case actionTypes.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case actionTypes.TOGGLE_FRAGMAP:
      const newActiveFragMaps = new Set(state.activeFragMaps);
      if (newActiveFragMaps.has(action.payload)) {
        newActiveFragMaps.delete(action.payload);
      } else {
        newActiveFragMaps.add(action.payload);
      }
      return { ...state, activeFragMaps: newActiveFragMaps };

    case actionTypes.SET_ISOVALUE:
      return {
        ...state,
        isoValues: {
          ...state.isoValues,
          [action.payload.fragMapId]: action.payload.value
        }
      };

    case actionTypes.SET_FRAGMAP_VOLUMES:
      return { ...state, fragMapVolumes: action.payload };

    case actionTypes.SET_FRAGMAP_REPRESENTATIONS:
      return { ...state, fragMapRepresentations: action.payload };

    case actionTypes.SET_PROTEIN_PART:
      return { ...state, selectedProteinPart: action.payload };

    case actionTypes.SET_PROTEIN_SELECTION_BOUNDS:
      return { ...state, proteinSelectionBounds: action.payload };

    case actionTypes.SET_SELECTED_LIGAND:
      return { ...state, selectedLigand: action.payload };

    case actionTypes.ADD_LOADED_LIGAND:
      const newLoadedLigands = new Set(state.loadedLigands);
      newLoadedLigands.add(action.payload);
      return { ...state, loadedLigands: newLoadedLigands };

    case actionTypes.CLEAR_LOADED_LIGANDS:
      return { ...state, loadedLigands: new Set() };

    case actionTypes.SET_NARRATIVE:
      return { ...state, currentNarrative: action.payload };

    case actionTypes.TOGGLE_SPIN:
      return { ...state, isSpinning: !state.isSpinning };

    case actionTypes.RESET_CAMERA:
      return { ...state, cameraReset: !state.cameraReset };

    case actionTypes.CLEAR_FRAGMAPS:
      return { ...state, activeFragMaps: new Set() };

    default:
      return state;
  }
};

/**
 * Context for the molecular viewer
 */
const ViewerContext = createContext();

/**
 * Provider component for the viewer context
 */
export const ViewerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(viewerReducer, initialState);

  // Action creators for common operations
  const actions = {
    // Viewer actions
    setViewer: useCallback((viewer) => {
      dispatch({ type: actionTypes.SET_VIEWER, payload: viewer });
    }, []),

    setLoading: useCallback((isLoading) => {
      dispatch({ type: actionTypes.SET_LOADING, payload: isLoading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: actionTypes.SET_ERROR, payload: error });
    }, []),

    // FragMap actions
    toggleFragMap: useCallback((fragMapId) => {
      dispatch({ type: actionTypes.TOGGLE_FRAGMAP, payload: fragMapId });
    }, []),

    setIsoValue: useCallback((fragMapId, value) => {
      dispatch({ type: actionTypes.SET_ISOVALUE, payload: { fragMapId, value } });
    }, []),

    setFragMapVolumes: useCallback((volumes) => {
      dispatch({ type: actionTypes.SET_FRAGMAP_VOLUMES, payload: volumes });
    }, []),

    setFragMapRepresentations: useCallback((representations) => {
      dispatch({ type: actionTypes.SET_FRAGMAP_REPRESENTATIONS, payload: representations });
    }, []),

    // Protein selection actions
    setProteinPart: useCallback((proteinPart) => {
      dispatch({ type: actionTypes.SET_PROTEIN_PART, payload: proteinPart });
    }, []),

    setProteinSelectionBounds: useCallback((bounds) => {
      dispatch({ type: actionTypes.SET_PROTEIN_SELECTION_BOUNDS, payload: bounds });
    }, []),

    // Ligand actions
    setSelectedLigand: useCallback((ligandId) => {
      dispatch({ type: actionTypes.SET_SELECTED_LIGAND, payload: ligandId });
    }, []),

    addLoadedLigand: useCallback((ligandId) => {
      dispatch({ type: actionTypes.ADD_LOADED_LIGAND, payload: ligandId });
    }, []),

    clearLoadedLigands: useCallback(() => {
      dispatch({ type: actionTypes.CLEAR_LOADED_LIGANDS });
    }, []),

    // UI actions
    setNarrative: useCallback((narrative) => {
      dispatch({ type: actionTypes.SET_NARRATIVE, payload: narrative });
    }, []),

    toggleSpin: useCallback(() => {
      dispatch({ type: actionTypes.TOGGLE_SPIN });
    }, []),

    resetCamera: useCallback(() => {
      dispatch({ type: actionTypes.RESET_CAMERA });
    }, []),

    clearFragMaps: useCallback(() => {
      dispatch({ type: actionTypes.CLEAR_FRAGMAPS });
    }, [])
  };

  const value = {
    state,
    actions
  };

  return (
    <ViewerContext.Provider value={value}>
      {children}
    </ViewerContext.Provider>
  );
};

/**
 * Hook to use the viewer context
 */
export const useViewer = () => {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error('useViewer must be used within a ViewerProvider');
  }
  return context;
};

/**
 * Selectors for specific state values
 */
export const useViewerState = () => {
  const { state } = useViewer();
  return state;
};

export const useViewerActions = () => {
  const { actions } = useViewer();
  return actions;
};

export const useFragMaps = () => {
  const { state } = useViewer();
  return {
    activeFragMaps: state.activeFragMaps,
    isoValues: state.isoValues,
    fragMapVolumes: state.fragMapVolumes,
    fragMapRepresentations: state.fragMapRepresentations
  };
};

export const useLigands = () => {
  const { state } = useViewer();
  return {
    selectedLigand: state.selectedLigand,
    loadedLigands: state.loadedLigands
  };
};

export const useProteinSelection = () => {
  const { state } = useViewer();
  return {
    selectedProteinPart: state.selectedProteinPart,
    proteinSelectionBounds: state.proteinSelectionBounds
  };
};

export const useViewerUI = () => {
  const { state } = useViewer();
  return {
    isLoading: state.isLoading,
    error: state.error,
    currentNarrative: state.currentNarrative,
    isSpinning: state.isSpinning,
    cameraReset: state.cameraReset
  };
};
