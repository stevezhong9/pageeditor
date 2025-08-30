import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { PageLayout, BrandConfig, ChatMessage, PatchOperation, initialPageLayout, defaultBrandConfig } from '../types/schema';
import { PatchEngine, VersionManager } from '../utils/patchEngine';

interface PageState {
  // Data state
  layout: PageLayout;
  brandConfig: BrandConfig;
  versionManager: VersionManager;
  
  // Chat state
  messages: ChatMessage[];
  isProcessing: boolean;
  
  // UI state
  showVersionHistory: boolean;
  showJsonEditor: boolean;
  
  // Actions
  applyPatches: (patches: PatchOperation[], message?: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  rollback: () => void;
  forward: () => void;
  switchToVersion: (versionId: string) => void;
  
  // UI Actions
  setShowVersionHistory: (show: boolean) => void;
  setShowJsonEditor: (show: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  
  // Direct layout update (for JSON editor)
  updateLayout: (newLayout: PageLayout) => void;
}

export const usePageStore = create<PageState>()(
  immer((set, get) => ({
    // Initial state
    layout: initialPageLayout,
    brandConfig: defaultBrandConfig,
    versionManager: new VersionManager(initialPageLayout),
    messages: [],
    isProcessing: false,
    showVersionHistory: false,
    showJsonEditor: false,

    // Apply Patch operations
    applyPatches: (patches: PatchOperation[], message = "AI modification") => {
      set((state) => {
        try {
          // Validate patches
          if (!PatchEngine.validatePatches(patches)) {
            console.error('Invalid patches detected');
            return;
          }

          // Optimize patches
          const optimizedPatches = PatchEngine.optimizePatches(patches);
          
          // Apply patches
          const newLayout = PatchEngine.applyPatches(state.layout, optimizedPatches);
          
          // Update state
          state.layout = newLayout;
          
          // Add to version history
          state.versionManager.addVersion(newLayout, message, optimizedPatches);
          
          console.log('Applied patches:', optimizedPatches);
        } catch (error) {
          console.error('Failed to apply patches:', error);
        }
      });
    },

    // Add chat message
    addMessage: (message) => {
      set((state) => {
        state.messages.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          ...message,
        });
      });
    },

    // Rollback version
    rollback: () => {
      set((state) => {
        const previousLayout = state.versionManager.rollback();
        if (previousLayout) {
          state.layout = previousLayout;
        }
      });
    },

    // Forward version
    forward: () => {
      set((state) => {
        const nextLayout = state.versionManager.forward();
        if (nextLayout) {
          state.layout = nextLayout;
        }
      });
    },

    // Switch to specific version
    switchToVersion: (versionId) => {
      set((state) => {
        const layout = state.versionManager.switchToVersion(versionId);
        if (layout) {
          state.layout = layout;
        }
      });
    },

    // UI state updates
    setShowVersionHistory: (show) => set((state) => { state.showVersionHistory = show; }),
    setShowJsonEditor: (show) => set((state) => { state.showJsonEditor = show; }),
    setIsProcessing: (processing) => set((state) => { state.isProcessing = processing; }),

    // Direct layout update
    updateLayout: (newLayout) => {
      set((state) => {
        const patches = PatchEngine.generatePatches(state.layout, newLayout);
        state.layout = newLayout;
        state.versionManager.addVersion(newLayout, "Manual edit", patches);
      });
    },
  }))
);