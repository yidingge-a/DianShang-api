import React from 'react';

const FeatureCard = ({ title, description, buttons, badge, className = '' }) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 hover:transform hover:-translate-y-2 hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md ${className}`}>
      {badge && (
        <div className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm mb-4">
          {badge}
        </div>
      )}
      
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      
      <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {buttons.map((button, index) => (
          <button
            key={index}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:transform hover:-translate-y-1 ${
              index === 0 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            onClick={() => window.location.href = '#'}
          >
            {button}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FeatureCard;
