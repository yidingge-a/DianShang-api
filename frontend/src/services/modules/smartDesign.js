import { post, get } from '../api.js';

export const smartDesignApi = {
  // 图片智能优化
  optimizeImage: (data) => post('/smart-design/image/optimize', data),
  
  // 白底图制作 / 智能抠图
  removeBackground: (data) => post('/smart-design/image/background-remove', data),
  
  // 图片瑕疵修复
  repairImage: (data) => post('/smart-design/image/repair', data),
  
  // 批量图片处理
  batchProcess: (data) => post('/smart-design/image/batch', data),
  
  // 生成商品详情页
  generateDetailPage: (data) => post('/smart-design/detail-page/generate', data),
  
  // 生成主图视频 / 宣传短视频
  generateVideo: (data) => post('/smart-design/video/generate', data),
  
  // 生成活动海报
  generatePoster: (data) => post('/smart-design/poster/generate', data),
  
  // 双图合并
  mergeImages: (data) => post('/smart-design/tools/merge-images', data),
  
  // 图片添加元素
  addElements: (data) => post('/smart-design/tools/add-elements', data),
  
  // 尺寸裁剪 / 批量改图
  cropResize: (data) => post('/smart-design/tools/crop-resize', data),
  
  // 获取模板列表
  getTemplates: (params) => get('/smart-design/templates', params),
  
  // 查询任务状态
  getTaskStatus: (taskId) => get(`/smart-design/tasks/${taskId}`),
};
