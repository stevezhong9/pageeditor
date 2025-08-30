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
    const { page } = request.query;
    
    if (!page) {
      return response.status(400).json({ error: 'Page name is required' });
    }

    console.log('🔍 Viewing page:', page);

    // Try to fetch the page from Vercel Blob
    try {
      const blobUrl = `https://6z6u45xehitjnmgg.public.blob.vercel-storage.com/pages/${page}/index.html`;
      console.log('🌐 Fetching from blob:', blobUrl);

      const pageResponse = await fetch(blobUrl);
      
      if (pageResponse.ok) {
        const htmlContent = await pageResponse.text();
        
        // Set proper headers for HTML content display
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Cache-Control', 'public, max-age=3600');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Content-Disposition', 'inline');
        
        console.log('✅ Page served successfully:', page);
        return response.status(200).send(htmlContent);
      } else {
        console.log('❌ Page not found in blob:', pageResponse.status);
        
        // Return a nice 404 page
        const notFoundHtml = `
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>页面不存在</title>
              <style>
                  body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      text-align: center;
                  }
                  .container {
                      padding: 2rem;
                      border-radius: 12px;
                      background: rgba(255, 255, 255, 0.1);
                      backdrop-filter: blur(10px);
                      max-width: 500px;
                  }
                  .error-code {
                      font-size: 4rem;
                      font-weight: bold;
                      margin-bottom: 1rem;
                      opacity: 0.8;
                  }
                  a {
                      color: white;
                      text-decoration: underline;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="error-code">404</div>
                  <h2>页面不存在</h2>
                  <p>找不到页面 "${page}"，它可能已被删除或从未创建。</p>
                  <p><a href="https://pageeditor.sharetox.com">返回 PageEditor</a></p>
              </div>
          </body>
          </html>
        `;
        
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        return response.status(404).send(notFoundHtml);
      }
      
    } catch (fetchError) {
      console.error('❌ Error fetching page from blob:', fetchError);
      
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>加载错误</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    text-align: center;
                }
                .container {
                    padding: 2rem;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    max-width: 500px;
                }
                a {
                    color: white;
                    text-decoration: underline;
                }
                button {
                    background: white;
                    color: #ef4444;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    margin: 0.5rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚠️ 加载失败</h2>
                <p>无法加载页面内容，请稍后重试。</p>
                <p><button onclick="window.location.reload()">重新加载</button></p>
                <p><a href="https://pageeditor.sharetox.com">返回 PageEditor</a></p>
            </div>
        </body>
        </html>
      `;
      
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      return response.status(500).send(errorHtml);
    }

  } catch (error) {
    console.error('❌ View page error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while loading the page.'
    });
  }
}