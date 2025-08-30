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
    const { messages, model = 'claude-3-5-sonnet-20241022', max_tokens = 1000 } = request.body;
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    
    if (!apiKey) {
      return response.status(500).json({ 
        error: 'Server configuration error: Missing API key'
      });
    }
    
    // Make request to Claude API  
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      return response.status(claudeResponse.status).json({ 
        error: `Claude API error: ${claudeResponse.status} ${errorText}`
      });
    }

    const data = await claudeResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    return response.status(500).json({ 
      error: 'Internal server error: ' + error.message
    });
  }
}