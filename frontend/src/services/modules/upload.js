import { post, get, del } from '../api.js';
import { uploadFile, uploadFiles } from '../api.js';

export const uploadApi = {
  // 通用文件上传
  upload: (file, type, module) => uploadFile('/upload', file, { type, module }),
  
  // 批量文件上传
  uploadBatch: (files, type, module) => uploadFiles('/upload/batch', files, { type, module }),
  
  // 获取文件列表
  list: (params) => get('/upload/list', params),
  
  // 删除文件
  delete: (fileId) => del(`/upload/${fileId}`),
};
