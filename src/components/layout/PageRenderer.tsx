import React from 'react';
import { PageLayout, BrandConfig } from '../../types/schema';
import { HeroSection } from './HeroSection';
import { USPSection } from './USPSection';
import { FAQSection } from './FAQSection';

interface PageRendererProps {
  layout: PageLayout;
  brandConfig: BrandConfig;
}

export const PageRenderer: React.FC<PageRendererProps> = ({ layout, brandConfig }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <HeroSection 
        hero={layout.hero} 
        brandColors={brandConfig.colors}
      />
      
      {/* USP Section */}
      <USPSection 
        usps={layout.usps}
        brandColors={brandConfig.colors}
      />
      
      {/* FAQ Section */}
      <FAQSection 
        faq={layout.faq}
        brandColors={brandConfig.colors}
      />
      
      {/* 规格表 */}
      {layout.specs && layout.specs.length > 0 && (
        <section className="py-16 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 
              className="text-3xl font-bold text-center mb-12"
              style={{ color: brandConfig.colors.primary }}
            >
              产品规格
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {layout.specs.map((spec, index) => (
                <div 
                  key={index}
                  className="flex justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <span className="font-semibold text-gray-700">{spec.k}</span>
                  <span className="text-gray-600">{spec.v}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* 优惠信息 */}
      {layout.offer && (
        <section className="py-8 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white text-center">
          <div className="max-w-4xl mx-auto">
            {layout.offer.badge && (
              <div className="inline-block bg-white text-red-600 px-4 py-2 rounded-full font-bold mb-4">
                {layout.offer.badge}
              </div>
            )}
            {layout.offer.expiresAt && (
              <p className="text-sm opacity-90">
                优惠截止：{new Date(layout.offer.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};