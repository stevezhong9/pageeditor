import React, { useState } from 'react';
import { applyPatch } from 'fast-json-patch';

// Working React version based on the successful HTML demo
function WorkingApp() {
  const [pageData, setPageData] = useState({
    hero: {
      headline: "Revolutionary Skincare Experience",
      subhead: "Using unique scientific formula for professional care",
      cta: "Try Now",
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=400&fit=crop"
    },
    usps: [
      { icon: "✨", text: "7-day visible improvement" },
      { icon: "🧪", text: "Scientific formula, safe and gentle" },
      { icon: "🏆", text: "Trusted by 100k+ users" }
    ]
  });

  const [patchInput, setPatchInput] = useState('');
  const [error, setError] = useState('');

  const examples = [
    {
      name: "Change headline",
      patch: [{"op":"replace","path":"/hero/headline","value":"🌟 AI-Powered Beauty Revolution"}]
    },
    {
      name: "Add USP",
      patch: [{"op":"add","path":"/usps/-","value":{"icon":"🌱","text":"100% Eco-friendly packaging"}}]
    },
    {
      name: "Update CTA",
      patch: [{"op":"replace","path":"/hero/cta","value":"Buy Now"}]
    },
    {
      name: "Change subhead",
      patch: [{"op":"replace","path":"/hero/subhead","value":"Revolutionary skincare powered by AI technology"}]
    }
  ];

  const loadExample = (patch: any[]) => {
    setPatchInput(JSON.stringify(patch, null, 2));
    setError('');
  };

  const applyJsonPatch = () => {
    if (!patchInput.trim()) {
      setError('Please enter a JSON patch');
      return;
    }

    try {
      const patches = JSON.parse(patchInput);
      console.log('Applying patches:', patches);
      
      const result = applyPatch({ ...pageData }, patches);
      setPageData(result.newDocument);
      
      setPatchInput('');
      setError('');
      
      console.log('Patch applied successfully');
    } catch (err) {
      setError('Invalid JSON patch: ' + (err as Error).message);
      console.error('Patch error:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      applyJsonPatch();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0', 
        padding: '1rem 2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', color: '#1f2937', margin: 0 }}>
          JSON Patch Landing Page Editor (React Version)
        </h1>
        <p style={{ color: '#6b7280', marginTop: '0.5rem', margin: 0 }}>
          Demonstrate "Continuous Chat Editing → Patch → Incremental Rendering"
        </p>
      </header>

      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem', 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
        gap: '2rem' 
      }}>
        
        {/* Left Panel: Patch Editor */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: '#f1f5f9', 
            padding: '1rem', 
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600
          }}>
            JSON Patch Editor
          </div>
          
          <div style={{ padding: '1rem' }}>
            {/* Quick Examples */}
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Quick Examples:
              </h3>
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => loadExample(example.patch)}
                  style={{
                    background: '#64748b',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    margin: '0.25rem 0',
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    fontSize: '0.875rem'
                  }}
                  onMouseOver={(e) => (e.target as HTMLElement).style.background = '#475569'}
                  onMouseOut={(e) => (e.target as HTMLElement).style.background = '#64748b'}
                >
                  {example.name}
                </button>
              ))}
            </div>

            {/* Patch Input */}
            <textarea
              value={patchInput}
              onChange={(e) => setPatchInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder='Enter JSON Patch array, e.g.: [{"op":"replace","path":"/hero/headline","value":"New Title"}]'
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'Monaco, monospace',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
            
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={applyJsonPatch}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginRight: '0.5rem'
                }}
              >
                Apply Patch
              </button>
              <button
                onClick={() => { setPatchInput(''); setError(''); }}
                style={{
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                color: '#dc2626',
                background: '#fef2f2',
                padding: '0.75rem',
                borderRadius: '6px',
                margin: '1rem 0',
                border: '1px solid #fecaca'
              }}>
                ❌ {error}
              </div>
            )}

            {/* Current JSON Display */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Current Page JSON:
              </h3>
              <pre style={{
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '300px',
                border: '1px solid #e2e8f0',
                whiteSpace: 'pre-wrap'
              }}>
                {JSON.stringify(pageData, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: '#f1f5f9', 
            padding: '1rem', 
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600
          }}>
            Live Preview
          </div>
          
          <div style={{ padding: '1rem' }}>
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                {pageData.hero.headline}
              </h1>
              <p style={{ 
                fontSize: '1.125rem', 
                color: '#6b7280',
                marginBottom: '1.5rem'
              }}>
                {pageData.hero.subhead}
              </p>
              <button style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                {pageData.hero.cta}
              </button>
              <img
                src={pageData.hero.image}
                alt="Product"
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  margin: '1rem 0'
                }}
              />
            </div>

            {/* USPs */}
            <div>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                marginBottom: '1rem' 
              }}>
                Key Benefits
              </h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {pageData.usps.map((usp, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{
                      fontSize: '1.5rem',
                      width: '2.5rem',
                      height: '2.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#e0e7ff',
                      borderRadius: '50%'
                    }}>
                      {usp.icon}
                    </div>
                    <div>{usp.text}</div>
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

export default WorkingApp;