// Claude API service with proper CORS handling and error management

interface ClaudeAPIResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  id: string;
  model: string;
  role: string;
  stop_reason: string;
  stop_sequence: null;
  type: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface PatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
  from?: string;
}

export class ClaudeAPIService {
  private apiKey: string;
  private baseURL = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generatePatches(
    userMessage: string, 
    currentPageData: any
  ): Promise<PatchOperation[]> {
    
    // Check if running in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.warn('🚨 CORS Warning: Direct API calls from localhost may be blocked by browser CORS policy');
      
      // Offer alternative solutions
      throw new Error(`CORS限制: 浏览器阻止了从localhost直接调用Claude API。

解决方案:
1. 使用演示模式继续体验功能
2. 部署到生产环境 (Vercel/Netlify)
3. 使用代理服务器或后端API

当前正在使用模拟AI模式...`);
    }

    const systemPrompt = this.buildSystemPrompt(userMessage, currentPageData);

    try {
      const response = await this.makeAPICall(systemPrompt);
      return this.parseResponse(response);
      
    } catch (error) {
      console.error('Claude API Error:', error);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`网络请求失败: 无法连接到Claude API

可能原因:
• CORS跨域限制 (localhost环境)
• 网络连接问题
• API服务暂时不可用
• 防火墙/代理设置

建议: 切换到演示模式或检查网络连接`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('未知的API调用错误');
    }
  }

  private buildSystemPrompt(userMessage: string, currentPageData: any): string {
    return `你是一个专业的导购页编辑助手。根据用户要求，生成JSON Patch数组来修改页面。

当前页面结构:
${JSON.stringify(currentPageData, null, 2)}

规则:
1. 只返回有效的JSON Patch数组，格式严格按照: [{"op": "replace", "path": "/hero/headline", "value": "新标题"}]
2. 遵循RFC 6902标准 (op: add/remove/replace/move/copy/test)
3. path使用JSON Pointer格式:
   - /hero/headline (修改标题)
   - /hero/subhead (修改副标题)
   - /hero/cta (修改按钮)
   - /usps/0/text (修改第一个卖点文本)
   - /usps/- (在数组末尾添加新卖点)
4. 确保修改内容专业、吸引人且符合导购页面的商业目标
5. 优先使用replace操作修改现有内容，用add操作添加新内容

用户请求: ${userMessage}

请直接返回JSON数组，不要包含任何其他文字说明:`;
  }

  private async makeAPICall(systemPrompt: string): Promise<ClaudeAPIResponse> {
    const requestBody = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ]
    };

    console.log('Making Claude API call...', {
      url: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey.substring(0, 20) + '...',
        'anthropic-version': '2023-06-01'
      }
    });

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      if (response.status === 401) {
        throw new Error('API Key无效: 请检查您的Claude API Key是否正确');
      } else if (response.status === 429) {
        throw new Error('API调用频率超限: 请稍后再试或升级您的API计划');
      } else if (response.status === 500) {
        throw new Error('Claude API服务器错误: 请稍后重试');
      } else {
        throw new Error(`Claude API错误 (${response.status}): ${response.statusText}`);
      }
    }

    return await response.json();
  }

  private parseResponse(apiResponse: ClaudeAPIResponse): PatchOperation[] {
    const content = apiResponse.content[0]?.text;
    
    if (!content) {
      throw new Error('Claude API返回空内容');
    }

    console.log('Claude API response content:', content);

    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      
      if (jsonMatch) {
        const patches = JSON.parse(jsonMatch[0]);
        
        // Validate patches structure
        if (Array.isArray(patches)) {
          const validPatches = patches.filter(patch => 
            patch && 
            typeof patch === 'object' && 
            typeof patch.op === 'string' && 
            typeof patch.path === 'string'
          );
          
          if (validPatches.length > 0) {
            console.log('Successfully parsed patches:', validPatches);
            return validPatches;
          }
        }
      }

      // If no valid JSON found, try to parse the entire content
      const directParse = JSON.parse(content);
      if (Array.isArray(directParse)) {
        return directParse;
      }

      throw new Error('无法从Claude响应中解析出有效的JSON Patch数组');

    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      throw new Error(`Claude返回格式错误: 无法解析JSON。原始回复: ${content.substring(0, 200)}...`);
    }
  }
}

// Demo/Mock AI service for local development
export class MockAIService {
  async generatePatches(userMessage: string): Promise<PatchOperation[]> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const message = userMessage.toLowerCase();
    const patches: PatchOperation[] = [];
    
    if (message.includes('标题') && (message.includes('改') || message.includes('修改') || message.includes('更新'))) {
      if (message.includes('吸引人') || message.includes('更好') || message.includes('科技')) {
        patches.push({
          op: 'replace',
          path: '/hero/headline',
          value: '🌟 AI驱动的革命性护肤体验'
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
    
    if (message.includes('卖点') || message.includes('优势')) {
      if (message.includes('环保') || message.includes('绿色')) {
        patches.push({
          op: 'add',
          path: '/usps/-',
          value: { icon: '🌱', text: '100%环保可持续包装' }
        });
      } else if (message.includes('科技') || message.includes('AI')) {
        patches.push({
          op: 'add',
          path: '/usps/-',
          value: { icon: '🤖', text: 'AI智能配方定制' }
        });
      }
    }
    
    if (message.includes('副标题') || message.includes('描述')) {
      patches.push({
        op: 'replace',
        path: '/hero/subhead',
        value: '基于人工智能的个性化护肤解决方案，为您带来前所未有的美丽体验'
      });
    }
    
    return patches;
  }
}