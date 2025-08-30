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
}

export class FilePublishService {
  private static readonly API_BASE = '/api';

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
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(pageName)) {
      return { valid: false, message: '页面名称只能包含英文字母、数字、连字符和下划线' };
    }

    // 检查是否以字母开头
    if (!/^[a-zA-Z]/.test(pageName)) {
      return { valid: false, message: '页面名称必须以字母开头' };
    }

    return { valid: true };
  }

  /**
   * 发布页面到文件系统
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

      // 调用API创建文件
      const response = await fetch('/api/publish-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageName,
          files
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        url: `/${pageName}`,
        message: `页面已成功发布！访问地址: ${window.location.origin}/${pageName}`,
        files: Object.keys(files)
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
    
    <!-- 生成时间: ${new Date().toLocaleString('zh-CN')} -->
    <!-- 页面名称: ${pageName} -->
    
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
    </style>
</head>
<body>
    <a href="/" class="back-link">← 返回编辑器</a>
    
    <div class="page-header">
        <h1 style="margin: 0; color: ${brandConfig.colors.primary};">${layout.hero?.headline || '导购页面'}</h1>
        <div class="page-info">
            由 PageEditor 生成 • 页面名称: ${pageName} • ${new Date().toLocaleDateString('zh-CN')}
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
        <p>© ${new Date().getFullYear()} ${brandConfig.name} • 由 <a href="/" style="color: ${brandConfig.colors.primary};">PageEditor</a> 强力驱动</p>
    </footer>

    <script>
        ${jsContent}
        
        // 页面特定功能
        function handleCTAClick() {
            alert('感谢您的关注！这是一个演示页面。');
            console.log('CTA clicked on page: ${pageName}');
        }
        
        // 页面加载完成
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Page loaded: ${pageName}');
            console.log('Generated at: ${new Date().toISOString()}');
        });
    </script>
</body>
</html>`;
  }

  /**
   * 检查页面是否已存在
   */
  static async checkPageExists(pageName: string): Promise<boolean> {
    try {
      const response = await fetch(`/${pageName}/`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取页面列表
   */
  static async getPublishedPages(): Promise<string[]> {
    try {
      const response = await fetch('/api/list-pages');
      if (response.ok) {
        const data = await response.json();
        return data.pages || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get published pages:', error);
      return [];
    }
  }
}