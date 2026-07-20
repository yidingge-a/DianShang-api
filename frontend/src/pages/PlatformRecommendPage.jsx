import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Check, X, Plus, Loader2, Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { publishApi } from '../services/index.js';
import { Badge } from '@/components/ui/badge';

const PlatformRecommendPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isRecommending, setIsRecommending] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '' });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await publishApi.getProducts();
      if (response.success) setProducts(response.data || []);
    } catch (error) { toast.error('加载产品失败: ' + error.message); }
    finally { setLoading(false); }
  };

  const handleGetRecommendation = async (product) => {
    setSelectedProduct(product);
    setIsRecommending(true);
    try {
      const response = await publishApi.getPlatformRecommendation({ product_id: product.id, product_name: product.name });
      if (response.success) { setRecommendations(response.data); toast.success('平台推荐获取成功！'); }
    } catch (error) { toast.error('获取推荐失败: ' + error.message); } finally { setIsRecommending(false); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name) { toast.warning('请输入产品名称'); return; }
    try {
      const response = await publishApi.addProduct(newProduct);
      if (response.success) { setProducts(prev => [...prev, response.data]); setShowAddModal(false); setNewProduct({ name: '', price: '', category: '' }); toast.success('产品添加成功'); }
    } catch (error) { toast.error('添加失败: ' + error.message); }
  };

  const handleDeleteProduct = async (id) => {
    try {
      const response = await publishApi.deleteProduct(id);
      if (response.success) { setProducts(prev => prev.filter(p => p.id !== id)); toast.success('产品已删除'); }
    } catch (error) { toast.error('删除失败: ' + error.message); }
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
            <span className="text-gray-900">平台推荐</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">平台推荐</h1>
            <p className="text-gray-600 text-lg">智能分析产品特性，推荐最优上架平台</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center"><Target size={20} className="mr-2 text-blue-600" />产品列表</h3>
            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center"><Plus size={16} className="mr-1" />添加产品</button>
          </div>
          {loading ? (
            <div className="text-center py-12"><Loader2 size={32} className="animate-spin text-blue-600 mx-auto" /><p className="text-gray-500 mt-2">加载中...</p></div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Target size={48} className="mx-auto mb-4 opacity-50" /><p>暂无产品，请添加产品后获取平台推荐</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">产品名称</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">价格</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">品类</th><th className="px-4 py-3 text-left text-sm font-medium text-gray-700">操作</th></tr></thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-gray-600">¥{product.price}</td>
                      <td className="px-4 py-3 text-gray-600">{product.category || '未分类'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleGetRecommendation(product)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">获取推荐</button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-800 text-sm">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isRecommending && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8 text-center">
            <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-2" /><p className="text-gray-600">正在分析并推荐最优平台...</p>
          </div>
        )}

        {recommendations && selectedProduct && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">平台推荐结果 - {selectedProduct.name}</h3>
            <div className="space-y-4">
              {recommendations.platforms?.map((rec, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">{rec.name?.charAt(0)}</div>
                      <div><p className="font-medium text-gray-900">{rec.name}</p><p className="text-xs text-gray-500">{rec.type}</p></div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1"><Star size={16} className="text-yellow-500 fill-yellow-500" /><span className="font-bold text-gray-900">{rec.match_score}%</span></div>
                      <p className="text-xs text-gray-500">匹配度</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-gray-50 rounded p-2"><p className="text-gray-500 text-xs">预估流量</p><p className="font-medium text-gray-900">{rec.estimated_traffic}</p></div>
                    <div className="bg-gray-50 rounded p-2"><p className="text-gray-500 text-xs">佣金费率</p><p className="font-medium text-gray-900">{rec.commission_rate}</p></div>
                    <div className="bg-gray-50 rounded p-2"><p className="text-gray-500 text-xs">竞争强度</p><p className="font-medium text-gray-900">{rec.competition_level}</p></div>
                    <div className="bg-gray-50 rounded p-2"><p className="text-gray-500 text-xs">建议定价</p><p className="font-medium text-blue-600">¥{rec.suggested_price}</p></div>
                  </div>
                  {rec.reason && <p className="text-sm text-gray-600 mt-2 flex items-start"><TrendingUp size={14} className="mr-1 mt-0.5 text-blue-500" />{rec.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">添加产品</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label><input type="text" value={newProduct.name} onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="输入产品名称" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">产品价格</label><input type="number" value={newProduct.price} onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="输入价格" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">产品品类</label><input type="text" value={newProduct.category} onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如：家居用品" /></div>
              <div className="flex space-x-3 mt-6">
                <button onClick={handleAddProduct} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all">添加</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-all">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformRecommendPage;
