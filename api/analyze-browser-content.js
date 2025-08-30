import { put } from '@vercel/blob';

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
    console.log('📥 Analyze browser content request received');
    
    const { url, content, title, images } = request.body || {};

    // Validate input
    if (!content || typeof content !== 'string') {
      return response.status(400).json({ 
        error: '页面内容不能为空' 
      });
    }

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ 
        error: '页面URL不能为空' 
      });
    }

    console.log('🌐 Processing browser-extracted content');
    console.log('📄 Content length:', content.length);
    console.log('🖼️ Images provided:', images?.length || 0);

    // Clean and process the content
    const cleanedContent = cleanBrowserContent(content);
    
    // If content is too short, use fallback content based on URL and title
    let finalContent = cleanedContent;
    if (cleanedContent.length < 50) {
      console.log('⚠️ Content too short, using fallback generation');
      finalContent = generateFallbackContent(url, title);
    }

    // Use AI to analyze the browser-extracted content
    const analysisResult = await analyzeContentWithAI(finalContent, url, title, images);
    
    if (!analysisResult.success) {
      throw new Error(analysisResult.error || 'AI分析失败');
    }

    // Process product images if provided
    let processedImages = [];
    if (images && images.length > 0) {
      console.log('🖼️ Processing browser-extracted images:', images.length);
      console.log('🔗 Image URLs:', images);
      try {
        // Process images directly instead of making HTTP call
        processedImages = await processProductImages(images.slice(0, 3), `product_${Date.now()}`);
        console.log('✅ Images processed successfully:', processedImages.length);
        if (processedImages.length === 0 && images.length > 0) {
          console.warn('⚠️ No images processed despite having image URLs - check download failures');
        }
      } catch (imageError) {
        console.error('⚠️ Image processing failed:', imageError);
        console.error('Stack trace:', imageError.stack);
        // Continue without images
      }
    }

    // Finalize page data with processed images
    const finalPageData = analysisResult.pageData;
    if (processedImages.length > 0 && processedImages[0].blobUrl) {
      finalPageData.hero.image = processedImages[0].blobUrl;
    }
    
    // Add all processed images to pageData for gallery display
    finalPageData.images = processedImages.map(img => ({
      url: img.blobUrl,
      originalUrl: img.originalUrl,
      alt: '商品图片'
    }));

    console.log('✅ Browser content analysis successful');

    return response.status(200).json({
      success: true,
      pageData: finalPageData,
      extractedInfo: {
        url: url,
        textLength: cleanedContent.length,
        imageCount: processedImages.length,
        originalImages: images?.length || 0,
        title: title || '未提供'
      },
      processedImages,
      message: '浏览器内容分析完成'
    });

  } catch (error) {
    console.error('❌ Browser content analysis error:', error);
    return response.status(500).json({
      error: 'Failed to analyze browser content: ' + error.message
    });
  }
}

/**
 * Clean and prepare browser-extracted content
 */
function cleanBrowserContent(content) {
  // Remove excessive whitespace and clean up
  let cleaned = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Remove common noise but preserve product information
  const noisePatterns = [
    /登录|注册|购物车|客服中心|帮助中心|意见反馈/g,
    /热门搜索|猜你喜欢|为你推荐|相关推荐/g,
    /分享到|收藏|关注店铺|立即关注/g,
    /免费注册|新人专享|领取优惠券/g,
    /网站导航|首页|我的淘宝|购物车|收藏夹/g
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Ensure we don't exceed processing limits
  return cleaned.slice(0, 8000);
}

/**
 * Generate fallback content when extraction fails
 */
function generateFallbackContent(url, title) {
  const productTitle = title || '商品页面';
  const urlLower = url.toLowerCase();
  
  let category = '优质商品';
  let features = '精选品质，值得信赖';
  
  // Detect platform and category
  if (urlLower.includes('taobao.com')) {
    category = '淘宝精选';
    features = '淘宝优质商品，千万用户信赖选择';
  } else if (urlLower.includes('tmall.com')) {
    category = '天猫商品';
    features = '天猫正品保证，品质购物首选';
  } else if (urlLower.includes('jd.com')) {
    category = '京东商品';
    features = '京东自营，快速配送，售后无忧';
  }
  
  // Try to extract product info from title
  const cleanTitle = productTitle.replace(/[-－_｜|【】\[\]]/g, ' ').trim();
  
  return `${category} ${cleanTitle} ${features} 正品保证 快速配送 优质服务 用户好评 值得购买 品质之选`;
}

/**
 * Use AI to analyze browser-extracted content
 */
async function analyzeContentWithAI(content, url, title, images) {
  try {
    const apiKey = process.env.VITE_CLAUDE_API_KEY;
    
    if (!apiKey) {
      console.log('⚠️ No Claude API key, using fallback generation');
      return generateBrowserFallbackAnalysis(content, url, title);
    }

    const prompt = `请分析以下从浏览器提取的商品页面内容，生成专业的导购页面数据。

网页URL: ${url}
页面标题: ${title || '未提供'}
页面内容: ${content}
图片数量: ${images?.length || 0} 张

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
  "productInfo": {
    "title": "提取的商品名称",
    "price": "价格信息（如果有）",
    "brand": "品牌信息（如果有）",
    "description": "商品描述"
  }
}

要求:
1. 从内容中准确提取商品名称、价格、品牌、特点
2. 生成简洁有力的标题，突出商品核心价值
3. 描述要专业且吸引人，突出商品优势
4. 提取3-5个核心卖点，配合适的emoji图标
5. 根据商品类型选择合适图标：护肤品用✨💧🌟，电子产品用🔥⚡📱，食品用🍎🌱💚，服装用👔✨🎨
6. 只返回JSON数据，不要其他说明文字`;

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
            productInfo: analysisResult.productInfo
          };
        }
      }
    }

    console.log('⚠️ Claude API request failed, using fallback');
    return generateBrowserFallbackAnalysis(content, url, title);

  } catch (error) {
    console.error('AI analysis failed:', error);
    return generateBrowserFallbackAnalysis(content, url, title);
  }
}

/**
 * Generate fallback analysis for browser content
 */
function generateBrowserFallbackAnalysis(content, url, title) {
  console.log('🔄 Using browser fallback analysis');
  
  const contentLower = content.toLowerCase();
  
  // Determine product category
  let categoryIcons = ['✨', '🚀', '🏆'];
  let categoryName = '优质商品';
  
  if (contentLower.includes('护肤') || contentLower.includes('美容') || contentLower.includes('化妆')) {
    categoryIcons = ['✨', '💧', '🌟'];
    categoryName = '美容护肤';
  } else if (contentLower.includes('电子') || contentLower.includes('手机') || contentLower.includes('数码')) {
    categoryIcons = ['🔥', '⚡', '📱'];
    categoryName = '数码产品';
  } else if (contentLower.includes('食品') || contentLower.includes('零食') || contentLower.includes('营养')) {
    categoryIcons = ['🍎', '🌱', '💚'];
    categoryName = '健康食品';
  } else if (contentLower.includes('服装') || contentLower.includes('衣服') || contentLower.includes('时尚')) {
    categoryIcons = ['👔', '✨', '🎨'];
    categoryName = '时尚服装';
  }

  // Try to extract meaningful product info
  const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 10 && s.trim().length < 200);
  const productTitle = title || sentences[0]?.trim() || `精选${categoryName}推荐`;
  const description = sentences.slice(1, 3).join('。').trim() || `优质${categoryName}，品质保证，用户信赖的选择。`;

  // Try to extract price
  const priceMatch = content.match(/[¥￥]\s*[\d,]+\.?\d*/);
  const price = priceMatch ? priceMatch[0] : '';

  return {
    success: true,
    pageData: {
      hero: {
        headline: productTitle.length > 50 ? productTitle.slice(0, 50) + '...' : productTitle,
        subhead: description.length > 100 ? description.slice(0, 100) + '...' : description,
        cta: '立即购买',
        ctaColor: '#f97316',
        image: null
      },
      usps: [
        { icon: categoryIcons[0], text: '精选品质，值得信赖' },
        { icon: categoryIcons[1], text: '快速配送，售后保障' },
        { icon: categoryIcons[2], text: '用户好评，口碑推荐' }
      ]
    },
    productInfo: {
      title: productTitle,
      price: price,
      description: description
    }
  };
}

/**
 * Process product images and store to Vercel Blob
 */
async function processProductImages(imageUrls, productId) {
  try {
    const processedImages = [];
    const errors = [];

    console.log('📸 Processing images for product:', productId);

    // Process each image
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      const imageUrl = imageUrls[i];
      
      try {
        console.log(`📥 Processing image ${i + 1}:`, imageUrl);
        
        // Validate and clean URL
        const cleanedUrl = cleanImageUrl(imageUrl);
        if (!cleanedUrl) {
          errors.push(`图片链接 ${i + 1} 格式不正确`);
          continue;
        }

        // Download image
        const imageData = await downloadImage(cleanedUrl);
        if (!imageData) {
          errors.push(`无法下载图片 ${i + 1}`);
          continue;
        }

        // Store to Blob
        const filename = `${productId}/image_${i + 1}.${getImageExtension(cleanedUrl)}`;
        const blobPath = `product-images/${filename}`;
        
        console.log(`💾 Storing to Blob: ${blobPath}`);
        const blob = await put(blobPath, imageData.buffer, {
          access: 'public',
          contentType: imageData.contentType,
          addRandomSuffix: false
        });

        processedImages.push({
          originalUrl: imageUrl,
          blobUrl: blob.url,
          filename: filename,
          size: imageData.buffer.length,
          contentType: imageData.contentType
        });

        console.log(`✅ Image ${i + 1} stored successfully: ${blob.url}`);

      } catch (error) {
        console.error(`❌ Error processing image ${i + 1}:`, error);
        errors.push(`处理图片 ${i + 1} 失败: ${error.message}`);
      }
    }

    console.log(`🎉 Image processing completed: ${processedImages.length} success, ${errors.length} errors`);
    return processedImages;

  } catch (error) {
    console.error('❌ Process product images error:', error);
    return [];
  }
}

/**
 * Clean and validate image URL
 */
function cleanImageUrl(url) {
  try {
    let cleanedUrl = url.trim();
    
    // Handle protocol-relative URLs
    if (cleanedUrl.startsWith('//')) {
      cleanedUrl = 'https:' + cleanedUrl;
    }
    
    // Handle relative URLs
    if (cleanedUrl.startsWith('/')) {
      return null;
    }
    
    // Validate URL
    const urlObj = new URL(cleanedUrl);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    
    return cleanedUrl;
    
  } catch (error) {
    console.error('URL cleaning error:', error);
    return null;
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url) {
  try {
    console.log('🌐 Downloading image:', url);
    
    // Special handling for Taobao/Tmall images
    let finalUrl = url;
    if (url.includes('taobao.com') || url.includes('tmall.com') || url.includes('alicdn.com')) {
      // For Alibaba CDN images, try to get a more direct URL
      if (url.includes('_') && !url.includes('.jpg') && !url.includes('.png')) {
        finalUrl = url + '.jpg';
        console.log('🔄 Modified Taobao URL:', finalUrl);
      }
    }
    
    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Referer': url.includes('taobao.com') ? 'https://www.taobao.com/' : 
                   url.includes('tmall.com') ? 'https://www.tmall.com/' : ''
      },
      timeout: 30000 // Increase timeout for slower CDNs
    });

    console.log(`📊 Response status: ${response.status}, Content-Type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
      console.warn(`⚠️ Not an image content type: ${contentType} for ${finalUrl}`);
      // Try original URL if modified URL fails
      if (finalUrl !== url) {
        console.log('🔄 Retrying with original URL:', url);
        return downloadImage(url);
      }
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`📏 Image size: ${buffer.length} bytes`);

    // Validate file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB)');
    }

    // Validate minimum file size (at least 500 bytes)
    if (buffer.length < 500) {
      throw new Error('Image too small (min 500 bytes)');
    }

    console.log('✅ Image downloaded successfully');
    return {
      buffer: buffer,
      contentType: contentType || 'image/jpeg',
      size: buffer.length
    };

  } catch (error) {
    console.error('❌ Image download error for:', url);
    console.error('Error details:', error.message);
    return null;
  }
}

/**
 * Get image extension from URL
 */
function getImageExtension(url) {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    
    // Try to extract extension from path
    const match = path.match(/\.(jpe?g|png|gif|webp|bmp)$/i);
    if (match) {
      return match[1] === 'jpeg' ? 'jpg' : match[1];
    }
    
    // Default to jpg for e-commerce sites
    return 'jpg';
    
  } catch (error) {
    return 'jpg';
  }
}