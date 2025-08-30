// Scroll test utilities for debugging

export const forceScrollbarVisibility = () => {
  // Add CSS to force scrollbar visibility
  const style = document.createElement('style');
  style.textContent = `
    .messages-container {
      overflow-y: scroll !important;
      scrollbar-width: thin !important;
      scrollbar-color: #cbd5e0 #f8fafc !important;
    }
    
    .messages-container::-webkit-scrollbar {
      width: 8px !important;
      background: #f8fafc !important;
    }
    
    .messages-container::-webkit-scrollbar-track {
      background: #f8fafc !important;
      border-radius: 4px !important;
    }
    
    .messages-container::-webkit-scrollbar-thumb {
      background: #cbd5e0 !important;
      border-radius: 4px !important;
      min-height: 20px !important;
    }
    
    .messages-container::-webkit-scrollbar-thumb:hover {
      background: #94a3b8 !important;
    }
  `;
  document.head.appendChild(style);
};

export const checkScrollProperties = (element: HTMLElement | null) => {
  if (!element) return;
  
  console.log('Scroll Debug Info:', {
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    offsetHeight: element.offsetHeight,
    scrollTop: element.scrollTop,
    overflowY: window.getComputedStyle(element).overflowY,
    isScrollable: element.scrollHeight > element.clientHeight
  });
};