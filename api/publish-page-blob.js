import { put, list, del } from '@vercel/blob';

// Check if Blob is properly configured
function checkBlobConfiguration() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured. Please set up Vercel Blob Storage.');
  }
  return true;
}

export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // Check Blob configuration first
    checkBlobConfiguration();
    
    console.log('📥 Blob publish request:', request.method);

    if (request.method === 'POST') {
      return await handlePublish(request, response);
    } else if (request.method === 'GET') {
      return await handleListPages(request, response);
    } else if (request.method === 'DELETE') {
      return await handleDeletePage(request, response);
    } else {
      return response.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Blob publish error:', error);
    return response.status(500).json({
      error: 'Failed to process request: ' + error.message
    });
  }
}

/**
 * Handle page publishing to Vercel Blob
 */
async function handlePublish(request, response) {
  const { pageName, files } = request.body || {};

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

  console.log('🚀 Publishing page to Vercel Blob:', pageName);

  // Check if page already exists
  const existingPages = await list({ prefix: `pages/${pageName}/` });
  if (existingPages.blobs.length > 0) {
    return response.status(409).json({ 
      error: `Page "${pageName}" already exists` 
    });
  }

  const createdFiles = [];
  const fileUrls = {};

  // Upload files to Vercel Blob
  for (const [filePath, content] of Object.entries(files)) {
    try {
      const blobPath = `pages/${filePath}`;
      
      // Determine content type
      let contentType = 'text/plain';
      if (filePath.endsWith('.html')) {
        contentType = 'text/html; charset=utf-8';
      } else if (filePath.endsWith('.css')) {
        contentType = 'text/css; charset=utf-8';
      } else if (filePath.endsWith('.js')) {
        contentType = 'application/javascript; charset=utf-8';
      } else if (filePath.endsWith('.json')) {
        contentType = 'application/json; charset=utf-8';
      }

      // Upload to Vercel Blob
      const blob = await put(blobPath, content, {
        access: 'public',
        contentType: contentType,
        addRandomSuffix: false // Keep consistent file names
      });

      createdFiles.push(filePath);
      fileUrls[filePath] = blob.url;
      
      console.log(`✅ Uploaded: ${blobPath} -> ${blob.url}`);

    } catch (fileError) {
      console.error(`❌ Failed to upload ${filePath}:`, fileError);
      
      // Clean up any files that were already uploaded
      for (const uploadedFile of createdFiles) {
        try {
          await del(fileUrls[uploadedFile]);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }
      
      throw new Error(`Failed to upload ${filePath}: ${fileError.message}`);
    }
  }

  // Create page metadata
  const pageMetadata = {
    name: pageName,
    createdAt: new Date().toISOString(),
    files: createdFiles,
    urls: fileUrls,
    mainUrl: fileUrls[`${pageName}/index.html`] || null
  };

  // Store metadata
  await put(`pages/${pageName}/metadata.json`, JSON.stringify(pageMetadata, null, 2), {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
    addRandomSuffix: false
  });

  console.log(`🎉 Page "${pageName}" published successfully with ${createdFiles.length} files`);

  return response.status(200).json({
    success: true,
    message: `Page "${pageName}" published successfully`,
    pageName,
    url: pageMetadata.mainUrl,
    files: createdFiles,
    urls: fileUrls
  });
}

/**
 * Handle listing published pages
 */
async function handleListPages(request, response) {
  try {
    // List all metadata files
    const metadataBlobs = await list({ prefix: 'pages/', mode: 'folded' });
    
    const pages = [];
    
    for (const blob of metadataBlobs.blobs) {
      if (blob.pathname.endsWith('/metadata.json')) {
        try {
          // Fetch metadata
          const metadataResponse = await fetch(blob.url);
          const metadata = await metadataResponse.json();
          
          pages.push({
            name: metadata.name,
            url: metadata.mainUrl,
            createdAt: metadata.createdAt,
            fileCount: metadata.files?.length || 0
          });
        } catch (error) {
          console.error('Error reading metadata for', blob.pathname, error);
        }
      }
    }

    // Sort by creation date (newest first)
    pages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return response.status(200).json({
      success: true,
      pages: pages.map(p => p.name),
      details: pages
    });

  } catch (error) {
    console.error('Error listing pages:', error);
    return response.status(500).json({
      error: 'Failed to list pages: ' + error.message
    });
  }
}

/**
 * Handle page deletion
 */
async function handleDeletePage(request, response) {
  const { pageName } = request.query;

  if (!pageName) {
    return response.status(400).json({ error: 'Page name is required' });
  }

  try {
    // List all files for this page
    const pageBlobs = await list({ prefix: `pages/${pageName}/` });
    
    if (pageBlobs.blobs.length === 0) {
      return response.status(404).json({ error: 'Page not found' });
    }

    // Delete all files
    const deletedFiles = [];
    for (const blob of pageBlobs.blobs) {
      try {
        await del(blob.url);
        deletedFiles.push(blob.pathname);
        console.log(`🗑️ Deleted: ${blob.pathname}`);
      } catch (deleteError) {
        console.error(`Failed to delete ${blob.pathname}:`, deleteError);
      }
    }

    return response.status(200).json({
      success: true,
      message: `Page "${pageName}" deleted successfully`,
      deletedFiles: deletedFiles.length
    });

  } catch (error) {
    console.error('Error deleting page:', error);
    return response.status(500).json({
      error: 'Failed to delete page: ' + error.message
    });
  }
}