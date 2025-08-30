// Vercel Serverless Function to proxy Claude API calls
module.exports = async function handler(req, res) {
  console.log('🚀 Claude API proxy called:', req.method, req.url);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📝 Request body:', req.body);
    
    const { messages, model = 'claude-3-sonnet-20240229', max_tokens = 1000 } = req.body;

    // Get API key from environment variable
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    console.log('🔑 API Key exists:', !!apiKey);
    console.log('🔑 API Key preview:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT_FOUND');
    
    if (!apiKey) {
      console.error('❌ Missing VITE_CLAUDE_API_KEY environment variable');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing API key',
        debug: 'VITE_CLAUDE_API_KEY not found in environment'
      });
    }

    console.log('📤 Making request to Claude API...');
    
    // Make request to Claude API  
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens,
        messages
      })
    });

    console.log('📥 Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Claude API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Claude API error: ${response.status} ${errorText}`,
        status: response.status,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Claude API success, response length:', JSON.stringify(data).length);
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('💥 Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error: ' + error.message,
      stack: error.stack
    });
  }
};