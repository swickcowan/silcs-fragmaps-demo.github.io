# SILCS FragMaps Interactive Demo

A pixel-accurate, scientifically correct interactive visualization demo for P38 MAP Kinase (PDB: 3FLY) using SILCS FragMaps. This project demonstrates the integration of molecular visualization with SILCS (Site Identification by Ligand Competitive Saturation) methodology for ligand binding analysis.

## 🎯 Project Overview

This interactive demo provides a comprehensive exploration of P38 MAP Kinase with SILCS FragMaps, enabling users to understand how different molecular interactions contribute to ligand binding. The application runs entirely client-side using modern web technologies.

### Key Features

- **3D Molecular Visualization**: Interactive 3Dmol.js viewer with protein and ligand rendering
- **SILCS FragMaps**: Toggle multiple FragMap types (hydrophobic, H-bond donors/acceptors, electrostatic, aromatic)
- **Ligand Comparison**: Switch between crystal ligand and SILCS-MC refined poses
- **Dynamic Controls**: Adjustable isovalues for FragMap surface rendering
- **Scientific Narrative**: Guided exploration with contextual information
- **Responsive Design**: Modern UI with Tailwind CSS and Framer Motion animations

## 🧬 Scientific Background

### P38 MAP Kinase

P38 MAP Kinase is a crucial signaling protein involved in cellular stress responses and inflammation pathways. As a member of the mitogen-activated protein kinase family, it regulates essential processes including:

- Cell proliferation and differentiation
- Apoptosis (programmed cell death)
- Inflammatory responses
- Stress adaptation

The protein structure (PDB: 3FLY) showcases the characteristic bilobal kinase architecture, with the ATP-binding site strategically positioned between the N- and C-terminal lobes.

### SILCS FragMaps

SILCS (Site Identification by Ligand Competitive Saturation) FragMaps provide three-dimensional maps of favorable interaction sites within protein binding pockets. These maps are generated through:

1. **Molecular Dynamics Simulations**: System explores protein conformational space
2. **Fragment Competition**: Small organic fragments compete for binding sites
3. **Statistical Analysis**: Favorable interaction regions are identified and quantified

Each colored region represents energetically favorable locations for specific types of molecular interactions.

### FragMap Types

| Type | Color | Description |
|------|-------|-------------|
| Hydrophobic | Yellow | Favorable regions for non-polar groups |
| H-Bond Donor | Blue | Favorable regions for hydrogen bond donors |
| H-Bond Acceptor | Red | Favorable regions for hydrogen bond acceptors |
| Positive Ion | Green | Favorable regions for positively charged groups |
| Negative Ion | Purple | Favorable regions for negatively charged groups |
| Aromatic | Orange | Favorable regions for aromatic interactions |

## 🛠️ Technology Stack

### Frontend (Client-Side Only)

- **React.js** (v18) - Component-based UI framework
- **Vite** - Fast development server and build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **3Dmol.js** - Scientific molecular visualization library
- **Three.js** - 3D graphics rendering (3Dmol.js dependency)

### Development Tools

- **ESLint** - Code quality and consistency
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```
silcs-fragmaps-demo/
├── public/
│   └── assets/
│       ├── pdb/
│       │   └── 3FLY.pdb                 # P38 MAP Kinase structure
│       ├── ligands/
│       │   ├── crystal_ligand.sdf       # Crystal structure ligand
│       │   ├── silcs_mc_pose_1.sdf      # SILCS-MC refined pose 1
│       │   └── silcs_mc_pose_2.sdf      # SILCS-MC refined pose 2
│       └── fragmaps/
│           ├── hydrophobic.map          # Hydrophobic FragMap
│           ├── hbond-donor.map          # H-bond donor FragMap
│           ├── hbond-acceptor.map       # H-bond acceptor FragMap
│           ├── positive.map             # Positive ion FragMap
│           ├── negative.map             # Negative ion FragMap
│           └── aromatic.map             # Aromatic FragMap
├── src/
│   ├── components/
│   │   ├── Navbar.jsx                   # Navigation component
│   │   ├── Overview.jsx                 # Introduction page
│   │   ├── InteractiveViewer.jsx        # Main molecular viewer
│   │   ├── ViewerControls.jsx           # Viewer manipulation controls
│   │   ├── FragMapToggles.jsx           # FragMap visibility controls
│   │   ├── LigandSelector.jsx           # Ligand selection interface
│   │   ├── IsoValueSlider.jsx           # Isovalue adjustment slider
│   │   └── CaptionPanel.jsx             # Information and legend panel
│   ├── hooks/
│   │   └── useScrollNarrative.js        # Scroll-driven narrative hook
│   ├── data/
│   │   └── narrativeSteps.js            # Scientific narrative content
│   ├── App.jsx                          # Main application component
│   ├── main.jsx                         # Application entry point
│   └── index.css                        # Global styles and Tailwind
├── package.json                         # Dependencies and scripts
├── vite.config.js                       # Vite configuration
├── tailwind.config.js                   # Tailwind CSS configuration
├── postcss.config.js                    # PostCSS configuration
└── README.md                            # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd silcs-fragmaps-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

### Preview Production Build

```bash
npm run preview
```

## 🎮 Usage Guide

### Overview Page

- **Scientific Introduction**: Learn about P38 MAP Kinase and SILCS methodology
- **Interactive Features Preview**: Understand available exploration tools
- **Navigation**: Click "Launch Interactive Demo" to proceed

### Interactive Viewer

#### Molecular Viewer Controls

- **Rotate**: Left-click and drag
- **Zoom**: Scroll wheel
- **Pan**: Right-click and drag
- **Reset View**: Click "Reset View" button
- **Toggle Spin**: Enable/disable automatic rotation

#### FragMap Controls

- **Toggle Individual Maps**: Click on FragMap types to show/hide
- **Adjust Isovalues**: Use sliders to control surface threshold
- **Quick Actions**: "Show All" or "Hide All" for bulk operations
- **Color Legend**: Reference panel for map interpretation

#### Ligand Selection

- **Crystal Ligand**: Original ligand from X-ray structure
- **SILCS-MC Poses**: Refined ligand conformations from SILCS sampling
- **Visual Comparison**: Switch between poses to understand binding flexibility

#### Information Panel

- **Current View**: Real-time description of active visualizations
- **Scientific Context**: Background information on displayed elements
- **Color Legend**: Visual reference for FragMap interpretation
- **Exploration Tips**: Guidance for effective analysis

## 🔬 Scientific Interpretation

### Analyzing Ligand-FragMap Alignment

1. **Hydrophobic Complementarity**: Look for alignment between ligand non-polar groups and yellow FragMap regions
2. **Hydrogen Bond Networks**: Identify matches between ligand donors/acceptors and blue/red FragMap areas
3. **Electrostatic Matching**: Observe alignment of charged groups with green/purple regions
4. **Aromatic Interactions**: Check for positioning of aromatic rings near orange FragMap zones

### Understanding Isovalues

- **Low Isovalues** (0.1-0.5): Show broader, less selective regions
- **Medium Isovalues** (1.0-1.5): Balance between coverage and specificity
- **High Isovalues** (2.0-3.0): Highlight only the most favorable interaction sites

### Comparative Analysis

- **Crystal vs SILCS-MC**: Compare how different ligand poses exploit FragMap regions
- **Binding Flexibility**: Observe which interactions are maintained across different poses
- **Optimization Opportunities**: Identify unexploited favorable regions for ligand improvement

## 🎨 Design Decisions

### UI/UX Philosophy

- **Scientific Credibility**: Clean, professional aesthetic suitable for scientific audiences
- **Clarity Over Decoration**: Minimal design that prioritizes information accessibility
- **Responsive Layout**: Adapts to different screen sizes while maintaining functionality
- **Smooth Interactions**: Subtle animations enhance user experience without distraction

### Technical Architecture

- **Client-Side Only**: No backend dependencies for easy deployment
- **Component-Based**: Modular React architecture for maintainability
- **Performance Optimized**: Efficient rendering and state management
- **Progressive Enhancement**: Core functionality works without advanced features

## ⚠️ Limitations

### Current Constraints

1. **Asset Dependencies**: Requires pre-computed FragMap files and ligand structures
2. **Browser Compatibility**: May have performance limitations on older browsers
3. **Memory Usage**: Large molecular structures can consume significant memory
4. **File Formats**: Limited to supported molecular file formats (PDB, SDF, MAP)

### Known Issues

- **Initial Loading**: First-time load may be slow due to Mol* library initialization
- **Mobile Interaction**: Touch controls for molecular viewing may be less precise
- **FragMap Rendering**: Complex surface rendering can impact performance on lower-end devices

## 🔮 Future Improvements

### Planned Enhancements

1. **Additional Protein Targets**: Support for multiple protein structures
2. **Advanced Analysis Tools**: Distance measurements, interaction calculations
3. **Export Capabilities**: Save custom views and analysis results
4. **Collaborative Features**: Share specific viewing configurations
5. **Educational Mode**: Guided tutorials and interactive lessons

### Technical Roadmap

- **Performance Optimization**: WebAssembly integration for faster computations
- **Offline Support**: Service worker for offline functionality
- **Accessibility**: Enhanced screen reader support and keyboard navigation
- **Internationalization**: Multi-language support for global accessibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

- Follow existing code style and conventions
- Ensure scientific accuracy in all content
- Test thoroughly across different browsers
- Document new features appropriately

## 📞 Support

For questions, issues, or suggestions:

1. Check existing [GitHub Issues](../../issues)
2. Create a new issue with detailed description
3. Include browser version and error messages if applicable

## 🙏 Acknowledgments

- **3Dmol.js** Development Team for the excellent molecular visualization library
- **SILCS Bio** for the scientific methodology and inspiration
- **PDB** for providing the 3FLY structure data
- **Open Source Community** for the tools and libraries that make this project possible

---

*This project serves as an educational and demonstration tool for SILCS methodology and molecular visualization. While scientifically accurate, it should not be used for actual drug discovery decisions without proper validation and expert oversight.*
