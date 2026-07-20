import React from 'react';
import FeatureCard from './FeatureCard.jsx';

const ComplianceContentSection = () => {
  return (
    <section id="compliance-content" className="py-20 bg-white">
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">平台专属合规文案生成</h2>
          <p className="text-gray-600 text-lg">智能生成适配各平台的合规营销内容</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FeatureCard
            title="分平台详情页定制生成"
            description="适配淘宝、拼多多、抖音、京东、小红书等平台，输出专属详情页及排版建议"
            buttons={['选择平台生成']}
          />

          <FeatureCard
            title="智能广告词+违禁词规避"
            description="根据产品需求生成营销文案、标题、广告语，自动筛查并规避平台违禁词"
            badge="自动规避违禁词，可查看清单学习"
            buttons={['生成营销文案', '查看违禁词库']}
          />
        </div>
      </div>
    </section>
  );
};

export default ComplianceContentSection;
