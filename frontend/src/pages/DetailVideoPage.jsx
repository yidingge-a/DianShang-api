import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, FileImage, Upload, X, Loader2, Check, Download, FileImage as FileImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { smartDesignApi, uploadApi } from '../services/index.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const DetailVideoPage = () => {
  const [activeTab, setActiveTab] = useState('detail'); // detail | video
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [detailPageOptions, setDetailPageOptions] = useState({
    product_name: '', product_description: '', style: 'modern', output_format: 'html',
  });
  const [videoOptions, setVideoOptions] = useState({
    product_name: '', duration: 15, style: 'dynamic',
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length > 0) await handleUpload(files);
  }, []);

  const handleUpload = async (files) => {
    setIsUploading(true);
    const newFiles = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} 超过10MB限制`); continue; }
        const response = await uploadApi.upload(file, 'image', 'smart-design');
        if (response.success) { newFiles.push({ ...response.data, originalFile: file, previewUrl: URL.createObjectURL(file) }); toast.success(`${file.name} 上传成功`); }
      }
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) { toast.error('上传失败: ' + error.message); } finally { setIsUploading(false); }
  };

  const handleFileSelect = (e) => { const files = Array.from(e.target.files); if (files.length > 0) handleUpload(files); };
  const removeFile = (fileId) => { setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId)); };

  const handleGenerateDetailPage = async () => {
    if (!detailPageOptions.product_name) { toast.warning('请输入产品名称'); return; }
    try {
      setProcessingTask('detail-page');
      const response = await smartDesignApi.generateDetailPage({ ...detailPageOptions, product_images: uploadedFiles.map(f => f.file_id) });
      if (response.success) { toast.success('详情页生成任务已提交'); setResultData(response.data); setShowResult(true); }
    } catch (error) { toast.error('生成失败: ' + error.message); setProcessingTask(null); }
  };

  const handleGenerateVideo = async () => {
    if (!videoOptions.product_name) { toast.warning('请输入产品名称'); return; }
    try {
      setProcessingTask('video');
      const response = await smartDesignApi.generateVideo({ ...videoOptions, product_images: uploadedFiles.map(f => f.file_id) });
      if (response.success) { toast.success('视频生成任务已提交'); pollTaskStatus(response.data.task_id); }
    } catch (error) { toast.error('生成失败: ' + error.message); setProcessingTask(null); }
  };

  const pollTaskStatus = async (taskId) => {
    let attempts = 0;
    const checkStatus = async () => {
      if (attempts >= 60) { toast.error('任务处理超时'); setProcessingTask(null); return; }
      try {
        const response = await smartDesignApi.getTaskStatus(taskId);
        const data = response.data;
        setTaskStatus(data);
        if (data.status === 'completed') { toast.success('任务完成！'); setResultData(data); setShowResult(true); setProcessingTask(null); }
        else if (data.status === 'failed') { toast.error('任务失败: ' + (data.error_message || '未知错误')); setProcessingTask(null); }
        else { attempts++; setTimeout(checkStatus, 3000); }
      } catch (error) { toast.error('查询状态失败: ' + error.message); setProcessingTask(null); }
    };
    checkStatus();
  };

  const detailStyles = [
    { id: 'modern', name: '现代简约', description: '简洁大方，突出产品' },
    { id: 'minimal', name: '极简风格', description: '留白多，高级感' },
    { id: 'luxury', name: '奢华风格', description: '金色元素，高端质感' },
    { id: 'cute', name: '可爱风格', description: '色彩丰富，活泼可爱' },
  ];

  const videoStyles = [
    { id: 'dynamic', name: '动感节奏', description: '快节奏，适合促销' },
    { id: 'elegant', name: '优雅精致', description: '慢节奏，适合高端产品' },
    { id: 'simple', name: '简洁明了', description: '直接展示，信息清晰' },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"><ArrowLeft size={20} /><span>返回首页</span></Link>
            <span className="text-gray-400">/</span>
            <Link to="/smart-design" className="text-gray-600 hover:text-blue-600 transition-colors">智能美工</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">详情页与视频生成</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">详情页与视频生成</h1>
            <p className="text-gray-600 text-lg">智能生成产品详情页和营销视频</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Upload size={20} className="mr-2 text-blue-600" />上传素材</h3>
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <Upload size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">拖拽文件到此处，或</p>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50">
              {isUploading ? <span className="flex items-center"><Loader2 size={16} className="mr-2 animate-spin" />上传中...</span> : '选择文件'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <p className="text-xs text-gray-400 mt-2">支持图片和视频，最大 10MB</p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">已上传 {uploadedFiles.length} 个文件</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {uploadedFiles.map(file => (
                  <div key={file.file_id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {file.previewUrl ? <img src={file.previewUrl} alt={file.file_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><FileImageIcon size={32} /></div>}
                    </div>
                    <button onClick={() => removeFile(file.file_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.file_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-1 mb-8">
          {[{ id: 'detail', label: '生成详情页', icon: <FileImageIcon size={18} /> }, { id: 'video', label: '生成视频', icon: <Video size={18} /> }].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowResult(false); }}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all border-b-2 flex-1 justify-center ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'detail' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">详情页生成设置</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                <input type="text" value={detailPageOptions.product_name} onChange={(e) => setDetailPageOptions(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="例如：304不锈钢保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品描述</label>
                <textarea value={detailPageOptions.product_description} onChange={(e) => setDetailPageOptions(prev => ({ ...prev, product_description: e.target.value }))}
                  placeholder="描述产品特点、卖点..." rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">页面风格</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {detailStyles.map(style => (
                    <button key={style.id} onClick={() => setDetailPageOptions(prev => ({ ...prev, style: style.id }))}
                      className={`p-4 rounded-lg border text-left transition-all ${detailPageOptions.style === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="font-medium text-gray-900 text-sm">{style.name}</p><p className="text-xs text-gray-500 mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">输出格式</label>
                <div className="flex space-x-3">
                  {['html', 'images', 'pdf'].map(format => (
                    <button key={format} onClick={() => setDetailPageOptions(prev => ({ ...prev, output_format: format }))}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${detailPageOptions.output_format === format ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {format === 'html' ? 'HTML网页' : format === 'images' ? '图片集' : 'PDF文档'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleGenerateDetailPage} disabled={processingTask === 'detail-page'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {processingTask === 'detail-page' ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</> : <><FileImageIcon size={18} className="mr-2" />生成详情页</>}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">视频生成设置</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
                <input type="text" value={videoOptions.product_name} onChange={(e) => setVideoOptions(prev => ({ ...prev, product_name: e.target.value }))}
                  placeholder="例如：304不锈钢保温杯" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">视频时长: {videoOptions.duration} 秒</label>
                <input type="range" min="5" max="60" step="5" value={videoOptions.duration}
                  onChange={(e) => setVideoOptions(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5秒</span><span>30秒</span><span>60秒</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">视频风格</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {videoStyles.map(style => (
                    <button key={style.id} onClick={() => setVideoOptions(prev => ({ ...prev, style: style.id }))}
                      className={`p-4 rounded-lg border text-left transition-all ${videoOptions.style === style.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <p className="font-medium text-gray-900 text-sm">{style.name}</p><p className="text-xs text-gray-500 mt-1">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleGenerateVideo} disabled={processingTask === 'video'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {processingTask === 'video' ? <><Loader2 size={18} className="mr-2 animate-spin" />生成中...</> : <><Video size={18} className="mr-2" />生成视频</>}
              </button>
            </div>
          </div>
        )}

        {processingTask && taskStatus && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">处理进度</h3>
              <span className="text-sm text-gray-500">{taskStatus.status === 'processing' ? '处理中' : taskStatus.status === 'pending' ? '排队中' : taskStatus.status}</span>
            </div>
            <Progress value={taskStatus.progress || 0} className="mb-2" />
            <p className="text-sm text-gray-600">{taskStatus.progress || 0}% 完成</p>
          </div>
        )}
      </div>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center"><Check size={20} className="mr-2 text-green-600" />处理完成</DialogTitle></DialogHeader>
          {resultData && (
            <div className="space-y-4">
              {resultData.html_url && (
                <div><p className="text-sm font-medium text-gray-700 mb-2">详情页链接</p>
                  <a href={resultData.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">{resultData.html_url}</a></div>
              )}
              {resultData.result && resultData.result.preview_images && (
                <div><p className="text-sm font-medium text-gray-700 mb-2">预览图片</p>
                  <div className="grid grid-cols-2 gap-3">{resultData.result.preview_images.map((url, i) => <img key={i} src={url} alt={`预览 ${i + 1}`} className="rounded-lg border border-gray-200" />)}</div>
                </div>
              )}
              {resultData.result_url && (
                <div><p className="text-sm font-medium text-gray-700 mb-2">结果预览</p><div className="rounded-lg overflow-hidden border border-gray-200"><img src={resultData.result_url} alt="处理结果" className="w-full" /></div></div>
              )}
              <div className="flex gap-3 pt-4 border-t">
                {resultData.result_url && <a href={resultData.result_url} download className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium text-center transition-all flex items-center justify-center"><Download size={16} className="mr-2" />下载结果</a>}
                <button onClick={() => setShowResult(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all">关闭</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DetailVideoPage;
