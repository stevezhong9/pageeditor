const fs = require('fs');
const path = require('path');

module.exports = async function handler(request, response) {
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
    const { pageName, files } = request.body;

    // Validate input
    if (!pageName || !files || typeof files !== 'object') {
      return response.status(400).json({ 
        error: 'Invalid request data: pageName and files are required' 
      });
    }

    // Validate page name
    const pageNameRegex = /^[a-zA-Z][a-zA-Z0-9_-]{1,29}$/;
    if (!pageNameRegex.test(pageName)) {
      return response.status(400).json({ 
        error: 'Invalid page name: must start with letter and contain only letters, numbers, hyphens, and underscores' 
      });
    }

    // Create directory in public folder
    const publicDir = path.join(process.cwd(), 'public');
    const pageDir = path.join(publicDir, pageName);

    // Check if directory already exists
    if (fs.existsSync(pageDir)) {
      return response.status(409).json({ 
        error: `Page "${pageName}" already exists` 
      });
    }

    // Create page directory
    fs.mkdirSync(pageDir, { recursive: true });

    // Write files
    const createdFiles = [];
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(publicDir, filePath);
      const fileDir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(fullPath, content, 'utf8');
      createdFiles.push(filePath);
    }

    console.log(`✅ Page "${pageName}" published successfully with ${createdFiles.length} files`);

    return response.status(200).json({
      success: true,
      message: `Page "${pageName}" published successfully`,
      pageName,
      url: `/${pageName}`,
      files: createdFiles
    });

  } catch (error) {
    console.error('❌ Publish page error:', error);
    return response.status(500).json({
      error: 'Failed to publish page: ' + error.message
    });
  }
}