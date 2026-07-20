import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Loader2, Check, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { operationApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const MarketingStrategyPage = () => {
  const [form, setForm] = useState({
    product_name: '', product_category: '', budget: '', target_audience: '', goals: ['sales'], platforms: ['taobao', 'douyin'],
  });
  const [strategies, setStrategies] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const goalOptions = [
    { id: 'sales', name: '提升销量' }, { id: 'brand', name: '品牌曝光' }, { id: 'conversion', name: '提高转化' }, { id: 'retention', name: '用户留存' },
  ];
  const platformOptions = [
    { id: 'taobao', name: '淘宝' }, { id: 'tmall', name: '天猫' }, { id: 'jd', name: '京东' },
    { id: 'pdd', name: '拼多多' }, { id: 'douyin', name: '抖音' }, { id: 'xiaohongshu', name: '小红书' },
  ];

  const handleGenerate = async () => {
    if (!form.product_name) { toast.warning('请输入产品名称'); return; }
    if (!form.budget) { toast.warning('请输入预算'); return; }
    setIsGenerating(true);
    try {
      const response = await operationApi.generateStrategies(form);
      if (response.success) { setStrategies(response.data.strategies); toast.success('营销策略生成成功！'); }
    } catch (error) { toast.error('生成失败: ' + error.message); } finally { setIsGenerating(false); }
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
            <span className="text-gray-900">营销策略推算</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">营销策略推算</h1>
            <p className="text-gray-600 text-lg">基于产品特性和预算，生成多套营销方案</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Target size={20} className="mr-2 text-blue-600" />产品信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                <input type="text" value={form.product_name} onChange={(e) => setForm(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="例如：304不锈钢保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品品类</label>
                <input type="text" value={form.product_category} onChange={(e) => setForm(prev => ({ ...prev, product_category: e.target.value }))}
                  placeholder="例如：家居用品" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">营销预算（元/月）*</label>
                <input type="number" value={form.budget} onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="例如：5000" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标人群</label>
                <input type="text" value={form.target_audience} onChange={(e) => setForm(prev => ({ ...prev, target_audience: e.target.value }))}
                  placeholder="例如：25-35岁女性白领" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">营销目标</label>
                <div className="flex flex-wrap gap-2">
                  {goalOptions.map(g => (
                    <label key={g.id} className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${form.goals.includes(g.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={form.goals.includes(g.id)} onChange={(e) => {
                        if (e.target.checked) setForm(prev => ({ ...prev, goals: [...prev.goals, g.id] }));
                        else setForm(prev => ({ ...prev, goals: prev.goals.filter(id => id !== g.id) }));
                      }} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                      <span className="text-sm text-gray-700">{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">投放平台</label>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map(p => (
                    <label key={p.id} className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${form.platforms.includes(p.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={form.platforms.includes(p.id)} onChange={(e) => {
                        if (e.target.checked) setForm(prev => ({ ...prev, platforms: [...prev.platforms, p.id] }));
                        else setForm(prev => ({ ...prev, platforms: prev.platforms.filter(id => id !== p.id) }));
                      }} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                      <span className="text-sm text-gray-700">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleGenerate} disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {isGenerating ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</> : <><Target size={18} className="mr-2" />生成营销策略</>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Check size={20} className="mr-2 text-blue-600" />策略方案</h3>
            {!strategies && (
              <div className="text-center py-16 text-gray-400">
                <Target size={48} className="mx-auto mb-4 opacity-50" /><p>填写左侧信息后生成策略</p><p className="text-sm mt-2">AI 将为您生成多套营销方案</p>
              </div>
            )}
            {strategies && (
              <div className="space-y-4">
                {strategies.map((strategy, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 text-blue-800">方案 {String.fromCharCode(65 + i)}</Badge>
                        <span className="text-sm text-gray-500">预期ROI 1:{strategy.roi}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">¥{strategy.budget}/月</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2"><Calendar size={14} className="text-gray-400" /><span className="text-gray-600">周期: {strategy.duration}</span></div>
                      <div className="flex items-center space-x-2"><TrendingUp size={14} className="text-gray-400" /><span className="text-gray-600">预期销量: {strategy.estimated_sales} 件</span></div>
                      <div className="flex items-center space-x-2"><Users size={14} className="text-gray-400" /><span className="text-gray-600">目标人群: {strategy.target_audience}</span></div>
                      <div className="flex items-center space-x-2"><DollarSign size={14} className="text-gray-400" /><span className="text-gray-600">预计收益: ¥{strategy.estimated_revenue}</span></div>
                    </div>
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">核心策略</p>
                      <p className="text-sm text-gray-600">{strategy.description}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {strategy.channels?.map((ch, j) => (<Badge key={j} variant="secondary" className="text-xs">{ch}</Badge>))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingStrategyPage;
