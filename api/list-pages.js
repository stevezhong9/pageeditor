const fs = require('fs');
const path = require('path');

module.exports = async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      return response.status(200).json({ pages: [] });
    }

    // Get all directories in public folder
    const items = fs.readdirSync(publicDir, { withFileTypes: true });
    const pages = [];

    for (const item of items) {
      if (item.isDirectory()) {
        const pageName = item.name;
        const pageDir = path.join(publicDir, pageName);
        const indexPath = path.join(pageDir, 'index.html');
        const infoPath = path.join(pageDir, 'page-info.json');
        
        // Check if it's a valid page (has index.html)
        if (fs.existsSync(indexPath)) {
          let pageInfo = { name: pageName };
          
          // Try to read page info
          if (fs.existsSync(infoPath)) {
            try {
              const infoContent = fs.readFileSync(infoPath, 'utf8');
              pageInfo = JSON.parse(infoContent);
            } catch (error) {
              console.log(`Could not read page info for ${pageName}:`, error.message);
            }
          }
          
          pages.push({
            name: pageName,
            url: `/${pageName}`,
            title: pageInfo.title || pageName,
            createdAt: pageInfo.createdAt || null
          });
        }
      }
    }

    // Sort by creation date (newest first)
    pages.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return response.status(200).json({ 
      pages: pages.map(p => p.name),
      details: pages
    });

  } catch (error) {
    console.error('❌ List pages error:', error);
    return response.status(500).json({
      error: 'Failed to list pages: ' + error.message
    });
  }
}