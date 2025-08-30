import React, { useState } from 'react';
import { Code, Eye, EyeOff, Save, RotateCcw } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';
import { PageLayout } from '../../types/schema';

export const JsonEditor: React.FC = () => {
  const { layout, updateLayout } = usePageStore();
  const [jsonText, setJsonText] = useState(JSON.stringify(layout, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  // 验证JSON格式
  const validateJson = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      
      // 基本结构验证
      if (!parsed.hero || !parsed.usps) {
        throw new Error('缺少必需的字段: hero, usps');
      }
      
      setError(null);
      setIsValid(true);
      return parsed as PageLayout;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '无效的JSON格式';
      setError(errorMsg);
      setIsValid(false);
      return null;
    }
  };

  // 处理JSON文本变化
  const handleJsonChange = (text: string) => {
    setJsonText(text);
    validateJson(text);
  };

  // 应用JSON更改
  const applyJsonChanges = () => {
    const parsedLayout = validateJson(jsonText);
    if (parsedLayout) {
      updateLayout(parsedLayout);
    }
  };

  // 重置为当前布局
  const resetJson = () => {
    const currentJson = JSON.stringify(layout, null, 2);
    setJsonText(currentJson);
    setError(null);
    setIsValid(true);
  };

  // 格式化JSON
  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
    } catch (err) {
      // 如果格式化失败，不做任何操作
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Code className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">JSON 编辑器</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={formatJson}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
            title="格式化JSON"
          >
            格式化
          </button>
          
          <button
            onClick={resetJson}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded flex items-center space-x-1"
            title="重置为当前状态"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重置</span>
          </button>
          
          <button
            onClick={applyJsonChanges}
            disabled={!isValid}
            className={`px-3 py-1 text-sm rounded flex items-center space-x-1 ${
              isValid
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-3 h-3" />
            <span>应用</span>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* JSON编辑区域 */}
      <div className="flex-1 p-4">
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          className={`w-full h-full font-mono text-sm resize-none border rounded-lg p-3 focus:outline-none focus:ring-2 ${
            isValid
              ? 'border-gray-300 focus:ring-blue-500'
              : 'border-red-300 focus:ring-red-500 bg-red-50'
          }`}
          placeholder="在此编辑页面JSON数据..."
        />
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className={`flex items-center space-x-1 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {isValid ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{isValid ? '格式正确' : '格式错误'}</span>
            </span>
            
            <span className="text-gray-500">
              {jsonText.split('\n').length} 行
            </span>
          </div>
          
          <span className="text-gray-500">
            Ctrl+A 全选 | Ctrl+Z 撤销 | Tab 缩进
          </span>
        </div>
      </div>
    </div>
  );
};

// 简单的语法高亮组件（可选）
export const SyntaxHighlighter: React.FC<{ code: string }> = ({ code }) => {
  // 这里可以集成更强大的语法高亮库如 react-syntax-highlighter
  return (
    <pre className="font-mono text-sm overflow-auto">
      <code>{code}</code>
    </pre>
  );
};