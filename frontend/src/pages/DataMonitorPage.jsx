import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Eye, Clock, MousePointer, TrendingDown, TrendingUp, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { operationApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const DataMonitorPage = () => {
  const [monitorId, setMonitorId] = useState('');
  const [timeRange, setTimeRange] = useState('7d');
  const [monitorData, setMonitorData] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);

  const timeRangeOptions = [
    { id: '1d', name: '今天' }, { id: '7d', name: '近7天' }, { id: '30d', name: '近30天' }, { id: '90d', name: '近90天' },
  ];

  const handleSetup = async () => {
    try {
      const response = await operationApi.setupMonitor({ name: '默认监控', auto_refresh: true });
      if (response.success) { setMonitorId(response.data.monitor_id); setHasSetup(true); toast.success('数据监控已接入'); }
    } catch (error) { toast.error('接入失败: ' + error.message); }
  };

  const loadMonitorData = async () => {
    if (!monitorId) return;
    setIsLoading(true);
    try {
      const response = await operationApi.getMonitorData(monitorId, timeRange);
      if (response.success) setMonitorData(response.data);
    } catch (error) { toast.error('加载数据失败: ' + error.message); } finally { setIsLoading(false); }
  };

  const handleOptimize = async () => {
    if (!monitorData) return;
    setIsOptimizing(true);
    try {
      const response = await operationApi.generateOptimization({ monitor_id: monitorId, data: monitorData });
      if (response.success) { setOptimization(response.data); toast.success('优化建议已生成'); }
    } catch (error) { toast.error('生成建议失败: ' + error.message); } finally { setIsOptimizing(false); }
  };

  useEffect(() => { if (hasSetup && monitorId) loadMonitorData(); }, [timeRange, hasSetup, monitorId]);

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/data-operation" className="text-gray-600 hover:text-blue-600 transition-colors">数据运营</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">数据监控优化</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">数据监控优化</h1>
            <p className="text-gray-600 text-lg">实时监控流量数据，智能诊断并提供优化建议</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        {!hasSetup && !monitorId && (
          <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200 text-center">
            <BarChart3 size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">尚未接入数据监控</h3>
            <p className="text-gray-500 mb-6">接入后即可实时监控流量、访客、转化等数据</p>
            <button onClick={handleSetup} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all">
              接入数据监控
            </button>
          </div>
        )}

        {(hasSetup || monitorId) && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {timeRangeOptions.map(tr => (
                  <button key={tr.id} onClick={() => setTimeRange(tr.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === tr.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {tr.name}
                  </button>
                ))}
              </div>
              <button onClick={loadMonitorData} disabled={isLoading} className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /><span className="text-sm">刷新数据</span>
              </button>
            </div>

            {isLoading && (
              <div className="text-center py-12"><Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-2" /><p className="text-gray-500">加载数据中...</p></div>
            )}

            {monitorData && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2"><Eye size={16} className="text-blue-600" /><span className="text-sm text-gray-500">浏览量</span></div>
                    <p className="text-2xl font-bold text-gray-900">{monitorData.views?.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      {monitorData.view_change > 0 ? <TrendingUp size={14} className="text-green-500 mr-1" /> : <TrendingDown size={14} className="text-red-500 mr-1" />}
                      <span className={`text-xs ${monitorData.view_change > 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(monitorData.view_change)}%</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2"><MousePointer size={16} className="text-purple-600" /><span className="text-sm text-gray-500">访客数</span></div>
                    <p className="text-2xl font-bold text-gray-900">{monitorData.visitors?.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      {monitorData.visitor_change > 0 ? <TrendingUp size={14} className="text-green-500 mr-1" /> : <TrendingDown size={14} className="text-red-500 mr-1" />}
                      <span className={`text-xs ${monitorData.visitor_change > 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(monitorData.visitor_change)}%</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2"><Clock size={16} className="text-orange-600" /><span className="text-sm text-gray-500">平均停留</span></div>
                    <p className="text-2xl font-bold text-gray-900">{monitorData.avg_duration}</p>
                    <p className="text-xs text-gray-400 mt-1">{monitorData.avg_duration_change > 0 ? '+' : ''}{monitorData.avg_duration_change} 秒</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2"><TrendingUp size={16} className="text-green-600" /><span className="text-sm text-gray-500">转化率</span></div>
                    <p className="text-2xl font-bold text-gray-900">{monitorData.conversion_rate}%</p>
                    <div className="flex items-center mt-1">
                      {monitorData.conversion_change > 0 ? <TrendingUp size={14} className="text-green-500 mr-1" /> : <TrendingDown size={14} className="text-red-500 mr-1" />}
                      <span className={`text-xs ${monitorData.conversion_change > 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(monitorData.conversion_change)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">流量趋势</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-600">跳出率</span><span className="text-sm font-medium text-gray-900">{monitorData.bounce_rate}%</span></div>
                      <Progress value={monitorData.bounce_rate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-600">加购率</span><span className="text-sm font-medium text-gray-900">{monitorData.add_to_cart_rate}%</span></div>
                      <Progress value={monitorData.add_to_cart_rate * 5} className="h-2 bg-green-100" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1"><span className="text-sm text-gray-600">复购率</span><span className="text-sm font-medium text-gray-900">{monitorData.repurchase_rate}%</span></div>
                      <Progress value={monitorData.repurchase_rate * 10} className="h-2 bg-purple-100" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center"><AlertCircle size={20} className="mr-2 text-yellow-600" />优化建议</h3>
                    <button onClick={handleOptimize} disabled={isOptimizing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center">
                      {isOptimizing ? <><Loader2 size={14} className="mr-1 animate-spin" />分析中...</> : <><RefreshCw size={14} className="mr-1" />生成建议</>}
                    </button>
                  </div>
                  {!optimization && (
                    <div className="text-center py-8 text-gray-400">
                      <AlertCircle size={48} className="mx-auto mb-4 opacity-50" /><p>点击生成按钮获取智能优化建议</p>
                    </div>
                  )}
                  {optimization && (
                    <div className="space-y-4">
                      {optimization.suggestions?.map((s, i) => (
                        <div key={i} className={`border rounded-lg p-4 ${s.priority === 'high' ? 'border-red-200 bg-red-50' : s.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge className={s.priority === 'high' ? 'bg-red-100 text-red-800' : s.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                                {s.priority === 'high' ? '高优先级' : s.priority === 'medium' ? '中优先级' : '低优先级'}
                              </Badge>
                              <span className="font-medium text-gray-900 text-sm">{s.category}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{s.description}</p>
                          <div className="bg-white rounded p-3 text-sm">
                            <p className="font-medium text-gray-900 text-xs mb-1">建议操作</p>
                            <p className="text-gray-600">{s.action}</p>
                          </div>
                          {s.expected_impact && (
                            <p className="text-xs text-gray-500 mt-2">预期提升: {s.expected_impact}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMonitorPage;
