import { post, get } from '../api.js';

export const pricingApi = {
  // 全网同款产品比价
  comparePrice: (data) => post('/pricing/price-comparison', data),
  
  // 获取定价推荐
  getRecommendation: (data) => post('/pricing/recommendation', data),
  
  // 产品成本拆解
  analyzeBOM: (data) => post('/pricing/bom/analyze', data),

  // vLLM 解析 BOM 产品图片
  parseBOMImage: (data) => post('/pricing/bom/parse-image', data),
  
  // 保存产品成本信息
  saveBOMProduct: (data) => post('/pricing/bom/products', data),
  
  // 获取成本报表
  getBOMReport: (productId) => get(`/pricing/bom/products/${productId}/report`),
  
  // 获取产品成本列表
  getBOMProducts: (params) => get('/pricing/bom/products', params),
};
