import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Check, Loader2, Copy, Lightbulb, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { complianceApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const DetailPageGeneratePage = () => {
  const [platform, setPlatform] = useState('taobao');
  const [tone, setTone] = useState('professional');
  const [productInfo, setProductInfo] = useState({
    name: '', category: '', description: '', features: '', price: '',
  });
  const [detailResult, setDetailResult] = useState(null);
  const [isGeneratingDetail, setIsGeneratingDetail] = useState(false);

  const platforms = [
    { id: 'taobao', name: '淘宝', icon: '🛍️' }, { id: 'tmall', name: '天猫', icon: '🏪' },
    { id: 'jd', name: '京东', icon: '🛒' }, { id: 'pdd', name: '拼多多', icon: '📱' },
    { id: 'douyin', name: '抖音', icon: '🎵' }, { id: 'xiaohongshu', name: '小红书', icon: '📖' },
    { id: 'kuaishou', name: '快手', icon: '⚡' }, { id: 'amazon', name: 'Amazon', icon: '🌎' },
  ];

  const tones = [
    { id: 'professional', name: '专业正式', desc: '适合天猫、京东' },
    { id: 'casual', name: '轻松亲切', desc: '适合淘宝、拼多多' },
    { id: 'luxury', name: '高端奢华', desc: '适合奢侈品牌' },
    { id: 'cute', name: '可爱活泼', desc: '适合小红书、抖音' },
    { id: 'aggressive', name: '促销激进', desc: '适合大促活动' },
  ];

  const handleGenerateDetail = async () => {
    if (!productInfo.name) { toast.warning('请输入产品名称'); return; }
    setIsGeneratingDetail(true);
    try {
      const response = await complianceApi.generateDetailPage({
        product_info: { ...productInfo, features: productInfo.features.split(',').map(s => s.trim()).filter(Boolean), price: productInfo.price ? parseFloat(productInfo.price) : undefined },
        platform, tone, include_sections: ['title', 'selling_points', 'usage_scenarios', 'product_specs', 'after_sales'],
      });
      if (response.success) { setDetailResult(response.data); toast.success('详情页文案生成成功！'); }
    } catch (error) { toast.error('生成失败: ' + error.message); } finally { setIsGeneratingDetail(false); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => toast.success('已复制到剪贴板')); };

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/compliance-content" className="text-gray-600 hover:text-blue-600 transition-colors">合规文案</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">分平台详情页定制</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">分平台详情页定制</h1>
            <p className="text-gray-600 text-lg">智能生成适配各平台的详情页文案</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><FileText size={20} className="mr-2 text-blue-600" />产品信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                <input type="text" value={productInfo.name} onChange={(e) => setProductInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：304不锈钢保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品品类</label>
                <input type="text" value={productInfo.category} onChange={(e) => setProductInfo(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="例如：家居用品" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品描述</label>
                <textarea value={productInfo.description} onChange={(e) => setProductInfo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="描述产品特点、卖点..." rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品特性（用逗号分隔）</label>
                <input type="text" value={productInfo.features} onChange={(e) => setProductInfo(prev => ({ ...prev, features: e.target.value }))}
                  placeholder="例如：304不锈钢, 24小时保温, 500ml容量" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">价格（元）</label>
                <input type="number" value={productInfo.price} onChange={(e) => setProductInfo(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="例如：89" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">目标平台</label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {platforms.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      className={`p-2 rounded-lg border text-sm transition-all ${platform === p.id ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                      <span className="mr-1">{p.icon}</span>{p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">文案风格</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {tones.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${tone === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className={`font-medium text-sm ${tone === t.id ? 'text-blue-700' : 'text-gray-900'}`}>{t.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleGenerateDetail} disabled={isGeneratingDetail}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {isGeneratingDetail ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</> : <><Sparkles size={18} className="mr-2" />生成详情页文案</>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><BookOpen size={20} className="mr-2 text-blue-600" />生成结果</h3>
            {!detailResult && (
              <div className="text-center py-16 text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" /><p>填写左侧信息后点击生成</p><p className="text-sm mt-2">AI 将为您生成适配平台的详情页文案</p>
              </div>
            )}
            {detailResult && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center"><Check size={18} className="text-green-600 mr-2" /><span className="text-green-800 font-medium">已生成 {detailResult.platform} 平台文案</span></div>
                </div>
                {detailResult.content?.title && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">商品标题</h4>
                      <button onClick={() => copyToClipboard(detailResult.content.title)} className="text-blue-600 hover:text-blue-800 text-xs flex items-center"><Copy size={12} className="mr-1" />复制</button>
                    </div>
                    <p className="text-gray-700 text-sm">{detailResult.content.title}</p>
                  </div>
                )}
                {detailResult.content?.selling_points && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 text-sm mb-2">卖点</h4>
                    <ul className="space-y-1">{detailResult.content.selling_points.map((point, i) => (<li key={i} className="text-sm text-gray-700 flex items-start"><span className="text-blue-500 mr-2">•</span>{point}</li>))}</ul>
                  </div>
                )}
                {detailResult.content?.description && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">商品描述</h4>
                      <button onClick={() => copyToClipboard(detailResult.content.description)} className="text-blue-600 hover:text-blue-800 text-xs flex items-center"><Copy size={12} className="mr-1" />复制</button>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{detailResult.content.description}</p>
                  </div>
                )}
                {detailResult.content?.keywords && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 text-sm mb-2">关键词</h4>
                    <div className="flex flex-wrap gap-2">{detailResult.content.keywords.map((kw, i) => (<Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700">{kw}</Badge>))}</div>
                  </div>
                )}
                {detailResult.content?.layout_suggestions && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                    <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center"><Lightbulb size={14} className="mr-1" />排版建议</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>推荐字号: {detailResult.content.layout_suggestions.recommended_font_size}px</p>
                      <p>推荐图片宽度: {detailResult.content.layout_suggestions.recommended_image_width}px</p>
                      <p>配色方案: {detailResult.content.layout_suggestions.color_scheme}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPageGeneratePage;
