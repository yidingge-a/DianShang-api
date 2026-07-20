import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Globe, Lightbulb, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { marketApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const MarketReportPage = () => {
  const [reportForm, setReportForm] = useState({
    product_keyword: '', platforms: ['taobao', 'jd', 'pdd', 'douyin'], analysis_types: ['comprehensive', 'competitive', 'trend'], time_range: '30d', category: '',
  });
  const [reportResult, setReportResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const platforms = [
    { id: 'taobao', name: '淘宝' }, { id: 'tmall', name: '天猫' }, { id: 'jd', name: '京东' },
    { id: 'pdd', name: '拼多多' }, { id: 'douyin', name: '抖音' }, { id: 'xiaohongshu', name: '小红书' },
    { id: 'amazon', name: 'Amazon' }, { id: 'ebay', name: 'eBay' },
  ];

  const analysisTypes = [
    { id: 'comprehensive', name: '综合市场分析', description: '全平台数据综合分析' },
    { id: 'competitive', name: '竞品分析', description: '竞争对手产品分析' },
    { id: 'trend', name: '趋势分析', description: '市场趋势和热点分析' },
    { id: 'demand', name: '需求分析', description: '消费者需求和市场容量' },
  ];

  const handleGenerateReport = async () => {
    if (!reportForm.product_keyword) { toast.warning('请输入产品关键词'); return; }
    setIsGenerating(true);
    try {
      const response = await marketApi.generateReport(reportForm);
      if (response.success) { setReportResult(response.data); toast.success('市场报告生成成功！'); }
    } catch (error) { toast.error('生成失败: ' + error.message); } finally { setIsGenerating(false); }
  };

  /** 调用已有 /market/overview 与 /market/trends 接口做快速预览 */
  const handleMarketPreview = async () => {
    if (!reportForm.product_keyword) { toast.warning('请先输入产品关键词'); return; }
    setIsPreviewing(true);
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        marketApi.getOverview(reportForm.product_keyword),
        marketApi.getTrends({
          keyword: reportForm.product_keyword,
          platform: reportForm.platforms[0] || 'taobao',
          metric: 'search_volume',
          time_range: reportForm.time_range,
        }),
      ]);
      if (overviewRes.success) {
        setPreview({ overview: overviewRes.data, trends: trendsRes.success ? trendsRes.data : null });
        toast.success('市场预览已加载');
      }
    } catch (error) { toast.error('预览失败: ' + error.message); } finally { setIsPreviewing(false); }
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
            <span className="text-gray-900">全平台市场分析报告</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">全平台市场分析报告</h1>
            <p className="text-gray-600 text-lg">多维度深度市场洞察，助力决策</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><BarChart3 size={20} className="mr-2 text-blue-600" />市场分析设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">产品关键词 *</label>
              <input type="text" value={reportForm.product_keyword} onChange={(e) => setReportForm(prev => ({ ...prev, product_keyword: e.target.value }))}
                placeholder="例如：不锈钢保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">分析平台</label>
              <div className="flex flex-wrap gap-2">
                {platforms.map(p => (
                  <label key={p.id} className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={reportForm.platforms.includes(p.id)} onChange={(e) => {
                      if (e.target.checked) setReportForm(prev => ({ ...prev, platforms: [...prev.platforms, p.id] }));
                      else setReportForm(prev => ({ ...prev, platforms: prev.platforms.filter(id => id !== p.id) }));
                    }} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">分析类型</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysisTypes.map(t => (
                  <label key={t.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={reportForm.analysis_types.includes(t.id)} onChange={(e) => {
                      if (e.target.checked) setReportForm(prev => ({ ...prev, analysis_types: [...prev.analysis_types, t.id] }));
                      else setReportForm(prev => ({ ...prev, analysis_types: prev.analysis_types.filter(id => id !== t.id) }));
                    }} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                    <div><p className="text-sm font-medium text-gray-900">{t.name}</p><p className="text-xs text-gray-500">{t.description}</p></div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
                <select value={reportForm.time_range} onChange={(e) => setReportForm(prev => ({ ...prev, time_range: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="7d">近7天</option><option value="30d">近30天</option><option value="90d">近90天</option><option value="1y">近1年</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品品类</label>
                <input type="text" value={reportForm.category} onChange={(e) => setReportForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="例如：家居用品" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <button
              type="button"
              onClick={handleMarketPreview}
              disabled={isPreviewing}
              className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center mb-3"
            >
              {isPreviewing ? <><Loader2 size={18} className="mr-2 animate-spin" />加载预览...</> : <><Search size={18} className="mr-2" />快速市场预览</>}
            </button>
            <button onClick={handleGenerateReport} disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
              {isGenerating ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</> : <><BarChart3 size={18} className="mr-2" />生成市场报告</>}
            </button>
          </div>
        </div>

        {preview && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">市场快速预览</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">搜索量</p>
                <p className="text-xl font-bold text-gray-900">{preview.overview?.search_volume?.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">均价</p>
                <p className="text-xl font-bold text-blue-600">¥{preview.overview?.avg_price}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-500">趋势</p>
                <p className="text-xl font-bold text-green-600">{preview.trends?.trend === 'up' ? '上升' : preview.trends?.trend}</p>
              </div>
            </div>
          </div>
        )}

        {reportResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">市场概况</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2"><TrendingUp size={20} className="text-blue-600 mr-2" /><span className="text-sm text-gray-600">市场热度</span></div>
                  <p className="text-3xl font-bold text-blue-700">{reportResult.summary?.market_heat}</p>
                  <p className="text-sm text-gray-600 mt-1">较上月 {reportResult.summary?.heat_change > 0 ? '+' : ''}{reportResult.summary?.heat_change}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2"><Globe size={20} className="text-green-600 mr-2" /><span className="text-sm text-gray-600">竞争强度</span></div>
                  <p className="text-3xl font-bold text-green-700 capitalize">{reportResult.summary?.competition_level}</p>
                  <p className="text-sm text-gray-600 mt-1">{reportResult.summary?.competition_level === 'medium' ? '市场机会良好' : ''}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center mb-2"><Lightbulb size={20} className="text-purple-600 mr-2" /><span className="text-sm text-gray-600">增长潜力</span></div>
                  <p className="text-3xl font-bold text-purple-700 capitalize">{reportResult.summary?.growth_potential}</p>
                  <p className="text-sm text-gray-600 mt-1">预计年增长率 {reportResult.summary?.estimated_growth_rate}%</p>
                </div>
              </div>
            </div>

            {reportResult.platform_data?.length > 0 && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">平台数据</h3>
                <div className="space-y-4">
                  {reportResult.platform_data.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900">{p.platform}</span>
                        <Badge variant="secondary">搜索量 {p.search_volume?.toLocaleString()}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><p className="text-gray-500">销量</p><p className="font-medium text-gray-900">{p.sales_volume?.toLocaleString()}</p></div>
                        <div><p className="text-gray-500">平均价</p><p className="font-medium text-blue-600">¥{p.avg_price}</p></div>
                        <div><p className="text-gray-500">竞品数</p><p className="font-medium text-gray-900">{p.competitor_count?.toLocaleString()}</p></div>
                        <div><p className="text-gray-500">头部卖家</p><p className="font-medium text-gray-900">{p.top_sellers?.[0]?.name || 'N/A'}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportResult.trend_analysis && (
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">趋势分析</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">价格趋势</p>
                    <p className={`font-medium capitalize ${reportResult.trend_analysis.price_trend === 'rising' ? 'text-red-600' : reportResult.trend_analysis.price_trend === 'falling' ? 'text-green-600' : 'text-gray-600'}`}>
                      {reportResult.trend_analysis.price_trend === 'rising' ? '上涨' : reportResult.trend_analysis.price_trend === 'falling' ? '下降' : '稳定'}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">需求趋势</p>
                    <p className={`font-medium capitalize ${reportResult.trend_analysis.demand_trend === 'rising' ? 'text-green-600' : reportResult.trend_analysis.demand_trend === 'falling' ? 'text-red-600' : 'text-gray-600'}`}>
                      {reportResult.trend_analysis.demand_trend === 'rising' ? '上升' : reportResult.trend_analysis.demand_trend === 'falling' ? '下降' : '稳定'}
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">季节性</p>
                    <p className="font-medium text-gray-900 capitalize">{reportResult.trend_analysis.seasonal_factor === 'high' ? '强' : reportResult.trend_analysis.seasonal_factor === 'low' ? '弱' : '中等'}</p>
                  </div>
                </div>
              </div>
            )}

            {reportResult.report_url && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">完整报告已生成，可下载查看</p>
                <a href={reportResult.report_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-1 inline-block">查看完整报告 →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketReportPage;
