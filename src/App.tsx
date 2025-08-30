import React from 'react';
import { usePageStore } from './stores/pageStore';
import { Toolbar } from './components/ui/Toolbar';
import { ChatEditor } from './components/editor/ChatEditor';
import { JsonEditor } from './components/editor/JsonEditor';
import { VersionHistory } from './components/editor/VersionHistory';
import { PageRenderer } from './components/layout/PageRenderer';

function App() {
  const { 
    layout, 
    brandConfig, 
    showJsonEditor, 
    showVersionHistory 
  } = usePageStore();

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Top Toolbar */}
      <Toolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Editor Panel */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {showVersionHistory ? (
            <VersionHistory />
          ) : showJsonEditor ? (
            <JsonEditor />
          ) : (
            <ChatEditor />
          )}
        </div>
        
        {/* Right Preview Panel */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <PageRenderer 
              layout={layout} 
              brandConfig={brandConfig} 
            />
          </div>
          
          {/* Preview Controls */}
          <div className="fixed bottom-6 right-6">
            <PreviewControls />
          </div>
        </div>
      </div>
    </div>
  );
}

// Preview Controls Component
const PreviewControls: React.FC = () => {
  const [viewportSize, setViewportSize] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-600">Preview:</span>
        
        <button
          onClick={() => setViewportSize('desktop')}
          className={`px-2 py-1 text-xs rounded ${
            viewportSize === 'desktop' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Desktop
        </button>
        
        <button
          onClick={() => setViewportSize('tablet')}
          className={`px-2 py-1 text-xs rounded ${
            viewportSize === 'tablet' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tablet
        </button>
        
        <button
          onClick={() => setViewportSize('mobile')}
          className={`px-2 py-1 text-xs rounded ${
            viewportSize === 'mobile' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Mobile
        </button>
      </div>
    </div>
  );
};

export default App;