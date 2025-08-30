import React from 'react';
import { PageLayout } from '../../types/schema';

interface HeroSectionProps {
  hero: PageLayout['hero'];
  brandColors: { primary: string; accent: string };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ hero, brandColors }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* 文本内容 */}
        <div className="space-y-6">
          <h1 
            className="text-4xl md:text-5xl font-bold leading-tight"
            style={{ color: brandColors.primary }}
          >
            {hero.headline}
          </h1>
          
          <p className="text-lg text-gray-600 leading-relaxed">
            {hero.subhead}
          </p>
          
          <button
            className="px-8 py-4 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            style={{ backgroundColor: brandColors.accent }}
          >
            {hero.cta}
          </button>
        </div>

        {/* 图片 */}
        <div className="relative">
          <img
            src={hero.image}
            alt="产品展示"
            className="w-full h-96 object-cover rounded-2xl shadow-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
        </div>
      </div>
    </section>
  );
};