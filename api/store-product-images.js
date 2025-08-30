import { put } from '@vercel/blob';

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
    // Check Blob configuration first
    checkBlobConfiguration();
    
    console.log('📥 Store product images request received');
    
    const { imageUrls, productId } = request.body || {};

    // Validate input
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return response.status(400).json({ 
        error: '图片链接不能为空' 
      });
    }

    // Generate unique product ID if not provided
    const pid = productId || `product_${Date.now()}`;
    
    console.log('📸 Processing images for product:', pid);
    console.log('📊 Image URLs count:', imageUrls.length);

    const processedImages = [];
    const errors = [];

    // Process each image
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) { // Limit to 5 images
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
        const filename = `${pid}/image_${i + 1}.${getImageExtension(cleanedUrl)}`;
        const blobPath = `product-images/${filename}`;
        
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

        console.log(`✅ Image ${i + 1} stored:`, blob.url);

      } catch (error) {
        console.error(`❌ Error processing image ${i + 1}:`, error);
        errors.push(`处理图片 ${i + 1} 失败: ${error.message}`);
      }
    }

    console.log('🎉 Image processing completed');
    console.log(`✅ Processed: ${processedImages.length}, ❌ Errors: ${errors.length}`);

    return response.status(200).json({
      success: true,
      productId: pid,
      images: processedImages,
      errors: errors,
      message: `成功处理 ${processedImages.length} 张图片${errors.length > 0 ? `，${errors.length} 张失败` : ''}`
    });

  } catch (error) {
    console.error('❌ Store product images error:', error);
    return response.status(500).json({
      error: 'Failed to store product images: ' + error.message
    });
  }
}

/**
 * Clean and validate image URL
 */
function cleanImageUrl(url) {
  try {
    // Remove common parameters that might cause issues
    let cleanedUrl = url.trim();
    
    // Handle protocol-relative URLs
    if (cleanedUrl.startsWith('//')) {
      cleanedUrl = 'https:' + cleanedUrl;
    }
    
    // Handle relative URLs (assume https)
    if (cleanedUrl.startsWith('/')) {
      return null; // Can't process relative URLs without domain
    }
    
    // Validate URL
    const urlObj = new URL(cleanedUrl);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    
    // Check if it's likely an image URL
    const path = urlObj.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const hasImageExtension = imageExtensions.some(ext => path.includes(ext));
    
    // For e-commerce sites, images might not have extensions in URL
    const ecommerceHosts = ['taobao.com', 'tmall.com', 'jd.com', 'amazon.com', 'amazon.cn'];
    const isEcommerceSite = ecommerceHosts.some(host => urlObj.hostname.includes(host));
    
    if (!hasImageExtension && !isEcommerceSite) {
      // Try to determine if it might be an image based on URL patterns
      const imagePatterns = [/img/, /image/, /photo/, /pic/, /thumb/];
      const looksLikeImage = imagePatterns.some(pattern => cleanedUrl.match(pattern));
      
      if (!looksLikeImage) {
        return null;
      }
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
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Validate content type
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Not an image: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate file size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB)');
    }

    // Validate minimum file size (at least 1KB)
    if (buffer.length < 1024) {
      throw new Error('Image too small (min 1KB)');
    }

    return {
      buffer: buffer,
      contentType: contentType,
      size: buffer.length
    };

  } catch (error) {
    console.error('Image download error:', error);
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
    const ecommerceHosts = ['taobao.com', 'tmall.com', 'jd.com', 'amazon.com'];
    const isEcommerceSite = ecommerceHosts.some(host => urlObj.hostname.includes(host));
    
    if (isEcommerceSite) {
      return 'jpg';
    }
    
    return 'jpg'; // default
    
  } catch (error) {
    return 'jpg';
  }
}