import React from 'react';
import { 
  MessageSquare, 
  Code, 
  History, 
  Eye,
  Download,
  Upload,
  Settings,
  Palette
} from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';

export const Toolbar: React.FC = () => {
  const { 
    showVersionHistory, 
    showJsonEditor,
    setShowVersionHistory,
    setShowJsonEditor
  } = usePageStore();

  const exportData = () => {
    const { layout, brandConfig, versionManager } = usePageStore.getState();
    
    const exportObj = {
      layout,
      brandConfig,
      versions: versionManager.getHistory(),
      exportedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportObj, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `landing-page-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          // 这里可以添加导入逻辑
          console.log('Import data:', data);
          alert('导入功能开发中...');
        } catch (error) {
          alert('文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      {/* 左侧：主要功能 */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={<MessageSquare className="w-4 h-4" />}
          label="对话编辑"
          active={!showJsonEditor && !showVersionHistory}
          onClick={() => {
            setShowJsonEditor(false);
            setShowVersionHistory(false);
          }}
        />
        
        <ToolbarButton
          icon={<Code className="w-4 h-4" />}
          label="JSON编辑"
          active={showJsonEditor}
          onClick={() => {
            setShowJsonEditor(!showJsonEditor);
            setShowVersionHistory(false);
          }}
        />
        
        <ToolbarButton
          icon={<History className="w-4 h-4" />}
          label="版本历史"
          active={showVersionHistory}
          onClick={() => {
            setShowVersionHistory(!showVersionHistory);
            setShowJsonEditor(false);
          }}
        />
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <ToolbarButton
          icon={<Eye className="w-4 h-4" />}
          label="全屏预览"
          onClick={() => alert('全屏预览功能开发中...')}
        />
      </div>

      {/* 中央：品牌标识 */}
      <div className="flex items-center space-x-2">
        <Palette className="w-5 h-5 text-blue-500" />
        <span className="font-semibold text-gray-800">Landing Page Editor</span>
      </div>

      {/* 右侧：设置和导出 */}
      <div className="flex items-center space-x-1">
        <ToolbarButton
          icon={<Upload className="w-4 h-4" />}
          label="导入"
          onClick={importData}
        />
        
        <ToolbarButton
          icon={<Download className="w-4 h-4" />}
          label="导出"
          onClick={exportData}
        />
        
        <ToolbarButton
          icon={<Settings className="w-4 h-4" />}
          label="设置"
          onClick={() => alert('设置功能开发中...')}
        />
      </div>
    </div>
  );
};

// 工具栏按钮组件
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  icon, 
  label, 
  active = false, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${active 
          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        }
      `}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};