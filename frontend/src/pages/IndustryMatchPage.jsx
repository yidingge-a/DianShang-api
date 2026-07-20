import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Network, MapPin, Phone, Mail, Building2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { marketApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const IndustryMatchPage = () => {
  const [industryForm, setIndustryForm] = useState({
    product_category: '', product_subcategory: '', location: '', match_type: 'all', min_rating: 4.0, max_results: 10,
  });
  const [industryResult, setIndustryResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);

  const matchTypes = [
    { id: 'all', name: '全部' }, { id: 'supplier', name: '上游供应商' },
    { id: 'processor', name: '加工渠道' }, { id: 'distributor', name: '下游分销商' },
  ];

  const handleMatchIndustry = async () => {
    if (!industryForm.product_category) { toast.warning('请输入产品品类'); return; }
    setIsMatching(true);
    try {
      const response = await marketApi.matchIndustryChain(industryForm);
      if (response.success) { setIndustryResult(response.data); toast.success('产业链匹配完成！'); }
    } catch (error) { toast.error('匹配失败: ' + error.message); } finally { setIsMatching(false); }
  };

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/market-analysis" className="text-gray-600 hover:text-blue-600 transition-colors">市场分析</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">产业链智能推荐</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">产业链智能推荐</h1>
            <p className="text-gray-600 text-lg">智能匹配供应商、加工渠道与分销商</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Network size={20} className="mr-2 text-blue-600" />产业链资源匹配</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">产品品类 *</label>
              <input type="text" value={industryForm.product_category} onChange={(e) => setIndustryForm(prev => ({ ...prev, product_category: e.target.value }))}
                placeholder="例如：不锈钢保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">子品类</label>
              <input type="text" value={industryForm.product_subcategory} onChange={(e) => setIndustryForm(prev => ({ ...prev, product_subcategory: e.target.value }))}
                placeholder="例如：保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">所在地区</label>
              <input type="text" value={industryForm.location} onChange={(e) => setIndustryForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="例如：浙江省义乌市" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">匹配类型</label>
              <div className="flex flex-wrap gap-2">
                {matchTypes.map(t => (
                  <button key={t.id} onClick={() => setIndustryForm(prev => ({ ...prev, match_type: t.id }))}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${industryForm.match_type === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最低评分: {industryForm.min_rating}</label>
              <input type="range" min="1" max="5" step="0.5" value={industryForm.min_rating}
                onChange={(e) => setIndustryForm(prev => ({ ...prev, min_rating: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">最大结果数</label>
              <input type="number" min="1" max="50" value={industryForm.max_results}
                onChange={(e) => setIndustryForm(prev => ({ ...prev, max_results: parseInt(e.target.value) || 10 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <button onClick={handleMatchIndustry} disabled={isMatching}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
            {isMatching ? <><Loader2 size={18} className="mr-2 animate-spin" />匹配中...</> : <><Network size={18} className="mr-2" />匹配产业链资源</>}
          </button>
        </div>

        {industryResult && (
          <div className="space-y-6">
            {industryResult.upstream_suppliers?.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Building2 size={20} className="mr-2 text-blue-600" />上游供应商</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {industryResult.upstream_suppliers.map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <Badge className="bg-blue-100 text-blue-800">匹配度 {s.match_score}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center"><MapPin size={14} className="mr-1" />{s.location}</p>
                        <p className="flex items-center"><Star size={14} className="mr-1 text-yellow-500" />评分: {s.rating}</p>
                        <p>产品: {s.products?.join(', ')}</p>
                        <p>起订量: {s.min_order}</p>
                      </div>
                      {s.contact && (
                        <div className="mt-2 text-sm text-gray-500">
                          <p className="flex items-center"><Phone size={14} className="mr-1" />{s.contact.phone}</p>
                          <p className="flex items-center"><Mail size={14} className="mr-1" />{s.contact.email}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {industryResult.processors?.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Building2 size={20} className="mr-2 text-green-600" />加工渠道</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {industryResult.processors.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        <Badge className="bg-green-100 text-green-800">匹配度 {p.match_score}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center"><MapPin size={14} className="mr-1" />{p.location}</p>
                        <p>类别: {p.category}</p>
                        <p>产能: {p.capacity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {industryResult.downstream_distributors?.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Building2 size={20} className="mr-2 text-purple-600" />下游分销商</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {industryResult.downstream_distributors.map((d, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{d.name}</span>
                        <Badge className="bg-purple-100 text-purple-800">匹配度 {d.match_score}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>类别: {d.category}</p>
                        <p>月出货量: {d.monthly_volume}</p>
                        <p>平台: {d.platforms?.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IndustryMatchPage;
