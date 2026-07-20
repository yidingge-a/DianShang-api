import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image, Wand2, Upload, X, Loader2, Check, Eye, Download, Sliders, Crop, Scissors, Palette, FileImage, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { smartDesignApi, uploadApi } from '../services/index.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const ImageOptimizePage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [optimizeOptions, setOptimizeOptions] = useState({
    optimize_type: 'all',
    intensity: 0.7,
    white_background: true,
    remove_defects: false,
    auto_crop: true,
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) await handleUpload(files);
  }, []);

  const handleUpload = async (files) => {
    setIsUploading(true);
    const newFiles = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} 超过10MB限制`); continue; }
        const response = await uploadApi.upload(file, 'image', 'smart-design');
        if (response.success) {
          newFiles.push({ ...response.data, originalFile: file, previewUrl: URL.createObjectURL(file) });
          toast.success(`${file.name} 上传成功`);
        }
      }
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (error) { toast.error('上传失败: ' + error.message);
    } finally { setIsUploading(false); }
  };

  const handleFileSelect = (e) => { const files = Array.from(e.target.files); if (files.length > 0) handleUpload(files); };
  const removeFile = (fileId) => { setUploadedFiles(prev => prev.filter(f => f.file_id !== fileId)); };

  const handleOptimize = async () => {
    if (uploadedFiles.length === 0) { toast.warning('请先上传图片'); return; }
    try {
      setProcessingTask('image-optimize');
      const response = await smartDesignApi.optimizeImage({ image_id: uploadedFiles[0].file_id, ...optimizeOptions });
      if (response.success) { toast.success('图片优化任务已提交'); pollTaskStatus(response.data.task_id); }
    } catch (error) { toast.error('优化失败: ' + error.message); setProcessingTask(null); }
  };

  const handleRemoveBackground = async () => {
    if (uploadedFiles.length === 0) { toast.warning('请先上传图片'); return; }
    try {
      setProcessingTask('background-remove');
      const response = await smartDesignApi.removeBackground({ image_id: uploadedFiles[0].file_id, background_type: 'white', output_format: 'png' });
      if (response.success) { toast.success('抠图任务已提交'); pollTaskStatus(response.data.task_id); }
    } catch (error) { toast.error('抠图失败: ' + error.message); setProcessingTask(null); }
  };

  const pollTaskStatus = async (taskId) => {
    let attempts = 0;
    const maxAttempts = 60;
    const checkStatus = async () => {
      if (attempts >= maxAttempts) { toast.error('任务处理超时'); setProcessingTask(null); return; }
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

  const optimizeTypes = [
    { id: 'retouch', name: '智能精修', icon: <Wand2 size={18} /> },
    { id: 'color', name: '调色', icon: <Palette size={18} /> },
    { id: 'brightness', name: '亮度调整', icon: <Sliders size={18} /> },
    { id: 'sharpen', name: '锐化', icon: <Eye size={18} /> },
    { id: 'all', name: '全部优化', icon: <SparklesIcon /> },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} /><span>返回首页</span>
            </Link>
            <span className="text-gray-400">/</span>
            <Link to="/smart-design" className="text-gray-600 hover:text-blue-600 transition-colors">智能美工</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">图片智能优化</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">图片智能优化</h1>
            <p className="text-gray-600 text-lg">上传图片进行智能优化、精修与抠图</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload size={20} className="mr-2 text-blue-600" />上传图片
          </h3>
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <Upload size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">拖拽图片到此处，或</p>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50">
              {isUploading ? <span className="flex items-center"><Loader2 size={16} className="mr-2 animate-spin" />上传中...</span> : '选择文件'}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
            <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG、GIF，最大 10MB</p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">已上传 {uploadedFiles.length} 个文件</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {uploadedFiles.map(file => (
                  <div key={file.file_id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {file.previewUrl ? <img src={file.previewUrl} alt={file.file_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><FileImage size={32} /></div>}
                    </div>
                    <button onClick={() => removeFile(file.file_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.file_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">图片优化设置</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">优化类型</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {optimizeTypes.map(type => (
                  <button key={type.id} onClick={() => setOptimizeOptions(prev => ({ ...prev, optimize_type: type.id }))}
                    className={`flex flex-col items-center p-4 rounded-lg border transition-all ${optimizeOptions.optimize_type === type.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                    {type.icon}<span className="text-sm mt-2">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">优化强度: {Math.round(optimizeOptions.intensity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.1" value={optimizeOptions.intensity}
                onChange={(e) => setOptimizeOptions(prev => ({ ...prev, intensity: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>轻度</span><span>标准</span><span>强力</span></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{ key: 'white_background', label: '白底效果', desc: '生成白底产品图' }, { key: 'remove_defects', label: '瑕疵修复', desc: '自动修复图片瑕疵' }, { key: 'auto_crop', label: '自动裁剪', desc: '智能裁剪主体' }].map(option => (
                <label key={option.key} className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${optimizeOptions[option.key] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={optimizeOptions[option.key]} onChange={(e) => setOptimizeOptions(prev => ({ ...prev, [option.key]: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded accent-blue-600" />
                  <div className="ml-3"><p className="text-sm font-medium text-gray-900">{option.label}</p><p className="text-xs text-gray-500">{option.desc}</p></div>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleOptimize} disabled={processingTask === 'image-optimize' || uploadedFiles.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {processingTask === 'image-optimize' ? <><Loader2 size={18} className="mr-2 animate-spin" />处理中...</> : <><Wand2 size={18} className="mr-2" />开始优化</>}
              </button>
              <button onClick={handleRemoveBackground} disabled={processingTask === 'background-remove' || uploadedFiles.length === 0}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center">
                {processingTask === 'background-remove' ? <><Loader2 size={18} className="mr-2 animate-spin" />处理中...</> : <><Scissors size={18} className="mr-2" />智能抠图</>}
              </button>
            </div>
          </div>
        </div>

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

function SparklesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M9 5H5"/><path d="M19 15v4"/><path d="M15 17h4"/>
    </svg>
  );
}

export default ImageOptimizePage;
