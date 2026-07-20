import React from 'react';
import FeatureCard from './FeatureCard.jsx';

const DataOperationSection = () => {
  return (
    <section id="data-operation" className="py-20 bg-white">
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">智能营销推广 & 上架数据优化</h2>
          <p className="text-gray-600 text-lg">数据驱动的营销推广与效果优化</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="多套智能营销策略推算"
            description="结合平台规则与市场数据，生成多套推广、活动方案"
            buttons={['生成营销方案']}
          />

          <FeatureCard
            title="推广费用&效果可视化"
            description="展示各方案预估费用、曝光量、转化率、引流效果"
            buttons={['查看费用&效果']}
          />

          <FeatureCard
            title="上架后流量数据分析优化"
            description="监控流量、访客、转化等数据，输出问题诊断与优化建议"
            buttons={['接入数据监控', '查看优化建议']}
          />
        </div>
      </div>
    </section>
  );
};

export default DataOperationSection;
