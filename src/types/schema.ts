// 导购页核心数据结构
export interface PageLayout {
  hero: {
    headline: string;
    subhead: string;
    cta: string;
    image: string;
  };
  usps: Array<{
    icon: string;
    text: string;
  }>;
  science?: {
    pain: string;
    cause: string;
    tips: Array<{
      tip: string;
      why: string;
    }>;
    refs: Array<{
      title: string;
      url: string;
      year: number;
    }>;
    disclaimer?: string;
  };
  specs?: Array<{
    k: string;
    v: string;
  }>;
  faq?: Array<{
    q: string;
    a: string;
  }>;
  offer?: {
    badge?: string;
    expiresAt?: string;
  };
}

// 品牌配置
export interface BrandConfig {
  name: string;
  logoUrl: string;
  colors: {
    primary: string;
    accent: string;
  };
  font: string;
  tone: "friendly" | "professional" | "bold";
  forbidden: string[];
}

// Patch操作类型 (基于 RFC 6902)
export interface PatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: any;
  from?: string;
}

// 版本管理
export interface PageVersion {
  id: string;
  timestamp: number;
  message: string;
  patches: PatchOperation[];
  layout: PageLayout;
}

// AI聊天消息
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  patches?: PatchOperation[];
}

// 初始页面数据
export const initialPageLayout: PageLayout = {
  hero: {
    headline: "革新护肤体验，焕发肌肤光彩",
    subhead: "采用独特科研配方，为您带来专业级护理效果",
    cta: "立即体验",
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800"
  },
  usps: [
    { icon: "✨", text: "7天见效，肌肤明显改善" },
    { icon: "🧪", text: "科研配方，安全温和" },
    { icon: "🏆", text: "10万+用户信赖选择" }
  ],
  faq: [
    {
      q: "产品适合敏感肌使用吗？",
      a: "是的，我们的产品经过敏感肌测试，温和不刺激，适合各种肌肤类型。"
    }
  ]
};

export const defaultBrandConfig: BrandConfig = {
  name: "BeautyLab",
  logoUrl: "",
  colors: {
    primary: "#3b82f6",
    accent: "#10b981"
  },
  font: "Inter",
  tone: "professional",
  forbidden: ["绝对", "保证", "立即见效"]
};