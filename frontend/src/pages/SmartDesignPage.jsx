import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, Video, Wand2, ChevronRight } from 'lucide-react';

const SmartDesignPage = () => {
  const navigate = useNavigate();

  const subFeatures = [
    {
      title: '图片智能优化',
      description: '上传图片进行智能优化、精修与抠图，支持白底、瑕疵修复、自动裁剪',
      icon: <Image size={32} className="text-blue-600" />,
      path: '/smart-design/image-optimize',
    },
    {
      title: '详情页与视频生成',
      description: '智能生成产品详情页和营销视频，支持多种风格和输出格式',
      icon: <Video size={32} className="text-purple-600" />,
      path: '/smart-design/detail-video',
    },
    {
      title: '便捷美工工具集',
      description: '双图合并、添加元素、尺寸裁剪、批量处理等常用工具',
      icon: <Wand2 size={32} className="text-green-600" />,
      path: '/smart-design/tools',
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">智能美工</h1>
            <p className="text-gray-600 text-lg">专业级图像处理与内容创作工具</p>
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

export default SmartDesignPage;
