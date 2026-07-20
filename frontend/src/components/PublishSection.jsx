import React from 'react';
import FeatureCard from './FeatureCard.jsx';

const PublishSection = () => {
  return (
    <section id="publish" className="py-20 bg-gray-50">
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">最优平台推荐 & 一键智能上架</h2>
          <p className="text-gray-600 text-lg">智能推荐最佳平台，一键完成商品上架</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard
            title="产品定位+推荐定价+推荐平台"
            description="综合成本、市场、竞品数据，分析产品定位，推荐上架平台与售价"
            buttons={['获取综合推荐']}
          />

          <FeatureCard
            title="各平台一键跳转上架界面"
            description="直达主流电商产品发布后台"
            buttons={['淘宝上架', '拼多多上架', '抖音上架', '更多平台']}
          />
        </div>
      </div>
    </section>
  );
};

export default PublishSection;
