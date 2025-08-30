import { DownloadService } from './downloadService';
import { PageLayout, BrandConfig } from '../types/schema';

interface PublishOptions {
  pageName: string;
  includeSources?: boolean;
}

interface PublishResult {
  success: boolean;
  url?: string;
  message?: string;
  files?: string[];
  urls?: Record<string, string>;
}

interface PageInfo {
  name: string;
  url: string;
  createdAt: string;
  fileCount: number;
}

export class BlobPublishService {
  private static readonly API_BASE = '/api/publish-page-blob';

  /**
   * 验证页面名称格式
   */
  static validatePageName(pageName: string): { valid: boolean; message?: string } {
    // 检查是否为空
    if (!pageName.trim()) {
      return { valid: false, message: '页面名称不能为空' };
    }

    // 检查长度
    if (pageName.length < 2 || pageName.length > 30) {
      return { valid: false, message: '页面名称长度需要在2-30字符之间' };
    }

    // 检查字符格式（只允许字母、数字、连字符、下划线）
    const validPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
    if (!validPattern.test(pageName)) {
      return { valid: false, message: '页面名称必须以字母开头，只能包含字母、数字、连字符和下划线' };
    }

    return { valid: true };
  }

  /**
   * 发布页面到 Vercel Blob
   */
  static async publishPage(
    layout: PageLayout,
    brandConfig: BrandConfig,
    options: PublishOptions
  ): Promise<PublishResult> {
    try {
      const { pageName } = options;
      
      // 验证页面名称
      const validation = this.validatePageName(pageName);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // 生成页面内容
      const htmlContent = this.generateStandaloneHTML(layout, brandConfig, pageName);
      const cssContent = DownloadService.generateCSS(brandConfig);
      const jsContent = DownloadService.generateJS();

      // 准备文件数据
      const files = {
        [`${pageName}/index.html`]: htmlContent,
        [`${pageName}/style.css`]: cssContent,
        [`${pageName}/script.js`]: jsContent,
        [`${pageName}/page-info.json`]: JSON.stringify({
          name: pageName,
          title: layout.hero?.headline || '导购页面',
          createdAt: new Date().toISOString(),
          layout,
          brandConfig
        }, null, 2)
      };

      console.log('🚀 Publishing to Vercel Blob:', pageName);
      console.log('📁 Files to create:', Object.keys(files).length);
      
      // 调用API发布到Blob
      const response = await fetch(this.API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageName,
          files
        })
      });

      console.log('📥 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API Error:', errorData);
        
        // 处理特殊的错误状态码
        if (response.status === 409) {
          throw new Error(`页面 "${pageName}" 已存在，请选择其他名称`);
        } else if (response.status === 400) {
          throw new Error(errorData.error || '请求参数错误，请检查页面名称格式');
        } else if (response.status === 500) {
          throw new Error('服务器内部错误，请稍后重试');
        }
        
        throw new Error(errorData.error || `发布失败 (${response.status}): ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Publish success:', result);
      
      // Use the actual blob URL directly for now
      const actualUrl = result.url;
      
      return {
        success: true,
        url: actualUrl,
        message: `页面已成功发布到 Vercel Blob！\n\n🔗 访问地址: ${actualUrl}\n📁 创建文件: ${result.files?.length || 0} 个\n\n页面已永久存储，可随时访问！`,
        files: result.files,
        urls: result.urls
      };

    } catch (error) {
      console.error('Failed to publish page:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '发布失败: 未知错误'
      };
    }
  }

  /**
   * 获取已发布页面列表
   */
  static async getPublishedPages(): Promise<PageInfo[]> {
    try {
      const response = await fetch(this.API_BASE, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        return data.details || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get published pages:', error);
      return [];
    }
  }

  /**
   * 删除已发布的页面
   */
  static async deletePage(pageName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}?pageName=${encodeURIComponent(pageName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Page deleted:', result);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to delete page:', error);
      return false;
    }
  }

  /**
   * 检查页面是否已存在
   */
  static async checkPageExists(pageName: string): Promise<boolean> {
    try {
      const pages = await this.getPublishedPages();
      return pages.some(page => page.name === pageName);
    } catch {
      return false;
    }
  }

  /**
   * 生成图片画廊HTML
   */
  private static generateImageGallery(layout: PageLayout): string {
    const images = (layout as any).images || [];
    
    if (!images || images.length === 0) {
      return layout.hero?.image ? `
        <div style="
          max-width: 500px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          background-color: #f8fafc;
        ">
          <img src="${layout.hero.image}" alt="商品图片" style="
            width: 100%;
            height: auto;
            max-height: 500px;
            min-height: 200px;
            object-fit: contain;
            display: block;
          ">
        </div>
      ` : '';
    }

    if (images.length === 1) {
      return `
        <div style="
          max-width: 500px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          background-color: #f8fafc;
        ">
          <img src="${images[0].url}" alt="${images[0].alt || '商品图片'}" style="
            width: 100%;
            height: auto;
            max-height: 500px;
            min-height: 200px;
            object-fit: contain;
            display: block;
          ">
        </div>
      `;
    }

    // Multiple images gallery
    return `
      <div class="product-gallery" style="width: 100%;">
        <!-- Main Image -->
        <div id="mainImageContainer" style="
          max-width: 500px;
          margin: 0 auto 1rem auto;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          background-color: #f8fafc;
        ">
          <img id="mainImage" src="${images[0].url}" alt="${images[0].alt || '商品图片'}" style="
            width: 100%;
            height: auto;
            max-height: 500px;
            min-height: 200px;
            object-fit: contain;
            display: block;
            transition: opacity 0.3s ease;
          ">
        </div>

        <!-- Thumbnails -->
        <div style="
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 100%;
          padding: 0.5rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        ">
          ${images.map((image: any, index: number) => `
            <div class="thumbnail" data-index="${index}" style="
              cursor: pointer;
              border-radius: 12px;
              overflow: hidden;
              border: ${index === 0 ? '3px solid #3b82f6' : '2px solid #e5e7eb'};
              transition: all 0.3s ease;
              flex-shrink: 0;
              box-shadow: ${index === 0 ? '0 8px 20px rgba(59, 130, 246, 0.3)' : '0 4px 8px rgba(0, 0, 0, 0.1)'};
              transform: ${index === 0 ? 'scale(1.05)' : 'scale(1)'};
            " onmouseover="switchMainImage('${image.url}', '${image.alt || '商品图片'}', ${index})" onclick="switchMainImage('${image.url}', '${image.alt || '商品图片'}', ${index})">
              <img src="${image.url}" alt="${image.alt || '商品图片'} - 缩略图 ${index + 1}" style="
                width: 100px;
                height: 100px;
                object-fit: contain;
                display: block;
                background-color: #f8fafc;
              ">
            </div>
          `).join('')}
        </div>

        <!-- Image Counter -->
        <div id="imageCounter" style="
          text-align: center;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        ">
          1 / ${images.length}
        </div>
      </div>
    `;
  }

  /**
   * 生成独立的HTML文件（包含内联CSS和JS）
   */
  private static generateStandaloneHTML(
    layout: PageLayout, 
    brandConfig: BrandConfig, 
    pageName: string
  ): string {
    const cssContent = DownloadService.generateCSS(brandConfig);
    const jsContent = DownloadService.generateJS();
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${layout.hero?.headline || '导购页面'} - ${brandConfig.name}</title>
    <meta name="description" content="${layout.hero?.subhead || '专业的导购页面'}">
    <meta name="keywords" content="导购,产品,${brandConfig.name}">
    
    <!-- 由 PageEditor 生成 -->
    <!-- 页面名称: ${pageName} -->
    <!-- 生成时间: ${new Date().toLocaleString('zh-CN')} -->
    <!-- 存储方式: Vercel Blob Storage -->
    
    <style>
        ${cssContent}
        
        /* 页面特定样式 */
        .page-header {
            background: linear-gradient(135deg, ${brandConfig.colors.primary}15, ${brandConfig.colors.accent}15);
            padding: 1rem;
            text-align: center;
            border-bottom: 2px solid ${brandConfig.colors.primary}30;
            margin-bottom: 2rem;
        }
        
        .page-info {
            font-size: 0.8rem;
            color: #666;
            margin-top: 0.5rem;
        }
        
        .back-link {
            position: fixed;
            top: 20px;
            left: 20px;
            background: ${brandConfig.colors.primary};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            text-decoration: none;
            font-size: 0.9rem;
            z-index: 1000;
            transition: all 0.3s;
        }
        
        .back-link:hover {
            background: ${brandConfig.colors.accent};
            transform: translateY(-2px);
        }

        .blob-badge {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #000;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            z-index: 1000;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <a href="https://pageeditor.sharetox.com" class="back-link">← 返回编辑器</a>
    <div class="blob-badge">⚡ Powered by Vercel Blob</div>
    
    <div class="page-header">
        <h1 style="margin: 0; color: ${brandConfig.colors.primary};">${layout.hero?.headline || '导购页面'}</h1>
        <div class="page-info">
            由 PageEditor 智能生成 • 页面: ${pageName} • ${new Date().toLocaleDateString('zh-CN')}
        </div>
    </div>
    
    <main class="landing-page">
        <!-- Hero Section -->
        <div class="hero-section" style="
            background: linear-gradient(135deg, ${brandConfig.colors.primary}15, ${brandConfig.colors.accent}15);
            text-align: center;
            padding: 3rem 2rem;
            border-radius: 24px;
            margin: 2rem 0;
        ">
            <h1 style="
                font-size: 2.5rem;
                font-weight: 800;
                color: #1f2937;
                margin: 0 0 1rem 0;
                line-height: 1.2;
            ">${layout.hero?.headline || '欢迎使用我们的产品'}</h1>
            
            <p style="
                font-size: 1.125rem;
                color: #6b7280;
                margin: 0 0 2rem 0;
                line-height: 1.6;
                max-width: 600px;
                margin-left: auto;
                margin-right: auto;
            ">${layout.hero?.subhead || '为您提供最优质的服务体验'}</p>
            
            <button onclick="handleCTAClick()" style="
                background: ${layout.hero?.ctaColor || brandConfig.colors.primary};
                color: white;
                border: none;
                padding: 1rem 2rem;
                font-size: 1.125rem;
                font-weight: 600;
                border-radius: 50px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin-bottom: 2rem;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'">
                ${layout.hero?.cta || '立即体验'}
            </button>

            <!-- Product Image Gallery -->
            ${this.generateImageGallery(layout)}
        </div>

        <!-- USPs Section -->
        <div class="usps-section" style="margin: 3rem 0;">
            <div style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                max-width: 800px;
                margin: 0 auto;
            ">
                ${layout.usps?.map(usp => `
                    <div style="
                        background: white;
                        padding: 1.5rem;
                        border-radius: 16px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
                        text-align: center;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.07)'">
                        <div style="
                            font-size: 2rem;
                            margin-bottom: 0.5rem;
                        ">${usp.icon || '✨'}</div>
                        <div style="
                            font-size: 1rem;
                            font-weight: 500;
                            color: #374151;
                            line-height: 1.5;
                        ">${usp.text || '优质特性'}</div>
                    </div>
                `).join('') || ''}
            </div>
        </div>
    </main>

    <footer style="text-align: center; padding: 2rem; color: #666; border-top: 1px solid #eee; margin-top: 3rem;">
        <p>© ${new Date().getFullYear()} ${brandConfig.name}</p>
        <p style="font-size: 0.8rem; opacity: 0.8;">
            由 <a href="https://pageeditor.sharetox.com" style="color: ${brandConfig.colors.primary};">PageEditor</a> 
            创建 • 存储于 <a href="https://vercel.com/blob" style="color: #000;">Vercel Blob</a>
        </p>
    </footer>

    <script>
        ${jsContent}
        
        // 页面特定功能
        function handleCTAClick() {
            alert('感谢您的关注！这是由 PageEditor 生成的导购页面。');
            console.log('CTA clicked on page:', '${pageName}');
        }
        
        // 图片画廊功能
        let currentImageIndex = 0;
        
        function switchMainImage(imageUrl, imageAlt, index) {
            const mainImage = document.getElementById('mainImage');
            const imageCounter = document.getElementById('imageCounter');
            const thumbnails = document.querySelectorAll('.thumbnail');
            
            if (mainImage) {
                mainImage.src = imageUrl;
                mainImage.alt = imageAlt;
                currentImageIndex = index;
                
                // Update counter
                if (imageCounter) {
                    const totalImages = thumbnails.length;
                    imageCounter.textContent = (index + 1) + ' / ' + totalImages;
                }
                
                // Update thumbnail styles
                thumbnails.forEach((thumb, i) => {
                    if (i === index) {
                        thumb.style.border = '3px solid #3b82f6';
                        thumb.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.3)';
                        thumb.style.transform = 'scale(1.05)';
                    } else {
                        thumb.style.border = '2px solid #e5e7eb';
                        thumb.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                        thumb.style.transform = 'scale(1)';
                    }
                });
            }
        }
        
        // 页面统计
        document.addEventListener('DOMContentLoaded', function() {
            console.log('PageEditor Generated Page Loaded:', '${pageName}');
            console.log('Generated at:', '${new Date().toISOString()}');
            console.log('Powered by: Vercel Blob Storage');
        });
    </script>
</body>
</html>`;
  }
}