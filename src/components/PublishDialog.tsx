import React from 'react';

interface PublishDialogProps {
  showDialog: boolean;
  customPageName: string;
  setCustomPageName: (name: string) => void;
  isPublishing: boolean;
  onPublish: () => void;
  onClose: () => void;
  validatePageName: (name: string) => { valid: boolean; message: string };
  publishedPages: string[];
}

const PublishDialog: React.FC<PublishDialogProps> = ({
  showDialog,
  customPageName,
  setCustomPageName,
  isPublishing,
  onPublish,
  onClose,
  validatePageName,
  publishedPages
}) => {
  if (!showDialog) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '12px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          发布导购页
        </h3>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            页面名称:
          </label>
          <input
            type="text"
            value={customPageName}
            onChange={(e) => setCustomPageName(e.target.value)}
            placeholder="输入页面名称 (例如: my-product-page)"
            disabled={isPublishing}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
            }}
          />
          {customPageName && (() => {
            const validation = validatePageName(customPageName);
            return (
              <p style={{
                fontSize: '0.75rem',
                marginTop: '0.5rem',
                color: validation.valid ? '#059669' : '#dc2626'
              }}>
                {validation.message}
              </p>
            );
          })()}
        </div>

        {publishedPages.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              已发布的页面：
            </p>
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
                  padding: '0.25rem 0',
                  display: 'flex',
                  justifyContent: 'space-between'
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
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isPublishing}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              opacity: isPublishing ? 0.6 : 1
            }}
          >
            取消
          </button>
          <button
            onClick={onPublish}
            disabled={isPublishing || !customPageName.trim() || !validatePageName(customPageName).valid}
            style={{
              padding: '0.75rem 1.5rem',
              background: isPublishing || !customPageName.trim() || !validatePageName(customPageName).valid 
                ? '#9ca3af' : '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isPublishing || !customPageName.trim() || !validatePageName(customPageName).valid 
                ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isPublishing ? (
              <>
                <div className="loading-spinner" />
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
  );
};

export default PublishDialog;