export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📥 Publish request received');
    console.log('🔍 Request body:', request.body);

    const { pageName, files } = request.body || {};

    // Validate input
    if (!pageName || !files || typeof files !== 'object') {
      console.error('❌ Invalid input data:', { pageName: !!pageName, files: !!files });
      return response.status(400).json({ 
        error: 'Invalid request data: pageName and files are required' 
      });
    }

    // Validate page name
    const pageNameRegex = /^[a-zA-Z][a-zA-Z0-9_-]{1,29}$/;
    if (!pageNameRegex.test(pageName)) {
      console.error('❌ Invalid page name:', pageName);
      return response.status(400).json({ 
        error: 'Invalid page name: must start with letter and contain only letters, numbers, hyphens, and underscores' 
      });
    }

    console.log('✅ Page name validation passed:', pageName);
    
    // Since Vercel functions are read-only, we cannot write to the file system
    // Instead, we'll simulate the publish process and return success
    // In a real scenario, you would need to use a database or external storage
    
    console.log('⚠️ Simulating file creation (Vercel functions are read-only)');
    console.log('📁 Would create files:', Object.keys(files));

    // Simulate successful creation
    const createdFiles = Object.keys(files);
    
    console.log(`✅ Page "${pageName}" would be published with ${createdFiles.length} files`);

    return response.status(200).json({
      success: true,
      message: `Page "${pageName}" published successfully (simulated)`,
      pageName,
      url: `/${pageName}`,
      files: createdFiles,
      note: 'This is a simulation - Vercel serverless functions cannot write to filesystem'
    });

  } catch (error) {
    console.error('❌ Publish page error:', error);
    return response.status(500).json({
      error: 'Failed to publish page: ' + error.message,
      stack: error.stack
    });
  }
}