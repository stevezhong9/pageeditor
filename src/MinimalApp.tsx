import React from 'react';

export default function MinimalApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: 'blue' }}>✅ React App is Working!</h1>
      <p>If you can see this, the React application is loading correctly.</p>
      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '5px', marginTop: '20px' }}>
        <h2>JSON Patch Demo</h2>
        <p>This demonstrates the core concept:</p>
        <ol>
          <li>User inputs modification request</li>
          <li>AI generates JSON Patch operations</li>
          <li>Patches are applied incrementally</li>
          <li>UI renders updates in real-time</li>
        </ol>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Try These Links:</h3>
        <ul>
          <li><a href="/?app=simple" style={{ color: 'green' }}>Simple Demo (Recommended)</a></li>
          <li><a href="/?app=test">Test App</a></li>
          <li><a href="/">Full Editor</a></li>
        </ul>
      </div>
    </div>
  );
}