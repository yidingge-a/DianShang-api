import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Network, BarChart3, ChevronRight } from 'lucide-react';

const MarketAnalysisPage = () => {
  const navigate = useNavigate();

  const subFeatures = [
    {
      title: '产业链智能推荐',
      description: '智能匹配供应商、加工渠道与下游分销商，优化供应链布局',
      icon: <Network size={32} className="text-blue-600" />,
      path: '/market-analysis/industry',
    },
    {
      title: '全平台市场分析报告',
      description: '多维度深度市场洞察，支持竞品分析、趋势分析和需求分析',
      icon: <BarChart3 size={32} className="text-purple-600" />,
      path: '/market-analysis/report',
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">市场分析</h1>
            <p className="text-gray-600 text-lg">深度市场洞察与产业链资源智能匹配</p>
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

export default MarketAnalysisPage;
