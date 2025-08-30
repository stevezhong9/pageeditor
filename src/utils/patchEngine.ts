import { applyPatch, compare } from 'fast-json-patch';
import { diff, patch as diffPatch, unpatch } from 'jsondiffpatch';
import { PatchOperation, PageLayout, PageVersion } from '../types/schema';

export class PatchEngine {
  /**
   * 应用JSON Patch到页面布局
   */
  static applyPatches(layout: PageLayout, patches: PatchOperation[]): PageLayout {
    const result = structuredClone(layout);
    try {
      applyPatch(result, patches);
      return result;
    } catch (error) {
      console.error('Failed to apply patches:', error);
      return layout; // 失败时返回原始布局
    }
  }

  /**
   * 比较两个布局生成patches
   */
  static generatePatches(oldLayout: PageLayout, newLayout: PageLayout): PatchOperation[] {
    return compare(oldLayout, newLayout);
  }

  /**
   * 使用jsondiffpatch生成可视化diff
   */
  static generateDiff(left: PageLayout, right: PageLayout) {
    return diff(left, right);
  }

  /**
   * 应用jsondiffpatch的diff
   */
  static applyDiff(layout: PageLayout, delta: any): PageLayout {
    const result = structuredClone(layout);
    return diffPatch(result, delta);
  }

  /**
   * 撤销jsondiffpatch的diff
   */
  static unapplyDiff(layout: PageLayout, delta: any): PageLayout {
    const result = structuredClone(layout);
    return unpatch(result, delta);
  }

  /**
   * 验证patch操作的安全性
   */
  static validatePatches(patches: PatchOperation[]): boolean {
    return patches.every(patch => {
      // 检查路径是否合法
      if (!patch.path.startsWith('/')) return false;
      
      // 检查操作类型
      if (!['add', 'remove', 'replace', 'move', 'copy', 'test'].includes(patch.op)) {
        return false;
      }
      
      // 防止恶意路径
      const dangerousPaths = ['__proto__', 'constructor', 'prototype'];
      return !dangerousPaths.some(dangerous => patch.path.includes(dangerous));
    });
  }

  /**
   * 优化patch序列，移除冗余操作
   */
  static optimizePatches(patches: PatchOperation[]): PatchOperation[] {
    // 简单去重，实际项目中可以实现更复杂的优化逻辑
    const pathMap = new Map();
    
    patches.forEach((patch, index) => {
      if (patch.op === 'replace') {
        pathMap.set(patch.path, index);
      }
    });
    
    return patches.filter((patch, index) => {
      if (patch.op === 'replace') {
        return pathMap.get(patch.path) === index;
      }
      return true;
    });
  }
}

/**
 * 版本管理器
 */
export class VersionManager {
  private versions: PageVersion[] = [];
  private currentIndex = -1;

  constructor(initialLayout: PageLayout) {
    this.addVersion(initialLayout, "初始版本");
  }

  /**
   * 添加新版本
   */
  addVersion(layout: PageLayout, message: string, patches: PatchOperation[] = []): string {
    const version: PageVersion = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      message,
      patches,
      layout: structuredClone(layout)
    };

    // 如果当前不在最新版本，则删除之后的版本（分支合并）
    if (this.currentIndex < this.versions.length - 1) {
      this.versions = this.versions.slice(0, this.currentIndex + 1);
    }

    this.versions.push(version);
    this.currentIndex = this.versions.length - 1;
    
    return version.id;
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion(): PageVersion | null {
    return this.versions[this.currentIndex] || null;
  }

  /**
   * 获取所有版本历史
   */
  getHistory(): PageVersion[] {
    return [...this.versions];
  }

  /**
   * 切换到指定版本
   */
  switchToVersion(versionId: string): PageLayout | null {
    const versionIndex = this.versions.findIndex(v => v.id === versionId);
    if (versionIndex === -1) return null;
    
    this.currentIndex = versionIndex;
    return structuredClone(this.versions[versionIndex].layout);
  }

  /**
   * 回滚到上一个版本
   */
  rollback(): PageLayout | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return structuredClone(this.versions[this.currentIndex].layout);
    }
    return null;
  }

  /**
   * 前进到下一个版本
   */
  forward(): PageLayout | null {
    if (this.currentIndex < this.versions.length - 1) {
      this.currentIndex++;
      return structuredClone(this.versions[this.currentIndex].layout);
    }
    return null;
  }

  /**
   * 检查是否可以回滚
   */
  canRollback(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以前进
   */
  canForward(): boolean {
    return this.currentIndex < this.versions.length - 1;
  }
}