import React from 'react';
import { PageLayout } from '../../types/schema';

interface USPSectionProps {
  usps: PageLayout['usps'];
  brandColors: { primary: string; accent: string };
}

export const USPSection: React.FC<USPSectionProps> = ({ usps, brandColors }) => {
  if (!usps || usps.length === 0) return null;

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {usps.map((usp, index) => (
            <div 
              key={index} 
              className="text-center p-6 rounded-xl bg-gray-50 hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div 
                className="text-4xl mb-4 w-16 h-16 mx-auto flex items-center justify-center rounded-full"
                style={{ backgroundColor: `${brandColors.primary}20` }}
              >
                {usp.icon}
              </div>
              
              <p 
                className="font-semibold text-lg"
                style={{ color: brandColors.primary }}
              >
                {usp.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};