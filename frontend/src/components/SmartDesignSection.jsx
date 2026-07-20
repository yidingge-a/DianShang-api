import React from 'react';
import FeatureCard from './FeatureCard.jsx';

const SmartDesignSection = () => {
  return (
    <section id="smart-design" className="py-20 bg-gray-50">
      <div className="max-w-[1300px] mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">智能美工可视化生成</h2>
          <p className="text-gray-600 text-lg">专业级图像处理与内容创作工具</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="图片智能优化"
            description="产品图精修、P图、调色、瑕疵修复、白底图制作"
            buttons={['进入图片优化']}
          />

          <FeatureCard
            title="详情页&视频生成"
            description="生成商品详情页、主图视频、宣传短视频、活动海报"
            buttons={['生成详情页', '制作宣传视频']}
          />

          <FeatureCard
            title="便捷美工工具集"
            description="双图合并、图片添加元素、智能抠图、尺寸裁剪、批量改图"
            buttons={['双图合并', '添加图片元素', '更多工具']}
          />
        </div>
      </div>
    </section>
  );
};

export default SmartDesignSection;
