import React from 'react';
import ReactDOM from 'react-dom/client';
import WorkingApp from './WorkingApp';
import ClaudeApp from './ClaudeApp';
import './index.css';

// Route based on URL parameter
const urlParams = new URLSearchParams(window.location.search);
const appType = urlParams.get('app') || 'claude'; // Default to Claude app

let AppComponent = ClaudeApp; // Default to Claude integrated app

if (appType === 'basic') {
  AppComponent = WorkingApp;
} else if (appType === 'claude') {
  AppComponent = ClaudeApp;
}

console.log('Loading app type:', appType);

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppComponent />
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} else {
  console.error('Root element not found');
}