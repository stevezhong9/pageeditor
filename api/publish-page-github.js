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
    console.log('📥 GitHub publish request received');
    
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

    // GitHub repository details
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = 'stevezhong9';
    const REPO_NAME = 'pageeditor';
    
    if (!GITHUB_TOKEN) {
      return response.status(500).json({
        error: 'GitHub token not configured'
      });
    }

    console.log('🔧 Creating files via GitHub API...');

    // Create files in the repository
    const createdFiles = [];
    
    for (const [filePath, content] of Object.entries(files)) {
      const githubPath = `public/${filePath}`;
      
      try {
        // Create file via GitHub API
        const githubResponse = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${githubPath}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
              message: `Add page: ${pageName} - ${filePath}`,
              content: Buffer.from(content).toString('base64'),
              committer: {
                name: 'PageEditor',
                email: 'noreply@pageeditor.com'
              }
            })
          }
        );

        if (!githubResponse.ok) {
          const errorData = await githubResponse.json();
          if (githubResponse.status === 422 && errorData.message?.includes('already exists')) {
            return response.status(409).json({ 
              error: `Page "${pageName}" already exists` 
            });
          }
          throw new Error(`GitHub API error: ${githubResponse.status} ${errorData.message}`);
        }

        createdFiles.push(filePath);
        console.log(`✅ Created: ${githubPath}`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (fileError) {
        console.error(`❌ Failed to create ${githubPath}:`, fileError);
        throw fileError;
      }
    }

    console.log(`🎉 Page "${pageName}" published successfully with ${createdFiles.length} files`);

    return response.status(200).json({
      success: true,
      message: `Page "${pageName}" published successfully`,
      pageName,
      url: `/${pageName}`,
      files: createdFiles
    });

  } catch (error) {
    console.error('❌ GitHub publish error:', error);
    return response.status(500).json({
      error: 'Failed to publish page: ' + error.message
    });
  }
}