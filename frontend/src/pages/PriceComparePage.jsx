import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, DollarSign, BarChart3, Search, Loader2, Check, AlertCircle, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { pricingApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const platformOptions = [
  { id: 'taobao', name: '淘宝' }, { id: 'tmall', name: '天猫' }, { id: 'jd', name: '京东' },
  { id: 'pdd', name: '拼多多' }, { id: 'douyin', name: '抖音' },
];

const PriceComparePage = () => {
  const [step, setStep] = useState(1); // 1=比价 2=定价

  const [productName, setProductName] = useState('');
  const [platforms, setPlatforms] = useState(['taobao', 'jd', 'pdd']);
  const [productCategory, setProductCategory] = useState('');
  const [productSpecs, setProductSpecs] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('taobao');

  const [compareResult, setCompareResult] = useState(null);
  const [pricingResult, setPricingResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isPricing, setIsPricing] = useState(false);

  const handleComparePrice = async () => {
    if (!productName.trim()) {
      toast.warning('请输入产品名称');
      return;
    }
    if (platforms.length === 0) {
      toast.warning('请至少选择一个比价平台');
      return;
    }
    setIsComparing(true);
    setCompareResult(null);
    setPricingResult(null);
    try {
      const response = await pricingApi.comparePrice({
        query: productName.trim(),
        platforms,
        product_category: productCategory.trim(),
        product_specs: productSpecs.trim(),
      });
      if (response.success) {
        setCompareResult(response.data);
        setStep(2);
        toast.success('AI 全网比价完成！请继续生成定价方案');
      }
    } catch (error) {
      toast.error(error.message || '比价失败');
    } finally {
      setIsComparing(false);
    }
  };

  const handleGetPricing = async () => {
    if (!compareResult?.summary) {
      toast.warning('请先完成步骤一：AI 全网比价');
      setStep(1);
      return;
    }
    setIsPricing(true);
    setPricingResult(null);
    try {
      const response = await pricingApi.getRecommendation({
        product_name: productName.trim(),
        product_category: productCategory.trim(),
        product_specs: productSpecs.trim(),
        platform: targetPlatform,
        platforms,
        compare_result: compareResult,
      });
      if (response.success) {
        setPricingResult(response.data);
        toast.success('AI 定价方案生成成功！');
      }
    } catch (error) {
      toast.error(error.message || '定价失败');
    } finally {
      setIsPricing(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} /><span>返回首页</span>
            </Link>
            <span className="text-gray-400">/</span>
            <Link to="/pricing-cost" className="text-gray-600 hover:text-blue-600 transition-colors">定价成本</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">多平台比价与智能定价</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">多平台比价与智能定价</h1>
            <p className="text-gray-600 text-lg">第一步 AI 全网比价 → 第二步 生成定价方案</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        {/* 步骤条 */}
        <div className="flex items-center justify-center mb-8 gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step === 1 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
            AI 全网比价
          </button>
          <ChevronRight size={18} className="text-gray-400" />
          <button
            type="button"
            onClick={() => compareResult && setStep(2)}
            disabled={!compareResult}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium disabled:opacity-40 ${step === 2 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
            生成定价方案
          </button>
        </div>

        {/* 公共产品信息 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">产品信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="例如：304不锈钢保温杯 500ml"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">产品品类（选填）</label>
              <input
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="例如：家居用品"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">规格描述（选填）</label>
              <input
                type="text"
                value={productSpecs}
                onChange={(e) => setProductSpecs(e.target.value)}
                placeholder="材质、容量、功能特点"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Search size={20} className="mr-2 text-blue-600" />步骤一：AI 全网比价
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">选择比价平台 *</label>
                  <div className="flex flex-wrap gap-2">
                    {platformOptions.map((p) => (
                      <label key={p.id} className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={platforms.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setPlatforms((prev) => [...prev, p.id]);
                            else setPlatforms((prev) => prev.filter((id) => id !== p.id));
                          }}
                          className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleComparePrice}
                  disabled={isComparing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isComparing ? (
                    <><Loader2 size={18} className="mr-2 animate-spin" />AI 比价分析中...</>
                  ) : (
                    <><Search size={18} className="mr-2" />AI 一键全网比价</>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center">由大模型分析各平台市场行情与竞品价格</p>
              </div>
            </div>

            <CompareResultPanel compareResult={compareResult} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            {!compareResult && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle size={18} className="text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800">请先完成步骤一的 AI 全网比价，再生成定价方案。</p>
              </div>
            )}

            {compareResult && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Check size={20} className="mr-2 text-green-600" />已完成的比价结果（定价依据）
                </h3>
                <CompareResultPanel compareResult={compareResult} compact />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <DollarSign size={20} className="mr-2 text-blue-600" />步骤二：生成定价方案
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">上架目标平台 *</label>
                    <select
                      value={targetPlatform}
                      onChange={(e) => setTargetPlatform(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {platformOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleGetPricing}
                    disabled={isPricing || !compareResult}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {isPricing ? (
                      <><Loader2 size={18} className="mr-2 animate-spin" />基于比价生成定价中...</>
                    ) : (
                      <><DollarSign size={18} className="mr-2" />基于比价结果生成定价方案</>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center">定价方案将严格参考上方 AI 比价的市场价与竞品数据</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <BarChart3 size={20} className="mr-2 text-blue-600" />定价建议
                </h3>
                {!pricingResult && (
                  <div className="text-center py-16 text-gray-400">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                    <p>完成比价后，点击生成定价方案</p>
                  </div>
                )}
                {pricingResult && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-600 mb-2">推荐定价区间</p>
                      <p className="text-4xl font-bold text-blue-600">
                        ¥{pricingResult.recommended_range?.min} - ¥{pricingResult.recommended_range?.max}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        最优价格: <span className="font-bold text-blue-700">¥{pricingResult.recommended_price}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">利润率</p>
                        <p className="text-2xl font-bold text-green-600">{Number(pricingResult.profit_margin).toFixed(1)}%</p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">毛利</p>
                        <p className="text-2xl font-bold text-purple-600">¥{pricingResult.gross_profit}</p>
                      </div>
                    </div>
                    {pricingResult.estimated_cost > 0 && (
                      <div className="text-sm text-gray-500 text-center">AI 估算成本约 ¥{pricingResult.estimated_cost}</div>
                    )}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="font-medium text-gray-900 mb-2">竞争力分析</p>
                      <Badge className={
                        pricingResult.competitiveness === 'high' ? 'bg-green-100 text-green-800'
                          : pricingResult.competitiveness === 'medium' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }>
                        {pricingResult.competitiveness === 'high' ? '竞争力强' : pricingResult.competitiveness === 'medium' ? '竞争力中等' : '竞争力弱'}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">{pricingResult.analysis}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        定价策略: <span className="font-medium">{pricingResult.pricing_strategy}</span>
                      </p>
                    </div>
                    {pricingResult.factors?.length > 0 && (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <p className="font-medium text-gray-900 mb-3">影响因素</p>
                        <div className="space-y-2">
                          {pricingResult.factors.map((f, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{f.factor}</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant={f.impact === 'positive' ? 'success' : 'destructive'} className="text-xs">
                                  {f.impact === 'positive' ? '正面' : '负面'}
                                </Badge>
                                <span className="text-gray-500">权重 {f.weight}</span>
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
          </div>
        )}
      </div>
    </div>
  );
};

function CompareResultPanel({ compareResult, compact = false }) {
  if (!compareResult) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 size={20} className="mr-2 text-blue-600" />比价结果
        </h3>
        <div className="text-center py-16 text-gray-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
          <p>填写产品信息后点击 AI 比价</p>
          {compareResult?.data_source && (
            <p className="text-xs mt-2 text-blue-500">数据来源: {compareResult.data_source}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${compact ? 'border-blue-100' : ''}`}>
      {!compact && (
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 size={20} className="mr-2 text-blue-600" />比价结果
        </h3>
      )}
      <div className="space-y-6">
        {compareResult.data_source && (
          <p className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
            AI 数据来源: {compareResult.data_source === 'llm_market_intelligence' ? '大模型市场分析' : compareResult.data_source}
          </p>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-600 mb-1">最低价</p>
            <p className="text-2xl font-bold text-red-600">¥{compareResult.summary?.lowest_price}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-600 mb-1">平均价</p>
            <p className="text-2xl font-bold text-blue-600">¥{compareResult.summary?.average_price}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-600 mb-1">最高价</p>
            <p className="text-2xl font-bold text-green-600">¥{compareResult.summary?.highest_price}</p>
          </div>
        </div>
        {!compact && compareResult.platform_breakdown?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">平台价格分布</p>
            <div className="space-y-3">
              {compareResult.platform_breakdown.map((p) => (
                <div key={p.platform} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{p.platform}</span>
                    <span className="text-xs text-gray-500">{p.count} 个样本</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-red-600">低 ¥{p.lowest}</span>
                    <span className="text-blue-600">均 ¥{p.average}</span>
                    <span className="text-green-600">高 ¥{p.highest}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!compact && compareResult.competitors?.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">主要竞品</p>
            <div className="space-y-2">
              {compareResult.competitors.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{c.seller}</p>
                    <p className="text-gray-500 text-xs">{c.platform} · 销量 {c.sales}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">¥{c.price}</p>
                    <p className="text-gray-500 text-xs">评分 {c.rating}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceComparePage;
