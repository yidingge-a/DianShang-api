import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calculator, ChevronRight } from 'lucide-react';

const PricingCostPage = () => {
  const navigate = useNavigate();

  const subFeatures = [
    {
      title: '多平台比价与智能定价',
      description: '全网比价分析 + 基于竞品数据智能推荐最优定价策略',
      icon: <TrendingUp size={32} className="text-blue-600" />,
      path: '/pricing-cost/price-compare',
    },
    {
      title: 'BOM产品成本拆解分析',
      description: '详细拆解原材料、加工、人工等成本结构，精准核算',
      icon: <Calculator size={32} className="text-green-600" />,
      path: '/pricing-cost/bom',
    },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} />
              <span>返回首页</span>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">定价成本</h1>
            <p className="text-gray-600 text-lg">数据驱动的智能定价与成本分析解决方案</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

export default PricingCostPage;
