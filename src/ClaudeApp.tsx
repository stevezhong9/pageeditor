import React, { useState, useRef, useEffect } from 'react';
import { applyPatch } from 'fast-json-patch';
import { ClaudeAPIService, MockAIService, PatchOperation } from './services/claudeAPI';
import { forceScrollbarVisibility, checkScrollProperties } from './utils/scrollTest';
import { DownloadService } from './services/downloadService';
import { PublishService } from './services/publishService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  patches?: any[];
}

// Initialize API services
let claudeService: ClaudeAPIService | null = null;
const mockService = new MockAIService();

function ClaudeApp() {
  const [pageData, setPageData] = useState({
    hero: {
      headline: "Revolutionary Skincare Experience",
      subhead: "Using unique scientific formula for professional care",
      cta: "Try Now",
      image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&h=400&fit=crop"
    },
    usps: [
      { icon: "✨", text: "7-day visible improvement" },
      { icon: "🧪", text: "Scientific formula, safe and gentle" },
      { icon: "🏆", text: "Trusted by 100k+ users" }
    ]
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [useClaudeAPI, setUseClaudeAPI] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [customPageName, setCustomPageName] = useState('');
  const [publishedPages, setPublishedPages] = useState<string[]>([]);
  
  // Brand configuration
  const brandConfig = {
    name: "Premium Skincare",
    logoUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=60&fit=crop",
    colors: {
      primary: "#007bff",
      accent: "#6c757d"
    },
    font: "system-ui, -apple-system, sans-serif",
    tone: "professional" as const,
    forbidden: []
  };
  
  // Ref for auto-scrolling to bottom of messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Debug scroll properties
    if (messagesContainerRef.current) {
      checkScrollProperties(messagesContainerRef.current);
    }
  }, [messages, isProcessing]);

  // Force scrollbar visibility on mount
  useEffect(() => {
    forceScrollbarVisibility();
  }, []);

  // Test function to add multiple messages (for testing scroll)
  const addTestMessages = () => {
    const testMessages: ChatMessage[] = [
      { id: '1', role: 'user', content: '把标题改得更吸引人', timestamp: Date.now() - 5000 },
      { id: '2', role: 'assistant', content: '✨ 模拟AI 已理解您的要求，正在修改页面：\n\n• 更新了主标题', timestamp: Date.now() - 4000, patches: [{ op: 'replace', path: '/hero/headline', value: '新标题' }] },
      { id: '3', role: 'user', content: '添加一个环保相关的卖点', timestamp: Date.now() - 3000 },
      { id: '4', role: 'assistant', content: '🤖 模拟AI 已理解您的要求，正在修改页面：\n\n• 添加了新卖点: 100%环保可持续包装', timestamp: Date.now() - 2000, patches: [{ op: 'add', path: '/usps/-', value: { icon: '🌱', text: '100%环保可持续包装' } }] },
      { id: '5', role: 'user', content: '把按钮改成立即购买', timestamp: Date.now() - 1000 },
      { id: '6', role: 'assistant', content: '✨ 模拟AI 已理解您的要求，正在修改页面：\n\n• 更新了行动按钮', timestamp: Date.now() - 500, patches: [{ op: 'replace', path: '/hero/cta', value: '立即购买' }] },
      { id: '7', role: 'user', content: '这个页面看起来不错，能再添加一些科技感的元素吗？让整体感觉更现代化一些', timestamp: Date.now() - 200 },
      { id: '8', role: 'assistant', content: '🚀 很好的建议！我来为页面添加更多科技感元素：\n\n• 更新了主标题，加入科技元素\n• 修改了副标题，突出AI技术\n• 添加了科技相关的卖点\n\n现在页面看起来更加现代化和科技感十足！', timestamp: Date.now(), patches: [] }
    ];
    setMessages(testMessages);
  };

  // Initialize Claude service when API key is provided
  const initializeClaudeService = (apiKey: string) => {
    console.log('🔧 Initializing Claude service with API key:', {
      hasKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      startsCorrectly: apiKey ? apiKey.startsWith('sk-ant-api03-') : false,
      firstChars: apiKey ? apiKey.substring(0, 20) : 'none',
      actualApiKey: apiKey // 临时调试 - 显示完整 API Key
    });
    
    try {
      if (apiKey && apiKey.startsWith('sk-ant-api03-')) {
        claudeService = new ClaudeAPIService(apiKey);
        console.log('✅ Claude service initialized successfully');
        return true;
      } else {
        console.log('❌ Claude service initialization failed - invalid API key format');
        console.log('API Key check details:', {
          apiKeyExists: !!apiKey,
          apiKeyType: typeof apiKey,
          startsWith: apiKey ? apiKey.startsWith('sk-ant-api03-') : 'N/A',
          fullKey: apiKey || 'null'
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error during Claude service initialization:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      let patches: PatchOperation[];
      let responseContent: string;
      
      if (useClaudeAPI && apiKey) {
        // Always reinitialize Claude service to ensure fresh state
        const initResult = initializeClaudeService(apiKey);
        console.log('Claude service initialization result:', initResult);
        
        if (!initResult) {
          console.log('Failed to initialize Claude service. API Key details:', {
            apiKey: apiKey ? `${apiKey.substring(0, 20)}...` : 'null',
            length: apiKey ? apiKey.length : 0,
            startsCorrectly: apiKey ? apiKey.startsWith('sk-ant-api03-') : false
          });
          throw new Error(`无效的 API Key: 请确保输入正确的 Claude API Key (sk-ant-api03-...)
          
当前 API Key 信息:
- 长度: ${apiKey ? apiKey.length : 0}
- 格式检查: ${apiKey ? apiKey.startsWith('sk-ant-api03-') ? '✅ 正确' : '❌ 错误' : '❌ 空值'}`);
        }
        
        // Use real Claude API
        patches = await claudeService.generatePatches(userMessage, pageData);
        responseContent = `✨ Claude AI 已根据您的要求完成修改：\n\n`;
      } else {
        // Use mock AI for demo
        patches = await mockService.generatePatches(userMessage);
        responseContent = `🤖 模拟AI 已理解您的要求，正在修改页面：\n\n`;
      }
      
      if (patches && patches.length > 0) {
        console.log('Applying patches:', patches);
        
        // Apply patches to page data
        const result = applyPatch({ ...pageData }, patches);
        setPageData(result.newDocument);
        
        // Describe what was changed
        const changes = patches.map((patch: any) => {
          if (patch.path.includes('/hero/headline')) return '• 更新了主标题';
          if (patch.path.includes('/hero/subhead')) return '• 更新了副标题';
          if (patch.path.includes('/hero/cta')) return '• 更新了行动按钮';
          if (patch.path.includes('/usps')) {
            if (patch.op === 'add') return `• 添加了新卖点: ${patch.value.text}`;
            if (patch.op === 'replace') return '• 修改了卖点内容';
          }
          return `• 修改了 ${patch.path}`;
        });
        
        responseContent += changes.join('\n');
        
        // Add assistant message with patches
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now(),
          patches
        };
        setMessages(prev => [...prev, assistantMsg]);
        
      } else {
        // No patches generated
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: useClaudeAPI 
            ? '抱歉，Claude AI 没有理解您的修改要求。请尝试更具体的描述，比如"把标题改得更吸引人"或"添加一个环保相关的卖点"。'
            : '抱歉，我没有理解您的修改要求。请尝试这些指令：\n\n• "把标题改得更吸引人"\n• "添加一个环保相关的卖点"\n• "把按钮改成立即购买"\n• "修改副标题"',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
      
    } catch (error) {
      console.error('AI processing failed:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 处理失败: ${error instanceof Error ? error.message : '未知错误'}\n\n${useClaudeAPI ? '请检查API Key是否正确，或切换到模拟模式继续体验。' : ''}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    
    setIsProcessing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // 下载导购页功能
  const handleDownloadLandingPage = async () => {
    setIsDownloading(true);
    
    try {
      await DownloadService.downloadLandingPage(pageData, brandConfig, {
        includeSources: true,
        includeAssets: true,
        format: 'html'
      });
      
      // 添加成功消息到聊天
      const successMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '🎉 导购页下载成功！\n\nZIP包包含：\n• index.html - 完整的HTML页面\n• assets/styles.css - 样式文件\n• assets/scripts.js - 交互脚本\n• README.md - 使用说明\n• sources/ - 源数据文件\n\n您可以直接部署到任何静态托管平台！',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, successMsg]);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      // 添加错误消息到聊天
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ 下载失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请重试或检查浏览器设置。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsDownloading(false);
    }
  };

  // 发布页面功能
  const handlePublishPage = () => {
    setShowPublishDialog(true);
  };

  const handleConfirmPublish = async () => {
    if (!customPageName.trim()) return;

    setIsPublishing(true);
    
    try {
      const result = await PublishService.publishPage(pageData, brandConfig, {
        pageName: customPageName.trim(),
        includeSources: true
      });

      if (result.success) {
        // 更新已发布页面列表
        setPublishedPages(PublishService.getPublishedPages());
        
        // 添加成功消息到聊天
        const successMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 页面发布成功！\n\n📍 访问地址: ${result.url}\n🔗 完整URL: ${PublishService.generatePreviewUrl(customPageName)}\n\n页面已保存到本地，您可以随时访问和管理。`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, successMsg]);
        
        // 重置表单
        setCustomPageName('');
        setShowPublishDialog(false);
      } else {
        // 添加错误消息到聊天
        const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `❌ 发布失败: ${result.message}\n\n请重试或选择其他页面名称。`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
      
    } catch (error) {
      console.error('Publish failed:', error);
      
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ 发布失败: ${error instanceof Error ? error.message : '未知错误'}\n\n请重试或检查页面名称。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsPublishing(false);
    }
  };

  const validatePageName = (name: string) => {
    return PublishService.validatePageName(name);
  };

  // 初始化已发布页面列表和API设置
  useEffect(() => {
    setPublishedPages(PublishService.getPublishedPages());
    
    // 从环境变量或 localStorage 读取 API 设置
    const envApiKey = import.meta.env.VITE_CLAUDE_API_KEY;
    const savedApiKey = localStorage.getItem('claude-api-key');
    const savedUseClaudeAPI = localStorage.getItem('use-claude-api') === 'true';
    
    // 优先使用环境变量中的 API Key
    const finalApiKey = envApiKey || savedApiKey;
    
    if (finalApiKey) {
      setApiKey(finalApiKey);
      console.log('🔑 API Key loaded from:', envApiKey ? 'environment variable' : 'localStorage');
    }
    
    if (savedUseClaudeAPI || envApiKey) {
      setUseClaudeAPI(true);
    }
  }, []);

  // 保存API设置到localStorage
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('claude-api-key', apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('use-claude-api', useClaudeAPI.toString());
  }, [useClaudeAPI]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0', 
        padding: '1rem 2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', color: '#1f2937', margin: 0 }}>
              Claude AI 导购页编辑器
              {useClaudeAPI && <span style={{ 
                marginLeft: '0.5rem', 
                padding: '0.25rem 0.5rem', 
                background: '#10b981', 
                color: 'white', 
                fontSize: '0.75rem', 
                borderRadius: '9999px' 
              }}>
                Claude API
              </span>}
              {!useClaudeAPI && <span style={{ 
                marginLeft: '0.5rem', 
                padding: '0.25rem 0.5rem', 
                background: '#6b7280', 
                color: 'white', 
                fontSize: '0.75rem', 
                borderRadius: '9999px' 
              }}>
                演示模式
              </span>}
            </h1>
            <p style={{ color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>
              用自然语言告诉我您想要的修改，我会实时更新页面
            </p>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              padding: '0.5rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ⚙️ 设置
          </button>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                id="useClaudeAPI"
                checked={useClaudeAPI}
                onChange={(e) => setUseClaudeAPI(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              <label htmlFor="useClaudeAPI" style={{ fontSize: '0.875rem' }}>
                启用真实 Claude API
              </label>
            </div>
            
            {useClaudeAPI && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Claude API Key:
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  margin: '0.5rem 0',
                  padding: '0.75rem',
                  background: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '4px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ CORS 限制说明:</div>
                  <div>由于浏览器安全策略，从 localhost 直接调用 Claude API 可能被阻止。</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>建议:</strong>
                    <div>• 先体验演示模式的完整功能</div>
                    <div>• 部署到生产环境后使用真实API</div>
                    <div>• 或通过后端代理调用API</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0' }}>
                  在 <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Anthropic Console</a> 获取 API Key
                </p>
              </div>
            )}
            
            {!useClaudeAPI && (
              <div style={{
                fontSize: '0.75rem',
                color: '#059669',
                background: '#d1fae5',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #a7f3d0'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>💡 演示模式已启用</div>
                <div>当前使用内置AI规则，支持以下指令演示：</div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
                  • "把标题改得更科技感"<br/>
                  • "添加一个环保相关的卖点"<br/>  
                  • "把按钮改成立即购买"<br/>
                  • "修改副标题"
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '1rem', 
        display: 'grid', 
        gridTemplateColumns: window.innerWidth > 1024 ? '400px 1fr' : '1fr',
        gap: '1rem',
        height: 'calc(100vh - 140px)'
      }}>
        
        {/* Left Panel: Chat Interface */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',  // Ensure full height
          minHeight: '0'   // Allow flex children to shrink
        }}>
          <div style={{ 
            background: '#f1f5f9', 
            padding: '1rem', 
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600,
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px'
          }}>
            💬 AI 对话编辑
          </div>
          
          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="messages-container"
            style={{ 
              flex: 1, 
              minHeight: '0',       // Allow flex item to shrink below content size
              overflowY: 'scroll',  // Force show scrollbar
              overflowX: 'hidden',
              padding: '1rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              scrollBehavior: 'smooth'
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖</div>
                <p>开始对话，我来帮您编辑页面</p>
                <div style={{ fontSize: '0.875rem', marginTop: '1rem', textAlign: 'left' }}>
                  <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>试试这些指令：</p>
                  <p style={{ color: '#3b82f6', margin: '0.25rem 0' }}>• "把标题改得更科技感"</p>
                  <p style={{ color: '#3b82f6', margin: '0.25rem 0' }}>• "添加一个环保相关的卖点"</p>
                  <p style={{ color: '#3b82f6', margin: '0.25rem 0' }}>• "把按钮改成立即购买"</p>
                </div>
                
                {/* Test button for scroll demo */}
                <button
                  onClick={addTestMessages}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  🧪 加载测试对话 (演示滚动效果)
                </button>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-${message.role}`}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div 
                  className="message-bubble"
                  style={{
                    maxWidth: '80%',
                    padding: '0.75rem 1rem',
                    borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: message.role === 'user' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    color: message.role === 'user' ? 'white' : '#1f2937',
                    boxShadow: message.role === 'user' 
                      ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: message.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                    position: 'relative'
                  }}
                >
                  {/* Message role indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    [message.role === 'user' ? 'right' : 'left']: '12px',
                    background: message.role === 'user' ? '#2563eb' : '#6b7280',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '0.6rem',
                    fontWeight: 500
                  }}>
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.875rem', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.5',
                    marginTop: '4px'
                  }}>
                    {message.content}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.7rem', 
                    opacity: 0.7, 
                    marginTop: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{formatTime(message.timestamp)}</span>
                    {message.patches && message.patches.length > 0 && (
                      <span style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#2563eb',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.65rem',
                        fontWeight: 500
                      }}>
                        {message.patches.length} 个修改
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                color: '#6b7280',
                padding: '0.75rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ 
                  fontSize: '1.2rem',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>🤔</div>
                <span>AI正在处理您的请求...</span>
                <div style={{ 
                  display: 'flex', 
                  gap: '2px',
                  marginLeft: 'auto'
                }}>
                  <div style={{ 
                    width: '4px', 
                    height: '4px', 
                    borderRadius: '50%', 
                    background: '#6b7280',
                    animation: 'bounce 1.4s ease-in-out infinite both'
                  }}></div>
                  <div style={{ 
                    width: '4px', 
                    height: '4px', 
                    borderRadius: '50%', 
                    background: '#6b7280',
                    animation: 'bounce 1.4s ease-in-out 0.16s infinite both'
                  }}></div>
                  <div style={{ 
                    width: '4px', 
                    height: '4px', 
                    borderRadius: '50%', 
                    background: '#6b7280',
                    animation: 'bounce 1.4s ease-in-out 0.32s infinite both'
                  }}></div>
                </div>
              </div>
            )}
            
            {/* Invisible element for auto-scroll target */}
            <div ref={messagesEndRef} style={{ height: '1px' }} />
          </div>
          
          {/* Input */}
          <div style={{ 
            padding: '1rem', 
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="描述您想要的修改..."
              disabled={isProcessing}
              className="chat-input"
              style={{
                flex: 1,
                minHeight: '60px',
                maxHeight: '120px',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                resize: 'none',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                background: 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              style={{
                background: isProcessing ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '1rem'
              }}
            >
              📤
            </button>
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'auto'
        }}>
          <div style={{ 
            background: '#f1f5f9', 
            padding: '1rem', 
            borderBottom: '1px solid #e2e8f0',
            fontWeight: 600,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>👁️ 实时预览</span>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleDownloadLandingPage}
                disabled={isDownloading}
                style={{
                  background: isDownloading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isDownloading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!isDownloading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDownloading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
                  }
                }}
              >
                {isDownloading ? (
                  <>
                    <div style={{ 
                      width: '14px', 
                      height: '14px', 
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    打包中...
                  </>
                ) : (
                  <>
                    📦 下载导购页
                  </>
                )}
              </button>

              <button
                onClick={handlePublishPage}
                disabled={isPublishing || isDownloading}
                style={{
                  background: (isPublishing || isDownloading) ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (isPublishing || isDownloading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (!isPublishing && !isDownloading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isPublishing && !isDownloading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                  }
                }}
              >
                🚀 发布页面
              </button>
            </div>
          </div>
          
          <div style={{ padding: '2rem' }}>
            {/* Hero Section */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                color: '#1f2937',
                marginBottom: '1rem',
                lineHeight: '1.2'
              }}>
                {pageData.hero.headline}
              </h1>
              <p style={{ 
                fontSize: '1.25rem', 
                color: '#6b7280',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                {pageData.hero.subhead}
              </p>
              <button style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)',
                transform: 'translateY(0)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
              }}>
                {pageData.hero.cta}
              </button>
              
              <img
                src={pageData.hero.image}
                alt="Product"
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  height: '300px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  margin: '2rem auto 0',
                  display: 'block',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}
              />
            </div>

            {/* USPs */}
            <div>
              <h2 style={{ 
                fontSize: '1.75rem', 
                fontWeight: 600, 
                marginBottom: '1.5rem',
                textAlign: 'center',
                color: '#1f2937'
              }}>
                核心优势
              </h2>
              <div style={{ 
                display: 'grid', 
                gap: '1rem',
                gridTemplateColumns: window.innerWidth > 768 ? 'repeat(auto-fit, minmax(250px, 1fr))' : '1fr'
              }}>
                {pageData.usps.map((usp, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                      cursor: 'default'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      fontSize: '2rem',
                      width: '3rem',
                      height: '3rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      {usp.icon}
                    </div>
                    <div style={{ 
                      fontSize: '1rem',
                      fontWeight: 500,
                      color: '#374151',
                      lineHeight: '1.5'
                    }}>
                      {usp.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 发布页面对话框 */}
      {showPublishDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            animation: 'fadeInUp 0.3s ease-out'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              🚀 发布导购页面
            </h2>
            
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              请输入自定义页面名称，页面将发布到 pages/[页面名称]
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                页面名称 *
              </label>
              <input
                type="text"
                value={customPageName}
                onChange={(e) => setCustomPageName(e.target.value)}
                placeholder="例如: my-skincare-page"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {customPageName && (() => {
                const validation = validatePageName(customPageName);
                return !validation.valid ? (
                  <p style={{
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    margin: '0.5rem 0 0 0'
                  }}>
                    ❌ {validation.message}
                  </p>
                ) : (
                  <p style={{
                    color: '#10b981',
                    fontSize: '0.75rem',
                    marginTop: '0.5rem',
                    margin: '0.5rem 0 0 0'
                  }}>
                    ✅ 页面名称可用
                  </p>
                );
              })()}
              <p style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                margin: '0.5rem 0 0 0'
              }}>
                📍 发布地址预览: pages/{customPageName || '[页面名称]'}
              </p>
            </div>

            {publishedPages.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  已发布的页面:
                </label>
                <div style={{
                  maxHeight: '100px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '0.5rem'
                }}>
                  {publishedPages.map((pageName, index) => (
                    <div key={index} style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      padding: '0.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>📄 {pageName}</span>
                      <span style={{ color: '#9ca3af' }}>pages/{pageName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowPublishDialog(false);
                  setCustomPageName('');
                }}
                disabled={isPublishing}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: isPublishing ? 'not-allowed' : 'pointer',
                  opacity: isPublishing ? 0.5 : 1
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isPublishing || !customPageName.trim() || !validatePageName(customPageName).valid}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: (isPublishing || !customPageName.trim() || !validatePageName(customPageName).valid) 
                    ? '#9ca3af' 
                    : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: (isPublishing || !customPageName.trim() || !validatePageName(customPageName).valid) 
                    ? 'not-allowed' 
                    : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isPublishing ? (
                  <>
                    <div style={{ 
                      width: '14px', 
                      height: '14px', 
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    发布中...
                  </>
                ) : (
                  <>
                    🚀 确认发布
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaudeApp;