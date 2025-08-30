import React from 'react';
import { History, RotateCcw, RotateCw, GitBranch, Clock } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';

export const VersionHistory: React.FC = () => {
  const { 
    versionManager, 
    switchToVersion, 
    rollback, 
    forward 
  } = usePageStore();

  const versions = versionManager.getHistory();
  const currentVersion = versionManager.getCurrentVersion();
  const canRollback = versionManager.canRollback();
  const canForward = versionManager.canForward();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-800">版本历史</h3>
            <span className="text-sm text-gray-500">({versions.length})</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={rollback}
              disabled={!canRollback}
              className={`p-2 rounded ${
                canRollback 
                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="回到上一版本"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={forward}
              disabled={!canForward}
              className={`p-2 rounded ${
                canForward 
                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="前进到下一版本"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 版本列表 */}
      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无版本历史</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {versions
              .slice()
              .reverse() // 最新版本在上
              .map((version, index) => {
                const isCurrentVersion = currentVersion?.id === version.id;
                const isLatest = index === 0;
                
                return (
                  <div
                    key={version.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      isCurrentVersion 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => switchToVersion(version.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {isLatest && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              最新
                            </span>
                          )}
                          {isCurrentVersion && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              当前
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {version.message}
                        </h4>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(version.timestamp)}</span>
                          </div>
                          
                          {version.patches.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <GitBranch className="w-3 h-3" />
                              <span>{version.patches.length} 个修改</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 显示主要变更 */}
                        {version.patches.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-600 space-y-1">
                              {version.patches.slice(0, 3).map((patch, patchIndex) => (
                                <div key={patchIndex} className="truncate">
                                  <span className="font-mono bg-gray-100 px-1 rounded">
                                    {patch.op}
                                  </span>
                                  <span className="ml-1">
                                    {patch.path.replace(/^\//, '').replace(/\//g, ' → ')}
                                  </span>
                                </div>
                              ))}
                              {version.patches.length > 3 && (
                                <div className="text-gray-400">
                                  ...还有 {version.patches.length - 3} 个修改
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};