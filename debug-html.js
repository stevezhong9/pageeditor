// Debug script to test HTML generation
const { BlobPublishService } = require('./dist/services/blobPublishService');

// Mock data similar to what we use in the app
const layout = {
  hero: {
    headline: "测试商品标题",
    subhead: "这是测试商品的描述",
    cta: "立即购买",
    ctaColor: "#f97316"
  },
  usps: [
    { icon: "✨", text: "优质材料，品质保证" },
    { icon: "🚀", text: "快速配送，售后无忧" }
  ]
};

const brandConfig = {
  name: "Test Brand",
  colors: {
    primary: "#007bff",
    accent: "#28a745"
  }
};

const pageName = "test-page";
const productUrl = "https://www.taobao.com/item/123456";

try {
  const html = BlobPublishService.generateStandaloneHTML(layout, brandConfig, pageName, productUrl);
  console.log('Generated HTML contains:');
  
  // Check for button
  const buttonMatch = html.match(/<button onclick="[^"]*"[^>]*>/);
  if (buttonMatch) {
    console.log('✅ Button found:', buttonMatch[0]);
  } else {
    console.log('❌ Button not found');
  }
  
  // Check for function
  const functionMatch = html.match(/function handleProductCTAClick\(\)[^}]*}/s);
  if (functionMatch) {
    console.log('✅ Function found:', functionMatch[0]);
  } else {
    console.log('❌ Function not found');
  }
  
  // Save to file for inspection
  const fs = require('fs');
  fs.writeFileSync('./debug-output.html', html);
  console.log('📄 Full HTML saved to debug-output.html');
  
} catch (error) {
  console.error('❌ Error:', error);
}