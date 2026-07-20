import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, DollarSign, Eye, MousePointer, ShoppingCart, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { operationApi } from '../services/index.js';
import { Progress } from '@/components/ui/progress';

const PromotionEffectPage = () => {
  const [budget, setBudget] = useState('');
  const [platform, setPlatform] = useState('taobao');
  const [productCategory, setProductCategory] = useState('');
  const [effectResult, setEffectResult] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const platforms = [
    { id: 'taobao', name: '淘宝' }, { id: 'tmall', name: '天猫' }, { id: 'jd', name: '京东' },
    { id: 'pdd', name: '拼多多' }, { id: 'douyin', name: '抖音' }, { id: 'xiaohongshu', name: '小红书' },
  ];

  const handleEstimate = async () => {
    if (!budget) { toast.warning('请输入推广预算'); return; }
    setIsEstimating(true);
    try {
      const response = await operationApi.estimateEffect({
        budget: parseFloat(budget), platform, product_category: productCategory,
      });
      if (response.success) { setEffectResult(response.data); toast.success('效果预估完成！'); }
    } catch (error) { toast.error('预估失败: ' + error.message); } finally { setIsEstimating(false); }
  };

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/data-operation" className="text-gray-600 hover:text-blue-600 transition-colors">数据运营</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">推广费用与效果</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">推广费用与效果</h1>
            <p className="text-gray-600 text-lg">输入预算，预估推广效果与投入产出比</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><DollarSign size={20} className="mr-2 text-blue-600" />预算输入</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">推广预算（元）*</label>
                <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                  placeholder="例如：5000" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">投放平台</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {platforms.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品品类</label>
                <input type="text" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}
                  placeholder="例如：家居用品" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <button onClick={handleEstimate} disabled={isEstimating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {isEstimating ? <><Loader2 size={18} className="mr-2 animate-spin" />计算中...</> : <><TrendingUp size={18} className="mr-2" />效果预估</>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><BarChart3 size={20} className="mr-2 text-blue-600" />效果预估</h3>
            {!effectResult && (
              <div className="text-center py-16 text-gray-400">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" /><p>输入预算后点击预估</p><p className="text-sm mt-2">系统将基于历史数据估算推广效果</p>
              </div>
            )}
            {effectResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">预期曝光</p>
                    <p className="text-2xl font-bold text-blue-600">{effectResult.exposure?.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">预期点击</p>
                    <p className="text-2xl font-bold text-green-600">{effectResult.clicks?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2"><Eye size={16} className="text-gray-400" /><span className="text-sm text-gray-600">曝光量</span></div>
                      <span className="font-medium text-gray-900">{effectResult.exposure?.toLocaleString()}</span>
                    </div>
                    <Progress value={Math.min((effectResult.exposure / 100000) * 100, 100)} className="h-2" />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2"><MousePointer size={16} className="text-gray-400" /><span className="text-sm text-gray-600">点击量</span></div>
                      <span className="font-medium text-gray-900">{effectResult.clicks?.toLocaleString()}</span>
                    </div>
                    <Progress value={Math.min((effectResult.clicks / 10000) * 100, 100)} className="h-2 bg-green-100" />
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2"><ShoppingCart size={16} className="text-gray-400" /><span className="text-sm text-gray-600">转化率</span></div>
                      <span className="font-medium text-blue-600">{effectResult.conversion_rate}%</span>
                    </div>
                    <Progress value={effectResult.conversion_rate * 10} className="h-2 bg-purple-100" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">预计销量</p>
                      <p className="text-2xl font-bold text-gray-900">{effectResult.estimated_sales} 件</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">投入产出比</p>
                      <p className="text-2xl font-bold text-green-600">1:{effectResult.roi}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">预计收益: <span className="font-medium text-gray-900">¥{effectResult.estimated_revenue?.toLocaleString()}</span></p>
                </div>
                {effectResult.channel_breakdown && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-3">渠道预估</p>
                    <div className="space-y-2">
                      {effectResult.channel_breakdown.map((ch, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{ch.channel}</span>
                          <span className="text-gray-500">曝光 {ch.exposure?.toLocaleString()} · 点击 {ch.clicks?.toLocaleString()}</span>
                        </div>
                      ))}
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

export default PromotionEffectPage;
