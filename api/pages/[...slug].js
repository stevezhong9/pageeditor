export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug } = request.query;
    
    if (!slug || !Array.isArray(slug)) {
      return response.status(400).json({ error: 'Invalid page path' });
    }

    // Reconstruct the page path
    const pagePath = slug.join('/');
    console.log('📄 Page path requested:', pagePath);
    
    // Expected format: pageName/index.html
    if (pagePath.endsWith('/index.html')) {
      const pageName = pagePath.replace('/index.html', '');
      
      if (!pageName) {
        return response.status(400).json({ error: 'Invalid page name' });
      }

      console.log('🔍 Looking for page:', pageName);

      // Try to fetch the page from Vercel Blob
      try {
        const blobUrl = `https://6z6u45xehitjnmgg.public.blob.vercel-storage.com/pages/${pageName}/index.html`;
        console.log('🌐 Fetching from blob:', blobUrl);

        const pageResponse = await fetch(blobUrl);
        
        if (pageResponse.ok) {
          const htmlContent = await pageResponse.text();
          
          // Set appropriate headers for HTML content
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          
          console.log('✅ Page served successfully:', pageName);
          return response.status(200).send(htmlContent);
        } else {
          console.log('❌ Page not found in blob:', pageResponse.status);
          return response.status(404).json({ 
            error: 'Page not found',
            message: `The page "${pageName}" does not exist or has been removed.`
          });
        }
        
      } catch (fetchError) {
        console.error('❌ Error fetching page from blob:', fetchError);
        return response.status(500).json({ 
          error: 'Failed to fetch page',
          message: 'Unable to retrieve the requested page from storage.'
        });
      }
    } else {
      return response.status(400).json({ 
        error: 'Invalid page format',
        message: 'Pages must be accessed with format: /pages/[pageName]/index.html'
      });
    }

  } catch (error) {
    console.error('❌ Page proxy error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while serving the page.'
    });
  }
}