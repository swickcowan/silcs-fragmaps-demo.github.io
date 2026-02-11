import React from 'react';
import { motion } from 'framer-motion';

const Overview = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-8 py-16">
      <motion.div 
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            SILCS FragMaps
          </h1>
          <h2 className="text-3xl md:text-4xl font-light text-gray-300 mb-6">
            P38 MAP Kinase Interactive Demo
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto rounded-full"></div>
        </motion.div>

        {/* Main Content */}
        <motion.div 
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Scientific Overview */}
          <motion.div 
            className="glass-morphism rounded-xl p-8"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-2xl font-semibold mb-4 text-blue-400">Scientific Overview</h3>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                <strong>P38 MAP Kinase</strong> is a crucial signaling protein that regulates cellular stress responses 
                and inflammation pathways. As a member of the mitogen-activated protein kinase family, it controls 
                essential processes including cell proliferation, differentiation, and apoptosis. The protein structure 
                (PDB: 3FLY) displayed here showcases the characteristic bilobal kinase architecture, with the ATP-binding 
                site strategically positioned between the N- and C-terminal lobes.
              </p>
              <p>
                <strong>SILCS FragMaps</strong> provide three-dimensional maps of favorable interaction sites within 
                protein binding pockets. Generated through molecular dynamics simulations with small organic fragments, 
                these maps reveal where different chemical functionalities preferentially bind. Each colored region represents 
                energetically favorable locations for specific types of molecular interactions—hydrophobic, hydrogen bonding, 
                electrostatic, and aromatic.
              </p>
            </div>
          </motion.div>

          {/* Interactive Demo Features */}
          <motion.div 
            className="glass-morphism rounded-xl p-8"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <h3 className="text-2xl font-semibold mb-4 text-purple-400">Interactive Exploration</h3>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                This interactive demo enables you to explore how ligand molecules interact with P38 MAP Kinase through 
                the lens of SILCS FragMaps. You can toggle different FragMap types to visualize hydrophobic regions, 
                hydrogen bond donors and acceptors, electrostatic hotspots, and aromatic interaction sites. By comparing 
                crystal ligand positions with SILCS-MC refined poses, you'll gain insights into the molecular determinants 
                of binding affinity and selectivity.
              </p>
              <p>
                The visualization demonstrates how ligand functional groups align with favorable FragMap regions, 
                providing a scientific basis for understanding structure-activity relationships and guiding rational 
                drug design decisions.
              </p>
            </div>
          </motion.div>

          {/* Key Features Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {[
              {
                title: "3D Molecular Viewer",
                description: "Interactive Mol* viewer with protein and ligand visualization",
                color: "from-blue-500 to-blue-600"
              },
              {
                title: "FragMap Overlays",
                description: "Toggle multiple FragMap types with adjustable isovalues",
                color: "from-purple-500 to-purple-600"
              },
              {
                title: "Scientific Narrative",
                description: "Guided exploration with scroll-driven storytelling",
                color: "from-pink-500 to-pink-600"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="glass-morphism rounded-lg p-6 text-center"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={index === 0 ? "M13 10V3L4 14h7v7l9-11h-7z" : 
                          index === 1 ? "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" :
                          "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"} />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-2 text-white">{feature.title}</h4>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Call to Action */}
          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={() => window.location.hash = '#interactive'}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Launch Interactive Demo
            </motion.button>
            <p className="mt-4 text-gray-400 text-sm">
              Scroll down or click above to begin exploring
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Overview;
