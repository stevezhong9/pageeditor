import React, { useState, useRef, useEffect } from 'react';
import { applyPatch } from 'fast-json-patch';
import { ClaudeAPIService, MockAIService, PatchOperation } from './services/claudeAPI';
import { forceScrollbarVisibility, checkScrollProperties } from './utils/scrollTest';
import { DownloadService } from './services/downloadService';
import { PublishService } from './services/publishService';
import { FilePublishService } from './services/filePublishService';
import { BlobPublishService } from './services/blobPublishService';
import PublishDialog from './components/PublishDialog';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  patches?: any[];
}

// ProductImageGallery Component
interface ProductImageGalleryProps {
  images: Array<{ url: string; alt: string; originalUrl?: string }>;
  style?: React.CSSProperties;
}

function ProductImageGallery({ images, style }: ProductImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  
  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentImageIndex];

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    setImageAspectRatio(aspectRatio);
  };

  return (
    <div style={{ ...style, width: '100%' }}>
      
      {/* Main Image */}
      <div style={{
        marginBottom: images.length > 1 ? '1rem' : '0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        backgroundColor: '#f8fafc',
        maxWidth: '500px',
        margin: '0 auto 1rem auto',
        // Dynamic height based on aspect ratio
        minHeight: imageAspectRatio ? 
          (imageAspectRatio > 1.5 ? '250px' : imageAspectRatio < 0.8 ? '400px' : '300px') : '300px'
      }}>
        <img
          src={currentImage.url}
          alt={currentImage.alt}
          onLoad={handleImageLoad}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: imageAspectRatio && imageAspectRatio < 0.8 ? '600px' : '500px',
            minHeight: '200px',
            objectFit: 'contain',
            display: 'block',
            transition: 'opacity 0.3s ease'
          }}
        />
      </div>

      {/* Thumbnail Gallery - Always show when multiple images */}
      {images.length > 1 && (
        <div>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: '100%',
            overflowX: 'auto',
            padding: '0.5rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '16px',
            border: '1px solid #e2e8f0'
          }}>
          {images.map((image, index) => (
            <div
              key={index}
              style={{
                cursor: 'pointer',
                borderRadius: '12px',
                overflow: 'hidden',
                border: currentImageIndex === index ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                transition: 'all 0.3s ease',
                flexShrink: 0,
                boxShadow: currentImageIndex === index 
                  ? '0 8px 20px rgba(59, 130, 246, 0.3)' 
                  : '0 4px 8px rgba(0, 0, 0, 0.1)',
                transform: currentImageIndex === index ? 'scale(1.05)' : 'scale(1)'
              }}
              onClick={() => {
                setCurrentImageIndex(index);
                setImageAspectRatio(null); // Reset aspect ratio for new image
              }}
              onMouseEnter={(e) => {
                // Switch to this image on hover
                setCurrentImageIndex(index);
                setImageAspectRatio(null);
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = currentImageIndex === index ? 'scale(1.05)' : 'scale(1)';
                e.currentTarget.style.boxShadow = currentImageIndex === index 
                  ? '0 8px 20px rgba(59, 130, 246, 0.3)' 
                  : '0 4px 8px rgba(0, 0, 0, 0.1)';
              }}
            >
              <img
                src={image.url}
                alt={`${image.alt} - 缩略图 ${index + 1}`}
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'contain',
                  display: 'block',
                  backgroundColor: '#f8fafc'
                }}
              />
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div style={{
          textAlign: 'center',
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          {currentImageIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
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
      ctaColor: "#f97316", // 橙色
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
  
  // Product URL form state - simplified
  const [productUrl, setProductUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Current product URL from bookmark extraction
  const [currentProductUrl, setCurrentProductUrl] = useState('');
  
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

  // 处理书签工具数据 - 重新启用以支持更好的内容提取
  useEffect(() => {
    // 监听来自书签工具的postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PAGEEDITOR_DATA') {
        const data = event.data.data;
        console.log('📖 接收到书签工具数据:', data);
        
        // 直接调用分析API处理书签数据
        handleBookmarkletData(data);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // 检查localStorage中的书签数据
    const checkStoredData = () => {
      try {
        const storedData = localStorage.getItem('pageeditor_extracted_data');
        if (storedData) {
          const data = JSON.parse(storedData);
          console.log('📖 发现本地存储的书签数据:', data);
          
          // 处理存储的数据
          handleBookmarkletData(data);
          
          // 清除已使用的数据
          localStorage.removeItem('pageeditor_extracted_data');
        }
      } catch (e) {
        console.error('解析书签数据失败:', e);
      }
    };

    // 页面加载时检查数据
    checkStoredData();
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 处理书签工具提取的数据
  const handleBookmarkletData = async (data: any) => {
    setIsGenerating(true);
    
    try {
      // 显示处理消息
      const processingMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📖 已接收书签工具数据！\n\n✅ 页面: ${data.title || '未知'}\n📄 内容: ${data.content ? Math.min(data.content.length, 1000) + '...' : '无'}\n🖼️ 图片: ${data.images ? data.images.length : 0} 张\n🔗 来源: ${data.url || '未知'}\n\n🤖 正在进行AI智能分析...`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, processingMsg]);

      // 调用浏览器内容分析API
      const response = await fetch('/api/analyze-browser-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: data.url,
          title: data.title,
          content: data.content,
          images: data.images || []
        })
      });

      if (!response.ok) {
        throw new Error(`内容分析失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.pageData) {
        // 更新页面数据
        setPageData(result.pageData);
        
        // 保存商品URL
        setCurrentProductUrl(data.url || '');
        
        // 显示成功消息
        const imageProcessing = result.extractedInfo?.imageProcessing;
        const imageStatusText = imageProcessing 
          ? `• 图片处理: ${imageProcessing.successful}/${imageProcessing.attempted} 张成功${imageProcessing.failed > 0 ? ` (${imageProcessing.failed}张失败)` : ''}`
          : `• 图片: ${result.extractedInfo?.imageCount || 0} 张`;
        
        const successMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🎉 书签数据分析完成！\n\n✅ 已生成导购页面:\n• 标题: ${result.pageData.hero?.headline || '未提取'}\n• 描述: ${result.pageData.hero?.subhead || '未提取'}\n• 特性: ${result.pageData.usps?.length || 0} 个卖点\n• 文本长度: ${result.extractedInfo?.textLength || 0} 字符\n${imageStatusText}\n\n您可以继续通过AI对话进行个性化调整！`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, successMsg]);
      } else {
        throw new Error(result.message || '分析书签数据失败');
      }
      
    } catch (error) {
      console.error('书签数据处理失败:', error);
      
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 书签数据处理失败: ${error instanceof Error ? error.message : '未知错误'}\n\n🔧 您可以尝试:\n• 重新在商品页面点击书签\n• 或者使用下方的URL输入方式\n• 或者直接通过AI对话创建页面`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

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
    
    try {
      setMessages(prev => {
        if (!Array.isArray(prev)) {
          console.error('Messages state is corrupted when adding user message, resetting');
          return [userMsg];
        }
        return [...prev, userMsg];
      });
    } catch (stateError) {
      console.error('Failed to add user message:', stateError);
      // This is critical - if we can't add user message, reset and try again
      setMessages([userMsg]);
    }
    
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
        if (!claudeService) {
          throw new Error('Claude服务初始化失败');
        }
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
        try {
          const result = applyPatch({ ...pageData }, patches);
          if (result.newDocument) {
            setPageData(result.newDocument);
          } else {
            throw new Error('应用补丁失败：返回了无效的数据结构');
          }
        } catch (patchError) {
          console.error('Patch application failed:', patchError);
          throw new Error('应用页面修改失败: ' + (patchError instanceof Error ? patchError.message : '未知错误'));
        }
        
        // Describe what was changed
        const changes = patches.map((patch: any) => {
          if (patch.path.includes('/hero/headline')) return '• 更新了主标题';
          if (patch.path.includes('/hero/subhead')) return '• 更新了副标题';
          if (patch.path.includes('/hero/cta') && !patch.path.includes('ctaColor')) return '• 更新了行动按钮文案';
          if (patch.path.includes('/hero/ctaColor')) return '• 更新了行动按钮颜色';
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
          patches: patches || []
        };
        
        // Safely update messages state
        try {
          setMessages(prev => {
            if (!Array.isArray(prev)) {
              console.error('Messages state is corrupted, resetting');
              return [assistantMsg];
            }
            return [...prev, assistantMsg];
          });
        } catch (stateError) {
          console.error('Failed to update messages state:', stateError);
          throw new Error('状态更新失败: 无法添加助手回复');
        }
        
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
        try {
          setMessages(prev => {
            if (!Array.isArray(prev)) {
              console.error('Messages state is corrupted, resetting');
              return [assistantMsg];
            }
            return [...prev, assistantMsg];
          });
        } catch (stateError) {
          console.error('Failed to update messages state:', stateError);
          throw new Error('状态更新失败: 无法添加助手回复');
        }
      }
      
    } catch (error) {
      console.error('AI processing failed:', error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 处理失败: ${error instanceof Error ? error.message : '未知错误'}\n\n${useClaudeAPI ? '请检查API Key是否正确，或切换到模拟模式继续体验。' : ''}`,
        timestamp: Date.now()
      };
      try {
        setMessages(prev => {
          if (!Array.isArray(prev)) {
            console.error('Messages state is corrupted during error handling, resetting');
            return [errorMsg];
          }
          return [...prev, errorMsg];
        });
      } catch (stateError) {
        console.error('Failed to update messages state during error handling:', stateError);
        // Reset messages state as last resort
        setMessages([errorMsg]);
      }
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
      // 验证页面名称
      const validation = FilePublishService.validatePageName(customPageName.trim());
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // 页面存在性检查由API端点处理
      
      // Debug: 检查当前商品URL
      console.log('🔍 发布调试信息:', {
        pageName: customPageName.trim(),
        currentProductUrl: currentProductUrl,
        hasProductUrl: !!currentProductUrl
      });

      const result = await BlobPublishService.publishPage(pageData, brandConfig, {
        pageName: customPageName.trim(),
        includeSources: true,
        productUrl: currentProductUrl
      });

      if (result.success) {
        // 更新已发布页面列表
        setPublishedPages(PublishService.getPublishedPages());
        
        // 添加成功消息到聊天
        const successMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 页面发布成功！\n\n📍 访问地址: ${result.url}\n📁 生成文件: ${result.files?.length || 0} 个\n\n页面已成功部署，您可以立即访问！\n\n🔗 [点击新标签页打开](${result.url})`,
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
    return BlobPublishService.validatePageName(name);
  };

  // 处理商品网址生成导购页 - 使用浏览器内容提取
  const handleGenerateFromUrl = async () => {
    if (!productUrl.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // 验证URL格式
      const url = new URL(productUrl.trim());
      
      // 添加处理中消息到聊天
      const processingMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🔍 正在智能分析商品页面: ${url.href}\n\n🌐 步骤1: 在新窗口打开商品页面\n⏰ 步骤2: 等待页面加载完成\n👍 步骤3: 手动关闭窗口即可开始分析`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, processingMsg]);

      // 在新窗口打开商品页面并提取内容
      const popup = window.open(url.href, '_blank', 'width=1200,height=800,scrollbars=yes');
      
      if (!popup) {
        throw new Error('无法打开新窗口，请允许弹窗后重试');
      }

      // 等待页面加载并允许用户手动关闭窗口
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 120; // 最多等待120秒（给用户更多时间）
        let lastExtractedData: any = null;
        let hasTriedExtraction = false;
        
        // 更新提示消息
        const updateMessage: ChatMessage = {
          id: (Date.now() + 0.5).toString(),
          role: 'assistant',
          content: `🔍 已在新窗口打开商品页面\n\n✨ 请等待页面完全加载，确认可以看到商品信息后，手动关闭该窗口即可开始分析\n\n📝 系统将自动提取页面内容并进行AI分析`,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev.slice(0, -1), updateMessage]); // 替换最后一条消息
        
        const checkAndExtract = () => {
          attempts++;
          
          // 如果窗口被关闭，尝试使用最后一次提取的数据
          if (popup.closed) {
            if (lastExtractedData) {
              console.log('👍 用户手动关闭窗口，使用已准备的内容');
              resolve(lastExtractedData);
            } else {
              // 即使没有提取到内容，也创建一个基本的数据结构
              console.log('⚠️ 窗口关闭但没有提取到内容，使用备用方案');
              const fallbackData = {
                url: url.href,
                title: '商品页面分析',
                content: `${url.href.includes('taobao') ? '淘宝商品' : url.href.includes('jd.com') ? '京东商品' : url.href.includes('tmall') ? '天猫商品' : '电商商品'} 精选优质 品质保证 快速配送 售后无忧 用户好评 值得信赖 专业品质 精心精选 优质服务 贴心售后`,
                images: []
              };
              resolve(fallbackData);
            }
            return;
          }
          
          if (attempts > maxAttempts) {
            // 超时后尝试使用已提取的内容
            popup.close();
            if (lastExtractedData) {
              resolve(lastExtractedData);
            } else {
              // 超时也使用备用数据
              const timeoutFallbackData = {
                url: url.href,
                title: '商品页面分析',
                content: `${url.href.includes('taobao') ? '淘宝商品' : url.href.includes('jd.com') ? '京东商品' : url.href.includes('tmall') ? '天猫商品' : '电商商品'} 精选优质 品质保证 快速配送 售后无忧 用户好评 值得信赖`,
                images: []
              };
              resolve(timeoutFallbackData);
            }
            return;
          }

          try {
            // 尝试提取页面内容
            let extractedData = null;
            let canAccessDocument = false;
            
            try {
              // 检查是否可以访问跨域文档
              if (popup.document && popup.document.domain) {
                canAccessDocument = true;
                extractedData = extractContentFromPage(popup.document, url.href);
              }
            } catch (crossOriginError) {
              console.log('⚠️ 跨域限制，无法访问页面DOM，使用备用方案');
              canAccessDocument = false;
            }
            
            // 如果可以访问且提取到有效内容
            if (canAccessDocument && extractedData && extractedData.content && extractedData.content.length > 50) {
              lastExtractedData = extractedData;
              hasTriedExtraction = true;
              console.log('✅ 已提取页面内容，等待用户关闭窗口');
              
              const readyMessage: ChatMessage = {
                id: (Date.now() + 0.7).toString(),
                role: 'assistant', 
                content: `✅ 页面已加载完成！\n\n👍 已提取到商品信息（${lastExtractedData.content.length}字符）\n🖼️ 发现 ${lastExtractedData.images?.length || 0} 张商品图片\n\n🔒 请手动关闭商品页面窗口，系统将立即开始分析`,
                timestamp: Date.now()
              };
              setMessages(prev => [...prev.slice(0, -1), readyMessage]);
            } else if (!canAccessDocument && attempts > 5) {
              // 跨域限制且已等待一段时间，提示用户可以关闭窗口
              if (!hasTriedExtraction) {
                hasTriedExtraction = true;
                // 创建一个基本的备用数据结构
                lastExtractedData = {
                  url: url.href,
                  title: '商品页面', // 默认标题
                  content: `精选商品 优质品质 快速配送 售后保障 用户好评 值得信赖 ${url.href.includes('taobao') ? '淘宝商品' : url.href.includes('jd.com') ? '京东商品' : url.href.includes('tmall') ? '天猫商品' : '精选商品'} 专业品质 用户信赖的选择`,
                  images: [] // 暂时无法提取图片
                };
                
                const crossOriginMessage: ChatMessage = {
                  id: (Date.now() + 0.8).toString(),
                  role: 'assistant',
                  content: `⚠️ 检测到跨域限制，无法直接访问页面内容\n\n🛠️ 已启用备用方案，将使用智能分析生成导购页\n\n👍 请手动关闭商品页面窗口，系统将开始分析`,
                  timestamp: Date.now()
                };
                setMessages(prev => [...prev.slice(0, -1), crossOriginMessage]);
              }
            }
            
            setTimeout(checkAndExtract, 1000);
          } catch (e) {
            console.log('检查页面时发生错误:', e.message);
            // 继续等待
            setTimeout(checkAndExtract, 1500);
          }
        };
        
        // 开始检查
        setTimeout(checkAndExtract, 2000); // 等待2秒后开始检查
      }).then(async (extractedData: any) => {
        // 调用浏览器内容分析API
        const response = await fetch('/api/analyze-browser-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(extractedData)
        });

        if (!response.ok) {
          throw new Error(`内容分析失败: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.pageData) {
          // 更新页面数据
          setPageData(result.pageData);
          
          // 添加成功消息
          const successMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `🎉 导购页生成成功！\n\n✅ 已分析商品信息:\n• 标题: ${result.pageData.hero?.headline || '未提取'}\n• 描述: ${result.pageData.hero?.subhead || '未提取'}\n• 特性: ${result.pageData.usps?.length || 0} 个卖点\n• 文本长度: ${result.extractedInfo?.textLength || 0} 字符\n• 图片: ${result.extractedInfo?.imageCount || 0} 张\n\n您可以继续通过AI对话进行个性化调整！`,
            timestamp: Date.now()
          };
          setMessages(prev => [...prev, successMsg]);
          
          // 清空URL输入
          setProductUrl('');
        } else {
          throw new Error(result.message || '提取商品信息失败');
        }
      });
      
    } catch (error) {
      console.error('Generate from URL failed:', error);
      
      // 添加错误消息
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 生成失败: ${error instanceof Error ? error.message : '未知错误'}\n\n📝 正确操作步骤:\n1️⃣ 点击“智能分析”按钮\n2️⃣ 允许浏览器弹窗打开商品页面\n3️⃣ 等待页面完全加载（可以看到商品信息）\n4️⃣ 直接关闭商品页面窗口（无需等待提示）\n5️⃣ 系统会自动使用备用方案分析\n\n🔧 如果还是失败，请尝试直接使用AI对话功能手动创建页面。`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // 从页面DOM提取内容的函数
  const extractContentFromPage = (doc: Document, url: string) => {
    try {
      const title = doc.title || '';
      let content = '';
      
      console.log('🔍 开始提取页面内容，标题:', title);
      
      // 尝试提取主要内容
      const contentSelectors = [
        '.product-detail', '.item-detail', '.product-info', '.goods-detail', '.product-content',
        '[class*="product"]', '[class*="item"]', '[class*="goods"]', '[id*="product"]',
        '.detail', '.description', '.summary',
        'main', '.main', '#main', '.content', '#content', '.container'
      ];
      
      let extracted = false;
      for (const selector of contentSelectors) {
        try {
          const elements = doc.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent || '';
            if (text.length > 200) {
              content = text;
              extracted = true;
              console.log(`✅ 使用选择器 "${selector}" 提取到内容:`, text.substring(0, 100) + '...');
              break;
            }
          }
          if (extracted) break;
        } catch (selectorError) {
          console.log(`⚠️ 选择器 "${selector}" 失败:`, selectorError.message);
        }
      }
      
      // 如果没有找到特定区域，提取body内容
      if (!extracted && doc.body) {
        try {
          content = doc.body.textContent || '';
          console.log('📄 使用body内容，长度:', content.length);
        } catch (bodyError) {
          console.log('⚠️ 无法访问body内容:', bodyError.message);
        }
      }
      
      // 如果还是没有内容，使用标题作为内容
      if (!content || content.length < 50) {
        content = title || '商品页面';
        console.log('⚠️ 无法提取足够内容，使用标题作为备用');
      }
      
      // 清理内容
      content = content
        .replace(/\s+/g, ' ')
        .replace(/登录|注册|购物车|客服|帮助|首页|导航|菜单/g, '')
        .trim()
        .substring(0, 8000); // 限制长度
      
      // 提取图片链接
      const images: string[] = [];
      try {
        let imgElements = doc.querySelectorAll('img[src*="product"], img[src*="item"], img[src*="goods"], .product img, .item img, .goods img');
        
        if (imgElements.length === 0) {
          imgElements = doc.querySelectorAll('img');
        }
        
        for (let i = 0; i < Math.min(imgElements.length, 5); i++) {
          const img = imgElements[i] as HTMLImageElement;
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
          if (src && src.indexOf('http') === 0 && src.indexOf('data:') !== 0) {
            // 放松图片尺寸限制，因为某些图片可能还未加载
            images.push(src);
          }
        }
        console.log('🖼️ 提取到图片数量:', images.length);
      } catch (imageError) {
        console.log('⚠️ 图片提取失败:', imageError.message);
      }
      
      const result = {
        url: url,
        title: title || '商品页面',
        content: content,
        images: images
      };
      
      console.log('✅ 最终提取结果:', {
        title: result.title,
        contentLength: result.content.length,
        imageCount: result.images.length
      });
      
      return result;
      
    } catch (error) {
      console.log('❌ DOM提取失败:', error.message);
      
      // 返回一个基本的备用结果
      return {
        url: url,
        title: '商品页面分析',
        content: `${url.includes('taobao') ? '淘宝商品' : url.includes('jd.com') ? '京东商品' : url.includes('tmall') ? '天猫商品' : '电商商品'} 精选优质 品质保证 快速配送`,
        images: []
      };
    }
  };

  // 渲染消息内容，支持Markdown链接
  const renderMessageContent = (content: string) => {
    // 简单的Markdown链接解析：[text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // 添加链接前的文本
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // 添加链接
      const [, linkText, url] = match;
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#3b82f6',
            textDecoration: 'underline',
            fontWeight: 600
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#1d4ed8';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#3b82f6';
          }}
        >
          {linkText}
        </a>
      );
      
      lastIndex = linkRegex.lastIndex;
    }
    
    // 添加剩余文本
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
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
              导购页AI生成工具
              {useClaudeAPI && <span style={{ 
                marginLeft: '0.5rem', 
                padding: '0.25rem 0.5rem', 
                background: '#10b981', 
                color: 'white', 
                fontSize: '0.75rem', 
                borderRadius: '9999px' 
              }}>
                SharetoX
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              请拖拽按钮到浏览器书签栏
            </span>
            <div style={{ position: 'relative' }}>
              <a href="javascript:(function(){var title=document.title||'';var url=window.location.href;var content='';var selectors=['.BasicContent--wrapper','.DetailModule--module','.ItemContent','.BasicContent','.tb-detail','.detail-content','.product-detail','.item-detail','.product-info','.goods-detail','[class*=product]','[class*=item]','[class*=goods]','[id*=product]','.tm-detail','.tb-property','.J_DivItemDesc','#J_DivItemDesc','main','.main','#main','.content','#content'];var extracted=false;for(var i=0;i<selectors.length&&!extracted;i++){try{var elements=document.querySelectorAll(selectors[i]);for(var k=0;k<elements.length;k++){var element=elements[k];if(element){var text=element.innerText||element.textContent||'';if(text.length>200){content=text;extracted=true;break;}}}}catch(e){}}if(!extracted){try{var allText=document.body.innerText||document.body.textContent||'';var lines=allText.split('\\n').filter(function(line){return line.trim().length>10&&!line.match(/登录|注册|购物车|客服|帮助|首页|导航|菜单|搜索|热门|推荐|收藏|关注|分享/);});content=lines.slice(0,20).join(' ');}catch(e){content='淘宝商品 优质商品 精选好货 快速配送';}}content=content.replace(/\\s+/g,' ').replace(/登录|注册|购物车|客服|帮助|首页|导航|菜单|搜索|热门|推荐|收藏|关注|分享|立即购买|加入购物车|现货|有库存|满减|优惠券|领券|关店|店铺/g,'').trim();if(content.length>8000){content=content.substring(0,8000);}if(content.length<50){content='淘宝精选商品 优质好货 品质保证 快速配送 用户好评推荐';}var images=[];try{var imgs=document.querySelectorAll('img');var imgData=[];for(var i=0;i<imgs.length;i++){var img=imgs[i];var srcs=[img.src,img.getAttribute('data-src'),img.getAttribute('data-original'),img.getAttribute('data-lazy-src'),img.getAttribute('data-ks-lazyload'),img.getAttribute('data-lazy')];for(var s=0;s<srcs.length;s++){var src=srcs[s];if(src&&src.indexOf('http')===0&&src.indexOf('data:')!==0){var rect=img.getBoundingClientRect();var score=rect.width*rect.height;if(rect.width<100||rect.height<100)score=0;if(src.includes('logo')||src.includes('banner')||src.includes('icon')||src.includes('button')||src.includes('nav')||src.includes('menu'))score=0;if(src.includes('jfs.jd.com'))score+=80000;if(src.includes('400x400')||src.includes('800x800')||src.includes('_400x400')||src.includes('_800x800'))score+=100000;if(src.includes('product')||src.includes('item')||src.includes('goods')||src.includes('TB1')||src.includes('TB2'))score+=50000;if(img.alt&&(img.alt.includes('商品')||img.alt.includes('产品')))score+=30000;if(src.includes('.taobao.')||src.includes('.tmall.')||src.includes('.alicdn.'))score+=20000;if(img.className&&(img.className.includes('product')||img.className.includes('item')||img.className.includes('goods')))score+=40000;if(img.parentElement&&img.parentElement.className&&(img.parentElement.className.includes('product')||img.parentElement.className.includes('item')))score+=35000;imgData.push({src:src,score:score});break;}}}imgData.sort(function(a,b){return b.score-a.score;});for(var j=0;j<Math.min(imgData.length,5);j++){images.push(imgData[j].src);}}catch(e){}var data={title:title,url:url,content:content,images:images,timestamp:new Date().toISOString()};localStorage.setItem('pageeditor_extracted_data',JSON.stringify(data));var pageUrl=window.location.hostname.includes('localhost')?'http://localhost:3001':'https://pageeditor.sharetox.com';var popup=window.open(pageUrl,'pageeditor','width=1200,height=800,scrollbars=yes,resizable=yes');if(!popup){alert('数据已提取！请手动打开 PageEditor 页面。');}else{setTimeout(function(){try{popup.postMessage({type:'PAGEEDITOR_DATA',data:data},'*');}catch(e){}},2000);}})()"
                style={{
                  display: 'inline-block',
                  background: '#f97316',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'move',
                  transition: 'all 0.2s',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ea580c';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  const tooltip = e.currentTarget.parentElement?.querySelector('.bookmark-tooltip') as HTMLElement;
                  if (tooltip) tooltip.style.display = 'block';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f97316';
                  e.currentTarget.style.transform = 'translateY(0)';
                  const tooltip = e.currentTarget.parentElement?.querySelector('.bookmark-tooltip') as HTMLElement;
                  if (tooltip) tooltip.style.display = 'none';
                }}
              >
                一键生成导购页
              </a>
              <div
                className="bookmark-tooltip"
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  background: '#1f2937',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  minWidth: '280px',
                  zIndex: 1000
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                  📖 书签工具使用方法：
                </div>
                <div>
                  1️⃣ 将按钮拖拽到浏览器书签栏<br/>
                  2️⃣ 打开任意电商商品页面<br/>
                  3️⃣ 点击书签栏中的按钮<br/>
                  4️⃣ 自动提取商品信息并生成导购页
                </div>
              </div>
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
            borderTopRightRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>💬 AI 对话编辑</span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span 
                style={{
                  cursor: 'help',
                  fontSize: '1rem',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6';
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                  if (tooltip) tooltip.style.display = 'block';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6b7280';
                  e.currentTarget.style.background = 'transparent';
                  const tooltip = e.currentTarget.nextElementSibling as HTMLElement;
                  if (tooltip) tooltip.style.display = 'none';
                }}
              >
                ℹ️
              </span>
              <div
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  background: '#1f2937',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  minWidth: '320px',
                  maxWidth: '400px',
                  zIndex: 1000,
                  whiteSpace: 'pre-line'
                }}
              >
                {`✅ 可以修改的元素：
• 主标题和副标题
• 按钮文字和颜色
• 卖点内容（可修改/新增）

❌ 不能修改的元素：
• 页面布局和样式
• 图片和背景
• 字体和间距

🎨 支持的按钮颜色：
橙色、红色、绿色、蓝色、紫色

💬 示例指令：
"把标题改得更科技感"
"按钮颜色改为红色"
"添加环保卖点"`}
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '12px',
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid #1f2937'
                }}></div>
              </div>
            </div>
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
                    {renderMessageContent(message.content)}
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
                      animation: `spin 1s linear infinite`
                    }} />
                    打包中...
                  </>
                ) : (
                  <>
                    📦 下载
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
                🚀 发布
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
                background: pageData.hero.ctaColor || '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: `0 4px 6px ${pageData.hero.ctaColor || '#3b82f6'}40`,
                transform: 'translateY(0)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                const color = pageData.hero.ctaColor || '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 12px ${color}66`;
              }}
              onMouseOut={(e) => {
                const color = pageData.hero.ctaColor || '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 6px ${color}40`;
              }}>
                {pageData.hero.cta}
              </button>
              
              {/* Product Image Gallery */}
              <ProductImageGallery 
                images={pageData.images || (pageData.hero.image ? [{ url: pageData.hero.image, alt: '商品图片' }] : [])}
                style={{
                  margin: '2rem auto 0',
                  maxWidth: '600px'
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
                gridTemplateColumns: (() => {
                  if (window.innerWidth <= 768) return '1fr';
                  const uspCount = pageData.usps.length;
                  if (uspCount === 1) return '1fr';
                  if (uspCount === 2) return 'repeat(2, 1fr)';
                  if (uspCount === 3) return 'repeat(3, 1fr)';
                  if (uspCount === 4) return 'repeat(2, 1fr)';
                  if (uspCount === 5) return 'repeat(3, 1fr)';
                  return 'repeat(auto-fit, minmax(250px, 1fr))';
                })(),
                maxWidth: (() => {
                  const uspCount = pageData.usps.length;
                  if (uspCount === 1) return '400px';
                  if (uspCount === 2) return '800px';
                  return '100%';
                })(),
                margin: '0 auto'
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

      <PublishDialog
        showDialog={showPublishDialog}
        customPageName={customPageName}
        setCustomPageName={setCustomPageName}
        isPublishing={isPublishing}
        onPublish={handleConfirmPublish}
        onClose={() => setShowPublishDialog(false)}
        validatePageName={validatePageName}
        publishedPages={publishedPages}
      />
    </div>
  );
}

export default ClaudeApp;
