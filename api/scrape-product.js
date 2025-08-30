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
    console.log('📥 Scrape product request received');
    
    const { url } = request.body || {};

    // Validate input
    if (!url) {
      return response.status(400).json({ 
        error: '网址不能为空' 
      });
    }

    // Validate URL format
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (error) {
      return response.status(400).json({ 
        error: 'URL格式不正确，请输入完整的网址（包含http://或https://）' 
      });
    }

    console.log('🔍 Scraping URL:', targetUrl.href);

    // Fetch the webpage content
    const fetchResponse = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    });

    if (!fetchResponse.ok) {
      throw new Error(`无法访问网页: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const html = await fetchResponse.text();
    console.log('📄 HTML content length:', html.length);

    // Extract basic information from HTML
    const extractedInfo = extractProductInfo(html, targetUrl.href);
    
    // Use Claude API to analyze and generate page data
    const pageData = await generatePageDataWithAI(extractedInfo, targetUrl.href);

    console.log('✅ Product extraction successful');

    return response.status(200).json({
      success: true,
      pageData,
      extractedInfo,
      message: '商品信息提取成功'
    });

  } catch (error) {
    console.error('❌ Scrape product error:', error);
    return response.status(500).json({
      error: 'Failed to scrape product: ' + error.message
    });
  }
}

/**
 * Extract product information from HTML content
 */
function extractProductInfo(html, url) {
  const info = {
    title: '',
    description: '',
    price: '',
    images: [],
    features: [],
    specs: []
  };

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
  if (titleMatch) {
    info.title = titleMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Extract meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch) {
    info.description = descMatch[1].trim();
  }

  // Extract price (common patterns)
  const pricePatterns = [
    /¥\s*([\d,]+\.?\d*)/g,
    /￥\s*([\d,]+\.?\d*)/g,
    /\$\s*([\d,]+\.?\d*)/g,
    /价格[：:]?\s*¥?\s*([\d,]+\.?\d*)/g
  ];
  
  for (const pattern of pricePatterns) {
    const matches = [...html.matchAll(pattern)];
    if (matches.length > 0) {
      info.price = matches[0][1];
      break;
    }
  }

  // Extract images (product images)
  const imgMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  info.images = imgMatches
    .map(match => match[1])
    .filter(src => src && !src.startsWith('data:') && (src.includes('http') || src.startsWith('//')))
    .slice(0, 5); // Limit to first 5 images

  // Extract text content for AI analysis
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  info.textContent = textContent.slice(0, 5000); // Limit text for AI analysis

  return info;
}

/**
 * Use Claude API to analyze extracted info and generate page data
 */
async function generatePageDataWithAI(extractedInfo, url) {
  try {
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    
    if (!apiKey) {
      // Fallback to basic extraction without AI
      return generateBasicPageData(extractedInfo);
    }

    const systemPrompt = `请分析以下网页内容，提取商品信息并生成导购页面数据。

网页URL: ${url}
网页标题: ${extractedInfo.title}
网页描述: ${extractedInfo.description}
价格信息: ${extractedInfo.price}
网页内容: ${extractedInfo.textContent}

请返回JSON格式的页面数据，包含以下结构:
{
  "hero": {
    "headline": "吸引人的商品标题（不超过50字）",
    "subhead": "商品描述或卖点说明（不超过100字）", 
    "cta": "立即购买",
    "ctaColor": "#f97316",
    "image": "商品图片URL（如果有的话）"
  },
  "usps": [
    {"icon": "✨", "text": "商品特点1"},
    {"icon": "🏆", "text": "商品特点2"},
    {"icon": "💫", "text": "商品特点3"}
  ]
}

要求:
1. 标题要简洁有力，突出商品核心价值
2. 描述要专业且吸引人，突出商品优势
3. 提取3-5个核心卖点，每个卖点配合适的emoji图标
4. 如果是护肤品用✨💧🌟等图标，电子产品用🔥⚡📱等图标
5. 只返回JSON数据，不要其他说明文字`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: systemPrompt }]
      })
    });

    if (response.ok) {
      const result = await response.json();
      const content = result.content?.[0]?.text;
      
      if (content) {
        // Try to parse JSON from Claude response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const pageData = JSON.parse(jsonMatch[0]);
          
          // Add image if available
          if (!pageData.hero.image && extractedInfo.images.length > 0) {
            pageData.hero.image = extractedInfo.images[0];
          }
          
          return pageData;
        }
      }
    }

    // Fallback if AI fails
    return generateBasicPageData(extractedInfo);

  } catch (error) {
    console.error('AI analysis failed:', error);
    return generateBasicPageData(extractedInfo);
  }
}

/**
 * Generate basic page data without AI (fallback)
 */
function generateBasicPageData(info) {
  return {
    hero: {
      headline: info.title || '精品商品推荐',
      subhead: info.description || '优质商品，值得拥有。专业品质，用户信赖的选择。',
      cta: '立即购买',
      ctaColor: '#f97316',
      image: info.images.length > 0 ? info.images[0] : 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=400&fit=crop'
    },
    usps: [
      { icon: '✨', text: '优质材料，品质保证' },
      { icon: '🚀', text: '快速配送，售后无忧' },
      { icon: '🏆', text: '用户好评，值得信赖' }
    ]
  };
}