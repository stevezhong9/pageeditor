import React from 'react';

function TestApp() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Page Editor Demo
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Landing page editor with JSON Patch support
        </p>
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Test Page</h2>
          <p className="text-gray-600">
            If you can see this, the app is loading correctly!
          </p>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestApp;