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
      
      return {
        success: true,
        url: result.url,
        message: `页面已成功发布到 Vercel Blob！\n\n🔗 访问地址: ${result.url}\n📁 创建文件: ${result.files?.length || 0} 个\n\n页面已永久存储，可随时访问！`,
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
        <section class="hero">
            <div class="hero-content">
                <h1 class="hero-title">${layout.hero?.headline || '欢迎使用我们的产品'}</h1>
                <p class="hero-subtitle">${layout.hero?.subhead || '为您提供最优质的服务体验'}</p>
                <button class="hero-cta" onclick="handleCTAClick()" style="background: ${layout.hero?.ctaColor || brandConfig.colors.primary};">
                    ${layout.hero?.cta || '立即体验'}
                </button>
            </div>
            ${layout.hero?.image ? `<img src="${layout.hero.image}" alt="产品展示" class="hero-image">` : ''}
        </section>

        <section class="features">
            <div class="features-grid">
                ${layout.usps?.map(usp => `
                    <div class="feature-card">
                        <div class="feature-icon">${usp.icon || '✨'}</div>
                        <div class="feature-text">${usp.text || '优质特性'}</div>
                    </div>
                `).join('') || ''}
            </div>
        </section>
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