import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PageLayout } from '../../types/schema';

interface FAQSectionProps {
  faq?: PageLayout['faq'];
  brandColors: { primary: string; accent: string };
}

export const FAQSection: React.FC<FAQSectionProps> = ({ faq, brandColors }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!faq || faq.length === 0) return null;

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 
          className="text-3xl font-bold text-center mb-12"
          style={{ color: brandColors.primary }}
        >
          常见问题
        </h2>
        
        <div className="space-y-4">
          {faq.map((item, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-gray-900">{item.q}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4 pt-2">
                  <p className="text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};