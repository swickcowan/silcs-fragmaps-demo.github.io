import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Overview from './components/Overview';
import InteractiveViewer from './components/InteractiveViewer';
import { ViewerProvider } from './context/ViewerContext';

/**
 * Main Application Component
 * Handles routing between overview and interactive viewer sections
 * Manages hash-based navigation for single-page application behavior
 */
const App = () => {
  const [currentSection, setCurrentSection] = useState('overview');

  /**
   * Handles navigation between different sections
   * @param {string} section - Target section ('overview' or 'interactive')
   */
  const handleNavigate = (section) => {
    setCurrentSection(section);
  };

  /**
   * Handles hash changes for browser navigation and deep linking
   * Updates the current section based on URL hash
   */
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'interactive') {
        handleNavigate('interactive');
      } else {
        handleNavigate('overview');
      }
    };

    handleHashChange(); // Check initial hash
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-molstar-bg">
      {/* Navigation */}
      <Navbar 
        currentSection={currentSection}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      {currentSection === 'overview' ? (
        <div className="min-h-screen pt-16">
          <Overview />
        </div>
      ) : (
        <div className="min-h-screen pt-16">
          <ViewerProvider>
            <InteractiveViewer />
          </ViewerProvider>
        </div>
      )}

      {/* Background gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      </div>
    </div>
  );
};

export default App;
