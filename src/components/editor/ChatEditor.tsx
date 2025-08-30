import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Settings } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';
import { ChatMessage } from '../../types/schema';
import { getAIService, initializeAI } from '../../utils/aiService';

export const ChatEditor: React.FC = () => {
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_CLAUDE_API_KEY || '');
  const [showSettings, setShowSettings] = useState(false);
  const [useRealAI, setUseRealAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isProcessing, 
    layout,
    brandConfig,
    addMessage, 
    setIsProcessing, 
    applyPatches 
  } = usePageStore();

  // 初始化 AI 服务
  useEffect(() => {
    if (apiKey && useRealAI) {
      initializeAI({
        provider: 'claude',
        apiKey: apiKey,
        model: 'claude-3-sonnet-20240229'
      });
    }
  }, [apiKey, useRealAI]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI处理请求
  const processAIRequest = async (userMessage: string) => {
    setIsProcessing(true);
    
    try {
      const aiService = getAIService();
      let patches;
      
      if (useRealAI && apiKey) {
        // 使用真实 Claude API
        patches = await aiService.generatePatches(userMessage, layout, brandConfig);
        console.log('Claude API 返回的 patches:', patches);
      } else {
        // 使用模拟AI（展示用）
        await new Promise(resolve => setTimeout(resolve, 1000));
        patches = generateMockPatches(userMessage);
      }
      
      if (patches.length > 0) {
        applyPatches(patches, `用户请求: ${userMessage}`);
        
        const responseContent = useRealAI 
          ? `✨ 已通过 Claude AI 完成修改：${describePatchChanges(patches)}`
          : `🤖 模拟AI已完成修改：${describePatchChanges(patches)}`;
        
        addMessage({
          role: 'assistant',
          content: responseContent,
          patches
        });
      } else {
        addMessage({
          role: 'assistant',
          content: useRealAI 
            ? '抱歉，Claude AI 没有理解您的修改要求。请尝试更具体的描述。'
            : '抱歉，模拟AI没有理解您的修改要求。请尝试更具体的描述，比如"把标题改成更吸引人的"或"添加一个新的卖点"。'
        });
      }
    } catch (error) {
      console.error('AI处理失败:', error);
      addMessage({
        role: 'assistant',
        content: `❌ AI处理失败: ${error instanceof Error ? error.message : '未知错误'}。${!useRealAI ? '' : '请检查API Key是否正确。'}`
      });
    }
    
    setIsProcessing(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // 添加用户消息
    addMessage({
      role: 'user',
      content: userMessage
    });
    
    // 处理AI回复
    await processAIRequest(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center">
              <Bot className="w-5 h-5 mr-2 text-blue-500" />
              AI 编辑助手
              {useRealAI && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Claude API</span>}
              {!useRealAI && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">模拟模式</span>}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              告诉我您想要修改什么，我会帮您实时更新页面
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-200"
            title="AI 设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {/* AI 设置面板 */}
        {showSettings && (
          <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-3">AI 设置</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useRealAI"
                  checked={useRealAI}
                  onChange={(e) => setUseRealAI(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useRealAI" className="text-sm text-gray-700">
                  启用真实 Claude API
                </label>
              </div>
              
              {useRealAI && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claude API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    在 <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a> 获取 API Key
                  </p>
                </div>
              )}
              
              {!useRealAI && (
                <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">
                  💡 当前使用模拟AI，支持简单的指令演示。启用Claude API可获得更智能的响应。
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>开始对话，我来帮您编辑页面</p>
            <div className="mt-4 text-sm space-y-1">
              <p className="text-blue-600">• "把标题改得更吸引人"</p>
              <p className="text-blue-600">• "添加一个环保相关的卖点"</p>
              <p className="text-blue-600">• "把按钮文字改成立即购买"</p>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isProcessing && (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader className="w-4 h-4 animate-spin" />
            <span>AI正在处理您的请求...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="描述您想要的修改..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// 消息气泡组件
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-xs lg:max-w-md space-x-2`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500 ml-2' : 'bg-gray-300 mr-2'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-gray-600" />
          )}
        </div>
        
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.patches && message.patches.length > 0 && (
            <div className="mt-2 text-xs opacity-75">
              应用了 {message.patches.length} 个修改
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 模拟AI生成Patches（实际应用中会调用真实AI）
function generateMockPatches(userMessage: string) {
  const message = userMessage.toLowerCase();
  const patches = [];
  
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
  
  if (message.includes('添加') && message.includes('faq')) {
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

// 描述Patch变更
function describePatchChanges(patches: any[]) {
  const changes = patches.map(patch => {
    const path = patch.path;
    if (path.includes('/hero/headline')) return '更新了标题';
    if (path.includes('/hero/cta')) return '更新了按钮文字';
    if (path.includes('/usps')) return '添加了新的卖点';
    if (path.includes('/faq')) return '添加了常见问题';
    return `修改了 ${path}`;
  });
  
  return changes.join('、');
}