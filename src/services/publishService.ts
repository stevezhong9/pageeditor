import { DownloadService } from './downloadService';
import { PageLayout, BrandConfig } from '../types/schema';

interface PublishOptions {
  pageName: string;
  includeSources?: boolean;
}

export class PublishService {
  private static readonly PAGES_STORAGE_KEY = 'published-pages';
  private static readonly PAGE_DATA_PREFIX = 'page-data-';

  /**
   * 获取已发布的页面列表
   */
  static getPublishedPages(): string[] {
    try {
      const stored = localStorage.getItem(this.PAGES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get published pages:', error);
      return [];
    }
  }

  /**
   * 检查页面名称是否已存在
   */
  static isPageNameExists(pageName: string): boolean {
    const publishedPages = this.getPublishedPages();
    return publishedPages.includes(pageName);
  }

  /**
   * 验证页面名称格式
   */
  static validatePageName(pageName: string): { valid: boolean; message?: string } {
    // 检查是否为空
    if (!pageName.trim()) {
      return { valid: false, message: '页面名称不能为空' };
    }

    // 检查长度
    if (pageName.length < 2 || pageName.length > 50) {
      return { valid: false, message: '页面名称长度需要在2-50字符之间' };
    }

    // 检查字符格式（只允许字母、数字、中文、连字符、下划线）
    const validPattern = /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/;
    if (!validPattern.test(pageName)) {
      return { valid: false, message: '页面名称只能包含字母、数字、中文、连字符和下划线' };
    }

    // 检查是否重复
    if (this.isPageNameExists(pageName)) {
      return { valid: false, message: '页面名称已存在，请选择其他名称' };
    }

    return { valid: true };
  }

  /**
   * 发布页面到本地存储
   */
  static async publishPage(
    layout: PageLayout,
    brandConfig: BrandConfig,
    options: PublishOptions
  ): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const { pageName } = options;
      
      // 验证页面名称
      const validation = this.validatePageName(pageName);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // 生成页面内容
      const htmlContent = DownloadService.generateHTMLPage(layout, brandConfig);
      const cssContent = DownloadService.generateCSS(brandConfig);
      const jsContent = DownloadService.generateJS();

      // 存储页面数据
      const pageData = {
        name: pageName,
        layout,
        brandConfig,
        htmlContent,
        cssContent,
        jsContent,
        createdAt: new Date().toISOString(),
        url: `pages/${pageName}`
      };

      // 保存页面数据到 localStorage
      localStorage.setItem(`${this.PAGE_DATA_PREFIX}${pageName}`, JSON.stringify(pageData));

      // 更新已发布页面列表
      const publishedPages = this.getPublishedPages();
      publishedPages.push(pageName);
      localStorage.setItem(this.PAGES_STORAGE_KEY, JSON.stringify(publishedPages));

      // 模拟发布过程（实际项目中这里可能会调用后端API）
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        url: `pages/${pageName}`,
        message: `页面已成功发布到 pages/${pageName}`
      };

    } catch (error) {
      console.error('Failed to publish page:', error);
      return {
        success: false,
        message: '发布失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    }
  }

  /**
   * 获取已发布页面的数据
   */
  static getPublishedPageData(pageName: string): any | null {
    try {
      const stored = localStorage.getItem(`${this.PAGE_DATA_PREFIX}${pageName}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get page data:', error);
      return null;
    }
  }

  /**
   * 删除已发布的页面
   */
  static deletePublishedPage(pageName: string): boolean {
    try {
      // 删除页面数据
      localStorage.removeItem(`${this.PAGE_DATA_PREFIX}${pageName}`);

      // 从已发布列表中移除
      const publishedPages = this.getPublishedPages();
      const updatedPages = publishedPages.filter(name => name !== pageName);
      localStorage.setItem(this.PAGES_STORAGE_KEY, JSON.stringify(updatedPages));

      return true;
    } catch (error) {
      console.error('Failed to delete page:', error);
      return false;
    }
  }

  /**
   * 生成页面预览URL
   */
  static generatePreviewUrl(pageName: string): string {
    // 在实际项目中，这里应该返回实际的预览URL
    // 现在只是返回一个模拟的URL
    return `${window.location.origin}/pages/${pageName}`;
  }
}