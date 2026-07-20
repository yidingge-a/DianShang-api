import React from 'react';
import FeatureCard from './FeatureCard.jsx';

const MarketAnalysisSection = () => {
  return (
    <section id="market-analysis" className="py-20 bg-white">
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">产业链匹配 & 全网市场调研报告</h2>
          <p className="text-gray-600 text-lg">深度市场洞察与产业链资源智能匹配</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard
            title="上下游产业链智能推荐"
            description="根据产品品类，匹配货源工厂、加工渠道、分销渠道"
            buttons={['匹配产业链资源']}
          />

          <FeatureCard
            title="全平台实时市场分析报告"
            description="抓取平台销量、热度、搜索量、竞争数据，自动生成调研报告"
            buttons={['生成市场报告', '数据趋势查看']}
          />
        </div>
      </div>
    </section>
  );
};

export default MarketAnalysisSection;
