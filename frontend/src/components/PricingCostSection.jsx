import React from 'react';
import FeatureCard from './FeatureCard.jsx';

const PricingCostSection = () => {
  return (
    <section id="pricing-cost" className="py-20 bg-gray-50">
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">智能比价定价+BOM成本分析</h2>
          <p className="text-gray-600 text-lg">数据驱动的智能定价与成本分析解决方案</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard
            title="多平台比价&智能定价"
            description="全网同款产品比价，结合市场行情输出售价区间"
            buttons={['开始全网比价', '获取定价方案']}
          />

          <FeatureCard
            title="BOM产品成本拆解分析"
            description="拆解原料、工艺、配件、人工、物流等成本，生成成本报表"
            buttons={['录入产品信息', '查看成本报表']}
          />
        </div>
      </div>
    </section>
  );
};

export default PricingCostSection;
