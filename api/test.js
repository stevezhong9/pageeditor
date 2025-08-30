// Simple test function for Vercel
module.exports = async function handler(req, res) {
  console.log('Test function called:', req.method, req.url);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    console.log('API Key exists:', !!apiKey);
    
    return res.status(200).json({ 
      success: true, 
      method: req.method,
      hasApiKey: !!apiKey,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ error: error.message });
  }
};