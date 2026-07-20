import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  const modules = [
    {
      id: 'smart-design',
      title: '智能美工可视化生成',
      description: '专业级图像处理与内容创作工具',
      path: '/smart-design',
      icon: '🎨'
    },
    {
      id: 'compliance-content',
      title: '平台专属合规文案生成',
      description: '智能生成适配各平台的合规营销内容',
      path: '/compliance-content',
      icon: '📝'
    },
    {
      id: 'pricing-cost',
      title: '智能比价定价+BOM成本分析',
      description: '数据驱动的智能定价与成本分析解决方案',
      path: '/pricing-cost',
      icon: '💰'
    },
    {
      id: 'market-analysis',
      title: '产业链匹配 & 全网市场调研报告',
      description: '深度市场洞察与产业链资源智能匹配',
      path: '/market-analysis',
      icon: '📊'
    },
    {
      id: 'publish',
      title: '最优平台推荐 & 一键智能上架',
      description: '智能推荐最佳平台，一键完成商品上架',
      path: '/publish',
      icon: '🚀'
    },
    {
      id: 'data-operation',
      title: '智能营销推广 & 上架数据优化',
      description: '数据驱动的营销推广与效果优化',
      path: '/data-operation',
      icon: '📈'
    }
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
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
              <Link
                to="/smart-design"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:transform hover:-translate-y-1 inline-flex items-center space-x-2"
              >
                <span>开始智能运营</span>
                <ArrowRight size={20} />
              </Link>
              
              <Link
                to="/market-analysis"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 hover:transform hover:-translate-y-1 inline-flex items-center space-x-2"
              >
                <span>查看市场分析</span>
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Module Overview */}
      <section className="py-20 bg-white">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">功能模块</h2>
            <p className="text-gray-600 text-lg">选择您需要的功能模块，开始您的智能电商运营之旅</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module) => (
              <Link
                key={module.id}
                to={module.path}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:transform hover:-translate-y-2 hover:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md group"
              >
                <div className="text-4xl mb-4">{module.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {module.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{module.description}</p>
                <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform duration-300">
                  <span>进入模块</span>
                  <ArrowRight size={16} className="ml-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
