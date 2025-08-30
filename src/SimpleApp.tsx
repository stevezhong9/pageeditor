import React, { useState } from 'react';
import { applyPatch } from 'fast-json-patch';

// Simple demo without complex state management
function SimpleApp() {
  const [layout, setLayout] = useState({
    hero: {
      headline: "Revolutionary Skincare Experience",
      subhead: "Using unique scientific formula for professional care",
      cta: "Try Now",
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800"
    },
    usps: [
      { icon: "✨", text: "7-day visible improvement" },
      { icon: "🧪", text: "Scientific formula, safe and gentle" },
      { icon: "🏆", text: "Trusted by 100k+ users" }
    ]
  });

  const [patchInput, setPatchInput] = useState('');

  const applyJsonPatch = () => {
    try {
      const patches = JSON.parse(patchInput);
      const result = applyPatch({ ...layout }, patches);
      setLayout(result.newDocument);
      setPatchInput('');
    } catch (error) {
      alert('Invalid patch format: ' + (error as Error).message);
    }
  };

  const examplePatches = [
    {
      name: "Change headline",
      patch: `[{"op":"replace","path":"/hero/headline","value":"🌟 AI-Powered Beauty Revolution"}]`
    },
    {
      name: "Add USP",
      patch: `[{"op":"add","path":"/usps/-","value":{"icon":"🌱","text":"100% Eco-friendly packaging"}}]`
    },
    {
      name: "Update CTA",
      patch: `[{"op":"replace","path":"/hero/cta","value":"Buy Now"}]`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            JSON Patch Landing Page Editor
          </h1>
          <p className="text-gray-600 mt-1">
            Demonstrate "Continuous Chat Editing → Patch → Incremental Rendering"
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left: Patch Editor */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">JSON Patch Editor</h2>
              
              {/* Example patches */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Examples:</h3>
                <div className="space-y-2">
                  {examplePatches.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setPatchInput(example.patch)}
                      className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border"
                    >
                      {example.name}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={patchInput}
                onChange={(e) => setPatchInput(e.target.value)}
                placeholder='Enter JSON Patch array, e.g.: [{"op":"replace","path":"/hero/headline","value":"New Title"}]'
                className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
              />
              
              <button
                onClick={applyJsonPatch}
                disabled={!patchInput.trim()}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply Patch
              </button>
            </div>

            {/* Current JSON */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-3">Current Page JSON</h3>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(layout, null, 2)}
              </pre>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h2 className="text-lg font-semibold">Live Preview</h2>
            </div>
            
            <div className="p-6">
              {/* Hero Section */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {layout.hero.headline}
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  {layout.hero.subhead}
                </p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                  {layout.hero.cta}
                </button>
              </div>

              {/* Hero Image */}
              <div className="mb-8">
                <img
                  src={layout.hero.image}
                  alt="Product"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

              {/* USPs */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Key Benefits</h2>
                {layout.usps.map((usp, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">{usp.icon}</span>
                    <span className="text-gray-700">{usp.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleApp;