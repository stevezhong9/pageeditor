// AI 服务封装 - 支持 Claude 和 OpenAI
import { PatchOperation, PageLayout, BrandConfig } from '../types/schema';

interface AIConfig {
  provider: 'claude' | 'openai';
  apiKey: string;
  model?: string;
}

export class AIService {
  constructor(private config: AIConfig) {}

  /**
   * 生成页面内容的 JSON Patches
   */
  async generatePatches(
    userMessage: string, 
    currentLayout: PageLayout,
    brandConfig: BrandConfig
  ): Promise<PatchOperation[]> {
    
    const systemPrompt = `你是一个导购页编辑助手。根据用户要求，生成JSON Patch数组来修改页面。

当前页面结构: ${JSON.stringify(currentLayout, null, 2)}
品牌配置: ${JSON.stringify(brandConfig, null, 2)}

规则:
1. 只返回有效的 JSON Patch 数组
2. 遵循 RFC 6902 标准 (op: add/remove/replace/move/copy/test)
3. path 使用 JSON Pointer 格式 (如 /hero/headline)
4. 避免使用品牌禁词: ${brandConfig.forbidden.join(', ')}
5. 保持品牌调性: ${brandConfig.tone}

用户请求: ${userMessage}

返回格式:
[{"op": "replace", "path": "/hero/headline", "value": "新标题"}]`;

    try {
      if (this.config.provider === 'claude') {
        return await this.callClaude(systemPrompt);
      } else {
        return await this.callOpenAI(systemPrompt);
      }
    } catch (error) {
      console.error('AI API 调用失败:', error);
      // 降级到模拟逻辑
      return this.mockAIResponse(userMessage);
    }
  }

  /**
   * 调用 Claude API
   */
  private async callClaude(prompt: string): Promise<PatchOperation[]> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API 错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // 提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Claude 返回格式无效');
  }

  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<PatchOperation[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的导购页编辑助手。只返回有效的 JSON Patch 数组。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 提取 JSON 数组
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('OpenAI 返回格式无效');
  }

  /**
   * 模拟 AI 响应（降级方案）
   */
  private mockAIResponse(userMessage: string): PatchOperation[] {
    const message = userMessage.toLowerCase();
    const patches: PatchOperation[] = [];
    
    if (message.includes('标题') && (message.includes('改') || message.includes('修改'))) {
      if (message.includes('吸引人') || message.includes('更好')) {
        patches.push({
          op: 'replace',
          path: '/hero/headline',
          value: '🌟 革新护肤黑科技，7天焕发青春光彩'
        });
      }
    }
    
    if (message.includes('按钮') && message.includes('购买')) {
      patches.push({
        op: 'replace',
        path: '/hero/cta',
        value: '立即购买'
      });
    }
    
    if (message.includes('卖点') && message.includes('环保')) {
      patches.push({
        op: 'add',
        path: '/usps/-',
        value: { icon: '🌱', text: '100%环保可持续包装' }
      });
    }
    
    if (message.includes('faq') || message.includes('问题')) {
      patches.push({
        op: 'add',
        path: '/faq/-',
        value: {
          q: '产品有什么特色？',
          a: '我们采用先进的科研配方，经过严格测试，确保安全有效。'
        }
      });
    }
    
    return patches;
  }

  /**
   * 生成完整页面（从产品描述开始）
   */
  async generateFullPage(
    productDescription: string,
    brandConfig: BrandConfig
  ): Promise<PageLayout> {
    
    const systemPrompt = `基于产品描述生成完整的导购页面JSON。

产品描述: ${productDescription}
品牌配置: ${JSON.stringify(brandConfig)}

返回完整的PageLayout JSON，包含:
- hero: {headline, subhead, cta, image}
- usps: 3-5个卖点数组
- faq: 3-5个常见问题
- specs: 产品规格（可选）

要求:
1. 符合品牌调性: ${brandConfig.tone}
2. 避免禁词: ${brandConfig.forbidden.join(', ')}
3. 卖点要吸引人且真实
4. FAQ回答要专业可信

只返回JSON，不要其他内容。`;

    try {
      if (this.config.provider === 'claude') {
        const response = await this.callClaudeForFullPage(systemPrompt);
        return response;
      } else {
        const response = await this.callOpenAIForFullPage(systemPrompt);
        return response;
      }
    } catch (error) {
      console.error('生成完整页面失败:', error);
      // 返回默认模板
      return this.getDefaultPageTemplate(productDescription, brandConfig);
    }
  }

  private async callClaudeForFullPage(prompt: string): Promise<PageLayout> {
    // 实现类似 callClaude，但返回 PageLayout
    throw new Error('需要 Claude API Key');
  }

  private async callOpenAIForFullPage(prompt: string): Promise<PageLayout> {
    // 实现类似 callOpenAI，但返回 PageLayout
    throw new Error('需要 OpenAI API Key');
  }

  private getDefaultPageTemplate(productDescription: string, brandConfig: BrandConfig): PageLayout {
    return {
      hero: {
        headline: `${brandConfig.name} - 优质产品`,
        subhead: productDescription.slice(0, 100) + '...',
        cta: '立即了解',
        image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800'
      },
      usps: [
        { icon: '✨', text: '品质保证' },
        { icon: '🚚', text: '快速配送' },
        { icon: '💯', text: '用户好评' }
      ],
      faq: [
        {
          q: '产品质量如何？',
          a: '我们严格把控产品质量，确保每一件产品都符合高标准。'
        }
      ]
    };
  }
}

// 全局配置
let globalAIService: AIService | null = null;

export const initializeAI = (config: AIConfig) => {
  globalAIService = new AIService(config);
};

export const getAIService = (): AIService => {
  if (!globalAIService) {
    // 默认使用模拟模式
    globalAIService = new AIService({
      provider: 'claude',
      apiKey: 'mock-key'
    });
  }
  return globalAIService;
};