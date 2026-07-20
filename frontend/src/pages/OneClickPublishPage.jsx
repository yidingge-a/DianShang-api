import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Check, X, Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { publishApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const OneClickPublishPage = () => {
  const [products, setProducts] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [publishConfig, setPublishConfig] = useState({ price_adjustment: 0, auto_optimize: true, sync_inventory: true });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, platformsRes] = await Promise.all([publishApi.getProducts(), publishApi.getPlatforms()]);
      if (productsRes.success) setProducts(productsRes.data || []);
      if (platformsRes.success) setPlatforms(platformsRes.data || []);
    } catch (error) { toast.error('加载数据失败: ' + error.message); } finally { setLoading(false); }
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => prev.includes(platformId) ? prev.filter(id => id !== platformId) : [...prev, platformId]);
  };

  const handlePublish = async () => {
    if (!selectedProduct) { toast.warning('请选择要上架的产品'); return; }
    if (selectedPlatforms.length === 0) { toast.warning('请至少选择一个平台'); return; }
    setIsPublishing(true);
    setPublishResult(null);
    try {
      const response = await publishApi.publish({
        product_id: selectedProduct.id, platforms: selectedPlatforms, ...publishConfig,
      });
      if (response.success) {
        toast.success('上架任务已提交！');
        const publishId = response.data.publish_id;
        let finalResult = null;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const taskRes = await publishApi.getPublishTask(publishId);
          if (taskRes.success && taskRes.data?.status === 'completed') {
            finalResult = taskRes.data;
            setPublishResult(taskRes.data);
            toast.success('各平台上架结果已返回');
            break;
          }
        }
        if (!finalResult) {
          setPublishResult(response.data);
        }
      }
    } catch (error) { toast.error('上架失败: ' + error.message); } finally { setIsPublishing(false); }
  };

  return (
    <div className="pt-20 min-h-screen bg-white">
      <div className="bg-gray-50 border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/publish" className="text-gray-600 hover:text-blue-600 transition-colors">上架发布</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">一键上架</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">一键上架</h1>
            <p className="text-gray-600 text-lg">选择产品和平台，一键完成多平台上架</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Upload size={20} className="mr-2 text-blue-600" />选择产品</h3>
            {loading ? (
              <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-blue-600 mx-auto" /></div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><p>暂无产品</p></div>
            ) : (
              <div className="space-y-2">
                {products.map(product => (
                  <button key={product.id} onClick={() => setSelectedProduct(product)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedProduct?.id === product.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">¥{product.price} · {product.category || '未分类'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Globe size={20} className="mr-2 text-blue-600" />选择平台</h3>
            {loading ? (
              <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-blue-600 mx-auto" /></div>
            ) : platforms.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><p>暂无平台数据</p></div>
            ) : (
              <div className="space-y-2">
                {platforms.map(platform => (
                  <label key={platform.id} className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${selectedPlatforms.includes(platform.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={selectedPlatforms.includes(platform.id)} onChange={() => togglePlatform(platform.id)} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{platform.name}</p>
                      <p className="text-xs text-gray-500">佣金 {platform.commission_rate} · 流量 {platform.traffic_level}</p>
                    </div>
                    {selectedPlatforms.includes(platform.id) && <Check size={16} className="text-blue-600" />}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center"><Check size={20} className="mr-2 text-blue-600" />上架配置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">价格调整</label>
                <select value={publishConfig.price_adjustment} onChange={(e) => setPublishConfig(prev => ({ ...prev, price_adjustment: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value={0}>保持原价</option><option value={5}>上浮 5%</option><option value={10}>上浮 10%</option>
                  <option value={-5}>下浮 5%</option><option value={-10}>下浮 10%</option>
                </select>
              </div>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                <input type="checkbox" checked={publishConfig.auto_optimize} onChange={(e) => setPublishConfig(prev => ({ ...prev, auto_optimize: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                <div><p className="text-sm font-medium text-gray-900">自动优化</p><p className="text-xs text-gray-500">自动优化标题、图片和描述</p></div>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                <input type="checkbox" checked={publishConfig.sync_inventory} onChange={(e) => setPublishConfig(prev => ({ ...prev, sync_inventory: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                <div><p className="text-sm font-medium text-gray-900">同步库存</p><p className="text-xs text-gray-500">跨平台同步库存数量</p></div>
              </label>
              <button onClick={handlePublish} disabled={isPublishing || !selectedProduct || selectedPlatforms.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {isPublishing ? <><Loader2 size={18} className="mr-2 animate-spin" />上架中...</> : <><Upload size={18} className="mr-2" />一键上架</>}
              </button>
            </div>
          </div>
        </div>

        {publishResult && (
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">上架结果</h3>
            <div className="space-y-3">
              {publishResult.results?.map((result, i) => (
                <div key={i} className={`border rounded-lg p-4 flex items-center justify-between ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {result.success ? <Check size={16} /> : <X size={16} />}
                    </div>
                    <div><p className="font-medium text-gray-900">{result.platform}</p><p className="text-sm text-gray-500">{result.message}</p></div>
                  </div>
                  {result.success && result.link && <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">查看链接</a>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OneClickPublishPage;
