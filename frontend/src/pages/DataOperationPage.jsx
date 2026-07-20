import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, TrendingUp, BarChart3, ChevronRight } from 'lucide-react';

const DataOperationPage = () => {
  const navigate = useNavigate();

  const subFeatures = [
    {
      title: '营销策略推算',
      description: '基于产品特性和预算，生成多套营销方案与投放策略',
      icon: <Target size={32} className="text-blue-600" />,
      path: '/data-operation/marketing',
    },
    {
      title: '推广费用与效果',
      description: '输入预算预估推广效果、曝光量、转化率与投入产出比',
      icon: <TrendingUp size={32} className="text-green-600" />,
      path: '/data-operation/promotion',
    },
    {
      title: '数据监控优化',
      description: '实时监控流量、访客、转化数据，智能诊断并输出优化建议',
      icon: <BarChart3 size={32} className="text-purple-600" />,
      path: '/data-operation/monitor',
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} />
              <span>返回首页</span>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">数据运营</h1>
            <p className="text-gray-600 text-lg">数据驱动的营销推广与效果优化</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subFeatures.map((feature) => (
            <div
              key={feature.path}
              onClick={() => navigate(feature.path)}
              className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
              <div className="flex items-center text-blue-600 font-medium text-sm">
                <span>进入功能</span>
                <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataOperationPage;
