# SILCS FragMaps Integration Guide

## Overview
This guide explains how to integrate real SILCS FragMap data into the interactive visualization demo. The codebase is now prepared to handle both test data and real SILCS files seamlessly.

## File Structure
```
public/assets/
├── fragmaps/
│   ├── hydrophobic.map     # Test data (realistic)
│   ├── hbond-donor.map     # Test data (realistic)
│   ├── hbond-acceptor.map  # Test data (realistic)
│   ├── positive.map        # Test data (realistic)
│   ├── negative.map        # Test data (realistic)
│   ├── aromatic.map        # Test data (realistic)
│   ├── [real_files].map    # Real SILCS data (to be added)
│   └── [real_files].dx     # Real SILCS data (alternative format)
├── ligands/
│   ├── crystal_ligand.sdf  # Crystal structure ligand
│   ├── silcs_mc_pose_1.sdf # SILCS-MC refined pose 1
│   └── silcs_mc_pose_2.sdf # SILCS-MC refined pose 2
└── pdb/
    └── 3FLY.pdb            # P38 MAP Kinase structure
```

## Integration Steps

### 1. Add Real SILCS Files
When SilcsBio provides the real FragMap files:

1. **Copy files to the correct directory:**
   ```bash
   # Copy real SILCS FragMap files
   cp [path_to_silcs_files]/*.map public/assets/fragmaps/
   
   # Or if using .dx format
   cp [path_to_silcs_files]/*.dx public/assets/fragmaps/
   ```

2. **File naming convention:**
   - Files should be named: `{fragmap_type}.map` or `{fragmap_type}.dx`
   - Supported types: `hydrophobic`, `hbond-donor`, `hbond-acceptor`, `positive`, `negative`, `aromatic`

### 2. Supported File Formats

#### SILCS .map Format (Preferred)
```
# SILCS FragMap - Hydrophobic
# Generated for P38 MAP Kinase (3FLY)
# Grid spacing: 0.8 Å
# Grid dimensions: 40x40x40

&grid_info
  nx = 40, ny = 40, nz = 40
  origin_x = 4.810, origin_y = -5.260, origin_z = 15.160
  grid_spacing = 0.8
  data_type = "GOC"
  fragmap_type = "Hydrophobic"
  protein_pdb = "3FLY"
  energy_units = "kcal/mol"
/

# Grid data (64000 values)
-1.234 -0.987 -0.654 ...
```

#### OpenDX .dx Format (Alternative)
```
object 1 class grid counts 40 40 40
origin 4.81 -5.26 15.16
delta 0.8 0 0
delta 0 0.8 0
delta 0 0 0.8
object 2 class array type float rank 0 items 64000 data follows
-1.234 -0.987 -0.654 ...
```

### 3. Automatic Integration
The codebase will automatically detect and use real SILCS files:

1. **File Detection:** The `fragMapLoader.js` utility scans for available files
2. **Format Support:** Both `.map` and `.dx` formats are supported
3. **Fallback:** If real files aren't found, falls back to test data
4. **Validation:** Automatic validation of grid dimensions and data integrity

### 4. Configuration Updates

#### Update Grid Parameters (if needed)
If real SILCS files use different grid parameters, update `src/config/fragMapTypes.js`:

```javascript
export const fragMapDefaults = {
  minIsoValue: -2.0,        // Adjust based on real data range
  maxIsoValue: 2.0,         // Adjust based on real data range
  isoValueStep: 0.1,
  sphereSize: 0.3,
  gridSampleRate: 2,
  bindingSiteOrigin: [20.81, 10.74, 31.16], // Real binding site center
  gridSpacing: 0.8          // Adjust if different
};
```

#### Update Default Isovalues
If real SILCS data has different energy ranges:

```javascript
// In fragMapTypes array
{
  id: 'hydrophobic',
  name: 'Hydrophobic',
  color: '#ffeb3b',
  isoValue: -0.8,  // Adjust based on real data
  // ...
}
```

### 5. Testing Integration

#### Verify Real Data Loading
1. Open browser developer console
2. Navigate to the interactive viewer
3. Check console logs for:
   ```
   Loading FragMap hydrophobic in map format...
   Successfully loaded FragMap hydrophobic: {
     gridDimensions: {nx: 40, ny: 40, nz: 40},
     dataPoints: 64000,
     energyRange: {min: -2.5, max: 1.5}
   }
   ```

#### Test Volume Rendering
1. Toggle FragMap visibility
2. Adjust isovalues using sliders
3. Verify proper surface rendering (not fake spheres)
4. Check that surfaces align with binding site

### 6. Troubleshooting

#### Common Issues

**Issue: FragMaps not loading**
- **Check:** File names match expected pattern (`{type}.map` or `{type}.dx`)
- **Check:** Files are in `public/assets/fragmaps/` directory
- **Check:** File permissions allow web server access

**Issue: Incorrect positioning**
- **Check:** Grid origin coordinates in file headers
- **Check:** `bindingSiteOrigin` in configuration matches real data

**Issue: Wrong energy ranges**
- **Check:** Default isovalues match real data ranges
- **Check:** Grid data values are in expected units (kcal/mol)

**Issue: Volume rendering fails**
- **Check:** Grid dimensions are correct (nx × ny × nz = data points)
- **Check:** Data format matches expected structure

#### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debug-fragmaps', 'true');
```

### 7. Performance Optimization

For large real SILCS datasets:

1. **Grid Sampling:** Adjust `gridSampleRate` in configuration
2. **LOD Settings:** Modify level-of-detail parameters in `volumeRenderer.js`
3. **Caching:** Enable browser caching for large FragMap files

### 8. Production Deployment

1. **File Compression:** Compress large FragMap files (gzip)
2. **CDN Hosting:** Consider hosting large files on CDN
3. **Lazy Loading:** Implement lazy loading for multiple FragMaps

## Code Architecture

### Key Components

1. **`fragMapLoader.js`** - Handles file loading and format detection
2. **`volumeRenderer.js`** - Manages Mol* volume rendering
3. **`fragMapParser.js`** - Parses different file formats
4. **`fragMapTypes.js`** - Configuration and defaults

### Integration Points

- **`InteractiveViewer.jsx`** - Main component orchestrates loading
- **`FragMapManager.jsx`** - Manages FragMap state and lifecycle
- **`FragMapToggles.jsx`** - UI controls for FragMap interaction

### Data Flow

```
File URL → fragMapLoader → fragMapParser → volumeRenderer → Mol* Viewer
```

## Support

For integration issues:
1. Check browser console for error messages
2. Verify file formats match specifications
3. Test with provided sample files first
4. Review this guide for configuration steps

The system is designed to be robust and will gracefully fall back to test data if real SILCS files are not available or have issues.
