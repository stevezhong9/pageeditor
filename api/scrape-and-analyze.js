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
    console.log('📥 Scrape and analyze request received');
    
    const { url } = request.body || {};

    // Validate input
    if (!url || typeof url !== 'string') {
      return response.status(400).json({ 
        error: '商品网址不能为空' 
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

    console.log('🌐 Processing URL:', targetUrl.href);

    // Step 1: Extract content using frontend-style scraping (simulated server-side)
    const extractedContent = await extractWebContent(targetUrl.href);
    
    if (!extractedContent.success) {
      throw new Error(extractedContent.error || '无法访问网页内容');
    }

    console.log('📄 Content extracted successfully, length:', extractedContent.text?.length || 0);

    // Step 2: Use AI to analyze content and extract product info + image URLs
    const analysisResult = await analyzeWithAI(extractedContent, targetUrl.href);
    
    if (!analysisResult.success) {
      throw new Error(analysisResult.error || 'AI分析失败');
    }

    // Step 3: Process product images if found
    let processedImages = [];
    if (analysisResult.imageUrls && analysisResult.imageUrls.length > 0) {
      console.log('🖼️ Processing product images:', analysisResult.imageUrls.length);
      try {
        const imageResponse = await fetch(new URL('/api/store-product-images', request.url).href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageUrls: analysisResult.imageUrls.slice(0, 3), // Limit to first 3 images
            productId: `product_${Date.now()}`
          })
        });
        
        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          if (imageResult.success) {
            processedImages = imageResult.images;
            console.log('✅ Images processed successfully:', processedImages.length);
          }
        }
      } catch (imageError) {
        console.error('⚠️ Image processing failed:', imageError);
        // Continue without images
      }
    }

    // Step 4: Finalize page data with processed images
    const finalPageData = analysisResult.pageData;
    if (processedImages.length > 0 && processedImages[0].blobUrl) {
      finalPageData.hero.image = processedImages[0].blobUrl;
    }

    console.log('✅ Complete analysis successful');

    return response.status(200).json({
      success: true,
      pageData: finalPageData,
      extractedInfo: {
        url: targetUrl.href,
        textLength: extractedContent.text?.length || 0,
        imageCount: processedImages.length,
        originalImages: analysisResult.imageUrls?.length || 0
      },
      processedImages,
      message: '商品页面分析完成'
    });

  } catch (error) {
    console.error('❌ Scrape and analyze error:', error);
    return response.status(500).json({
      error: 'Failed to process product page: ' + error.message
    });
  }
}

/**
 * Extract web content using simulated frontend approach
 * This simulates what a browser would extract from the page
 */
async function extractWebContent(url) {
  try {
    console.log('🌐 Fetching webpage content from:', url);
    
    // Fetch the webpage content with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('📄 HTML content length:', html.length);

    // Extract text content (simulate frontend text extraction)
    const textContent = extractTextFromHtml(html);
    
    // Extract image URLs from HTML
    const imageUrls = extractImageUrlsFromHtml(html, url);

    return {
      success: true,
      text: textContent,
      images: imageUrls,
      originalUrl: url
    };

  } catch (error) {
    console.error('Web content extraction error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Extract text content from HTML (simulate DOM text extraction)
 */
function extractTextFromHtml(html) {
  // Remove script and style tags
  let cleanedHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // Remove HTML tags and extract text
  let textContent = cleanedHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Filter out common noise
  textContent = textContent
    .replace(/登录|注册|购物车|客服|帮助|首页|导航|菜单|搜索|热门|推荐/g, '')
    .replace(/Copyright|版权|备案|ICP/gi, '')
    .trim();

  // Limit length for processing
  return textContent.slice(0, 8000);
}

/**
 * Extract image URLs from HTML
 */
function extractImageUrlsFromHtml(html, baseUrl) {
  const imageUrls = [];
  const urlObj = new URL(baseUrl);
  
  // Extract img src attributes
  const imgMatches = [...html.matchAll(/<img[^>]+src=[\"']([^\"']+)[\"'][^>]*>/gi)];
  
  for (const match of imgMatches) {
    let src = match[1];
    
    // Skip data URLs and very small images
    if (src.startsWith('data:') || src.includes('1x1') || src.includes('pixel')) {
      continue;
    }
    
    // Convert relative URLs to absolute
    if (src.startsWith('//')) {
      src = urlObj.protocol + src;
    } else if (src.startsWith('/')) {
      src = urlObj.origin + src;
    } else if (!src.startsWith('http')) {
      continue; // Skip invalid URLs
    }
    
    // Check if likely to be a product image based on URL patterns
    const productPatterns = [
      /product/i, /item/i, /goods/i, /img/i, /image/i, 
      /photo/i, /pic/i, /thumb/i, /detail/i
    ];
    
    const isProductImage = productPatterns.some(pattern => src.match(pattern)) ||
                          src.includes('taobao') || src.includes('tmall') || 
                          src.includes('jd.com') || src.includes('amazon');
    
    if (isProductImage) {
      imageUrls.push(src);
    }
  }
  
  // Also check for background images in CSS
  const bgMatches = [...html.matchAll(/background-image:\s*url\([\"']?([^\"')\s]+)[\"']?\)/gi)];
  for (const match of bgMatches) {
    let src = match[1];
    if (!src.startsWith('data:') && (src.startsWith('http') || src.startsWith('//'))) {
      if (src.startsWith('//')) {
        src = urlObj.protocol + src;
      }
      imageUrls.push(src);
    }
  }
  
  // Remove duplicates and limit
  return [...new Set(imageUrls)].slice(0, 10);
}

/**
 * Use AI to analyze extracted content and generate page data
 */
async function analyzeWithAI(extractedContent, originalUrl) {
  try {
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️ No Claude API key, using fallback generation');
      return generateFallbackAnalysis(extractedContent, originalUrl);
    }

    const prompt = `请分析以下商品页面内容，提取商品信息并生成导购页面数据。

网页URL: ${originalUrl}
网页文本内容: ${extractedContent.text}
检测到的图片: ${extractedContent.images.length} 张

请返回以下JSON格式的数据:
{
  "pageData": {
    "hero": {
      "headline": "吸引人的商品标题（不超过50字）",
      "subhead": "商品描述或卖点说明（不超过100字）", 
      "cta": "立即购买",
      "ctaColor": "#f97316",
      "image": null
    },
    "usps": [
      {"icon": "✨", "text": "商品特点1"},
      {"icon": "🏆", "text": "商品特点2"},
      {"icon": "💫", "text": "商品特点3"}
    ]
  },
  "imageUrls": ["选择的主要商品图片URL1", "图片URL2", "图片URL3"],
  "productInfo": {
    "title": "提取的商品名称",
    "price": "价格信息",
    "description": "商品描述"
  }
}

要求:
1. 从网页文本中准确提取商品名称、价格、特点
2. 生成简洁有力的标题，突出商品核心价值
3. 描述要专业且吸引人，突出商品优势
4. 从检测到的图片中选择3张最相关的产品图片URL
5. 提取3-5个核心卖点，配合适的emoji图标
6. 根据商品类型选择合适图标：护肤品用✨💧🌟，电子产品用🔥⚡📱，食品用🍎🌱💚
7. 只返回JSON数据，不要其他说明文字`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (response.ok) {
      const result = await response.json();
      const content = result.content?.[0]?.text;
      
      if (content) {
        // Try to parse JSON from Claude response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysisResult = JSON.parse(jsonMatch[0]);
          console.log('✅ AI analysis completed successfully');
          return {
            success: true,
            pageData: analysisResult.pageData,
            imageUrls: analysisResult.imageUrls || extractedContent.images.slice(0, 3),
            productInfo: analysisResult.productInfo
          };
        }
      }
    }

    console.log('⚠️ Claude API request failed, using fallback');
    return generateFallbackAnalysis(extractedContent, originalUrl);

  } catch (error) {
    console.error('AI analysis failed:', error);
    return generateFallbackAnalysis(extractedContent, originalUrl);
  }
}

/**
 * Generate fallback analysis without AI
 */
function generateFallbackAnalysis(extractedContent, originalUrl) {
  const text = extractedContent.text.toLowerCase();
  
  // Determine product category for better icons
  let categoryIcons = ['✨', '🚀', '🏆']; // default
  
  if (text.includes('护肤') || text.includes('美容') || text.includes('化妆')) {
    categoryIcons = ['✨', '💧', '🌟'];
  } else if (text.includes('电子') || text.includes('手机') || text.includes('电脑')) {
    categoryIcons = ['🔥', '⚡', '📱'];
  } else if (text.includes('食品') || text.includes('健康') || text.includes('营养')) {
    categoryIcons = ['🍎', '🌱', '💚'];
  } else if (text.includes('服装') || text.includes('时尚') || text.includes('穿戴')) {
    categoryIcons = ['👔', '✨', '🎨'];
  }

  // Extract basic info
  const sentences = extractedContent.text.split(/[。！？\n]/).filter(s => s.length > 10 && s.length < 200);
  const title = sentences[0]?.trim() || '精选商品推荐';
  const description = sentences.slice(1, 3).join('。') || '优质商品，值得拥有。专业品质，用户信赖的选择。';

  return {
    success: true,
    pageData: {
      hero: {
        headline: title.length > 50 ? title.slice(0, 50) + '...' : title,
        subhead: description.length > 100 ? description.slice(0, 100) + '...' : description,
        cta: '立即购买',
        ctaColor: '#f97316',
        image: null
      },
      usps: [
        { icon: categoryIcons[0], text: '优质材料，品质保证' },
        { icon: categoryIcons[1], text: '快速配送，售后无忧' },
        { icon: categoryIcons[2], text: '用户好评，值得信赖' }
      ]
    },
    imageUrls: extractedContent.images.slice(0, 3),
    productInfo: {
      title: title,
      price: '',
      description: description
    }
  };
}