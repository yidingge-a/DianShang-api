import { post, get, put, del } from '../api.js';

export const publishApi = {
  // 获取产品列表
  getProducts: (params) => get('/publish/products', params),
  
  // 添加产品
  addProduct: (data) => post('/publish/products', data),
  
  // 更新产品
  updateProduct: (productId, data) => put(`/publish/products/${productId}`, data),
  
  // 删除产品
  deleteProduct: (productId) => del(`/publish/products/${productId}`),
  
  // 获取平台推荐
  getPlatformRecommendation: (data) => post('/publish/platform-recommendation', data),
  
  // 获取平台列表
  getPlatforms: () => get('/publish/platforms'),
  
  // 一键上架
  publish: (data) => post('/publish/publish', data),
  
  // 获取上架任务状态
  getPublishTask: (publishId) => get(`/publish/tasks/${publishId}`),
};
