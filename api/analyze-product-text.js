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
    console.log('📥 Analyze product text request received');
    
    const { textContent, sourceUrl, imageUrls } = request.body || {};

    // Validate input
    if (!textContent || typeof textContent !== 'string') {
      return response.status(400).json({ 
        error: '文本内容不能为空' 
      });
    }

    // Clean and limit text content
    const cleanedText = cleanTextContent(textContent);
    
    if (cleanedText.length < 50) {
      return response.status(400).json({
        error: '文本内容太少，请提供更完整的商品页面内容'
      });
    }

    console.log('📄 Processing text content length:', cleanedText.length);

    // Extract basic information from text
    const extractedInfo = extractProductInfoFromText(cleanedText, sourceUrl);
    
    // Process product images if provided
    let processedImages = [];
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      console.log('📸 Processing product images:', imageUrls.length);
      try {
        const imageResponse = await fetch(new URL('/api/store-product-images', request.url).href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageUrls: imageUrls.slice(0, 3), // Limit to first 3 images
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
    
    // Use Claude API to analyze and generate page data
    const pageData = await generatePageDataWithAI(extractedInfo, sourceUrl, processedImages);

    console.log('✅ Product text analysis successful');

    return response.status(200).json({
      success: true,
      pageData,
      extractedInfo: {
        ...extractedInfo,
        textLength: cleanedText.length,
        imageCount: processedImages.length
      },
      processedImages,
      message: '商品信息分析成功'
    });

  } catch (error) {
    console.error('❌ Analyze product text error:', error);
    return response.status(500).json({
      error: 'Failed to analyze product text: ' + error.message
    });
  }
}

/**
 * Clean and prepare text content for analysis
 */
function cleanTextContent(rawText) {
  return rawText
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common noise patterns
    .replace(/登录|注册|购物车|客服|帮助|首页/g, '')
    // Keep only meaningful content
    .replace(/^[\s\n]*/, '')
    .replace(/[\s\n]*$/, '')
    // Limit length for AI processing
    .slice(0, 8000);
}

/**
 * Extract product information from cleaned text content
 */
function extractProductInfoFromText(text, sourceUrl = '') {
  const info = {
    title: '',
    description: '',
    price: '',
    features: [],
    specs: [],
    sourceUrl
  };

  // Extract potential title (look for patterns that might be product titles)
  const titlePatterns = [
    /^([^，。！？\n]{10,80})/,
    /标题[：:]?\s*([^，。！？\n]{5,50})/i,
    /商品名称[：:]?\s*([^，。！？\n]{5,50})/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.title = match[1].trim();
      break;
    }
  }

  // Extract price information
  const pricePatterns = [
    /¥\s*([0-9,]+\.?[0-9]*)/g,
    /￥\s*([0-9,]+\.?[0-9]*)/g,
    /价格[：:]?\s*¥?\s*([0-9,]+\.?[0-9]*)/gi,
    /售价[：:]?\s*¥?\s*([0-9,]+\.?[0-9]*)/gi
  ];
  
  for (const pattern of pricePatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      info.price = matches[0][1];
      break;
    }
  }

  // Extract features (look for bullet points, numbers, or feature-like patterns)
  const featurePatterns = [
    /[•·▪▫]\s*([^•·▪▫\n]{5,100})/g,
    /\d+[、.]\s*([^0-9\n]{5,100})/g,
    /特点[：:]?\s*([^。！？\n]{10,200})/gi,
    /功效[：:]?\s*([^。！？\n]{10,200})/gi
  ];

  for (const pattern of featurePatterns) {
    const matches = [...text.matchAll(pattern)];
    info.features.push(...matches.slice(0, 5).map(match => match[1].trim()));
    if (info.features.length >= 5) break;
  }

  // Create a description from the first meaningful paragraph
  const sentences = text.split(/[。！？\n]/).filter(s => s.length > 20 && s.length < 200);
  if (sentences.length > 0) {
    info.description = sentences[0].trim();
  }

  return info;
}

/**
 * Use Claude API to analyze extracted info and generate page data
 */
async function generatePageDataWithAI(extractedInfo, sourceUrl, processedImages = []) {
  try {
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    
    if (!apiKey) {
      // Fallback to basic extraction without AI
      console.log('⚠️ No Claude API key, using fallback generation');
      return generateBasicPageData(extractedInfo);
    }

    const imageInfo = processedImages.length > 0 
      ? `\n商品图片: 已处理 ${processedImages.length} 张图片并存储到本地`
      : '';
    
    const prompt = `请分析以下从商品页面提取的文本内容，生成专业的导购页面数据。

来源网址: ${sourceUrl || '用户提供'}
提取的标题: ${extractedInfo.title}
提取的描述: ${extractedInfo.description}
价格信息: ${extractedInfo.price}
特性列表: ${extractedInfo.features.join(', ')}${imageInfo}

请返回JSON格式的页面数据，包含以下结构:
{
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
}

要求:
1. 标题要简洁有力，突出商品核心价值
2. 描述要专业且吸引人，突出商品优势
3. 提取3-5个核心卖点，每个卖点配合适的emoji图标
4. 如果是护肤品用✨💧🌟等图标，电子产品用🔥⚡📱等图标，食品用🍎🌱💚等图标
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
          const pageData = JSON.parse(jsonMatch[0]);
          
          // Add processed image if available
          if (processedImages.length > 0 && processedImages[0].blobUrl) {
            pageData.hero.image = processedImages[0].blobUrl;
          }
          
          console.log('✅ AI analysis completed successfully');
          return pageData;
        }
      }
    } else {
      console.log('⚠️ Claude API request failed, using fallback');
    }

    // Fallback if AI fails
    return generateBasicPageData(extractedInfo, processedImages);

  } catch (error) {
    console.error('AI analysis failed:', error);
    return generateBasicPageData(extractedInfo, processedImages);
  }
}

/**
 * Generate basic page data without AI (fallback)
 */
function generateBasicPageData(info, processedImages = []) {
  // Determine product category for better icons
  const text = (info.title + ' ' + info.description).toLowerCase();
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

  const usps = [];
  if (info.features.length > 0) {
    info.features.slice(0, 3).forEach((feature, index) => {
      usps.push({
        icon: categoryIcons[index] || '⭐',
        text: feature.length > 30 ? feature.slice(0, 30) + '...' : feature
      });
    });
  }

  // Fill with default USPs if not enough features
  while (usps.length < 3) {
    const defaultUsps = [
      { icon: categoryIcons[0], text: '优质材料，品质保证' },
      { icon: categoryIcons[1], text: '快速配送，售后无忧' },
      { icon: categoryIcons[2], text: '用户好评，值得信赖' }
    ];
    usps.push(defaultUsps[usps.length]);
  }

  return {
    hero: {
      headline: info.title || '精选商品推荐',
      subhead: info.description || '优质商品，值得拥有。专业品质，用户信赖的选择。',
      cta: '立即购买',
      ctaColor: '#f97316',
      image: processedImages.length > 0 ? processedImages[0].blobUrl : null
    },
    usps: usps.slice(0, 3)
  };
}