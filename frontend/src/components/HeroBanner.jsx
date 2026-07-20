import React from 'react';

const HeroBanner = () => {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
      <div className="max-w-[1300px] mx-auto px-8 text-center">
        <div className="space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            电商全链路
            <span className="text-blue-600">智能运营</span>
            系统
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            从产品图片优化到智能定价，从合规文案生成到全平台上架发布，
            一站式解决电商运营全流程，让智能技术助力您的电商业务腾飞
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => scrollToSection('smart-design')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:transform hover:-translate-y-1"
            >
              开始智能运营
            </button>
            
            <button
              onClick={() => scrollToSection('market-analysis')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:transform hover:-translate-y-1"
            >
              查看市场分析
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
