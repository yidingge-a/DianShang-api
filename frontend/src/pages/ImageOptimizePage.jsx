import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wand2, Upload, X, Loader2, Check, Eye, Download, Sliders, Palette, FileImage, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { smartDesignApi, uploadApi } from '../services/index.js';
import { Progress } from '@/components/ui/progress';

const VLM_OPTIONS = [
  { key: 'white_background', label: '白底效果', desc: '大模型裁剪主体并生成白底产品图' },
  { key: 'remove_defects', label: '瑕疵修复', desc: '视觉大模型自动修复图片瑕疵' },
  { key: 'auto_crop', label: '自动裁剪', desc: '智能裁剪商品主体' },
];

function toAssetPath(url) {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const idx = url.indexOf('/uploads/');
  if (idx >= 0) return url.slice(idx);
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname.startsWith('/uploads')) return `${u.pathname}${u.search || ''}`;
  } catch { /* ignore */ }
  return url;
}

const ImageOptimizePage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const resultSectionRef = useRef(null);

  // 图1 classic / 图2 vlm 互斥
  const [featureSet, setFeatureSet] = useState('classic');
  const [optimizeType, setOptimizeType] = useState('all');
  const [intensity, setIntensity] = useState(0.7);
  const [vlmAction, setVlmAction] = useState(null);

  const selectClassic = (typeId) => {
    setFeatureSet('classic');
    setOptimizeType(typeId);
    setVlmAction(null);
  };

  const selectVlm = (action) => {
    setFeatureSet('vlm');
    setVlmAction(action);
    setOptimizeType(null);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) await handleUpload(files);
  }, []);

  const handleUpload = async (files) => {
    setIsUploading(true);
    const newFiles = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} 超过10MB限制`);
          continue;
        }
        const response = await uploadApi.upload(file, 'image', 'smart-design');
        if (response.success) {
          newFiles.push({ ...response.data, originalFile: file, previewUrl: URL.createObjectURL(file) });
          toast.success(`${file.name} 上传成功`);
        }
      }
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      toast.error('上传失败: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) handleUpload(files);
  };
  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file_id !== fileId));
  };

  const scrollToResult = () => {
    setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleOptimize = async () => {
    if (uploadedFiles.length === 0) {
      toast.warning('请先上传图片');
      return;
    }
    if (featureSet === 'classic' && !optimizeType) {
      toast.warning('请选择优化类型');
      return;
    }
    if (featureSet === 'vlm' && !vlmAction) {
      toast.warning('请选择白底效果 / 瑕疵修复 / 自动裁剪之一');
      return;
    }
    try {
      setProcessingTask('image-optimize');
      setTaskStatus({ status: 'processing', progress: 5 });
      const payload = {
        image_id: uploadedFiles[0].file_id,
        feature_set: featureSet,
        intensity,
        optimize_type: featureSet === 'classic' ? optimizeType : null,
        vlm_action: featureSet === 'vlm' ? vlmAction : null,
        white_background: featureSet === 'vlm' && vlmAction === 'white_background',
        remove_defects: featureSet === 'vlm' && vlmAction === 'remove_defects',
        auto_crop: featureSet === 'vlm' && vlmAction === 'auto_crop',
      };
      const response = await smartDesignApi.optimizeImage(payload);
      if (response.success) {
        toast.success(featureSet === 'vlm' ? '视觉大模型任务已提交' : '图片优化任务已提交');
        pollTaskStatus(response.data.task_id);
      }
    } catch (error) {
      toast.error('优化失败: ' + error.message);
      setProcessingTask(null);
    }
  };

  const pollTaskStatus = async (taskId) => {
    let attempts = 0;
    const maxAttempts = 180;
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        toast.error('任务处理超时');
        setProcessingTask(null);
        return;
      }
      try {
        const response = await smartDesignApi.getTaskStatus(taskId);
        const data = response.data;
        setTaskStatus(data);
        if (data.status === 'completed') {
          toast.success('任务完成！结果已保留在下方');
          setResultData({
            ...data,
            result_url: toAssetPath(data.result_url),
            original_url: toAssetPath(data.original_url) || uploadedFiles[0]?.previewUrl || '',
            completed_at: data.completed_at || new Date().toISOString(),
          });
          setProcessingTask(null);
          scrollToResult();
          return;
        }
        if (data.status === 'failed') {
          toast.error(data.error_message || '任务失败');
          setProcessingTask(null);
          return;
        }
        attempts += 1;
        setTimeout(checkStatus, 2000);
      } catch (error) {
        toast.error('查询状态失败: ' + error.message);
        setProcessingTask(null);
      }
    };
    checkStatus();
  };

  const optimizeTypes = [
    { id: 'retouch', name: '智能精修', icon: <Wand2 size={18} /> },
    { id: 'color', name: '调色', icon: <Palette size={18} /> },
    { id: 'brightness', name: '亮度调整', icon: <Sliders size={18} /> },
    { id: 'sharpen', name: '锐化', icon: <Eye size={18} /> },
    { id: 'all', name: '全部优化', icon: <Sparkles size={18} /> },
  ];

  const classicActive = featureSet === 'classic';
  const vlmActive = featureSet === 'vlm';
  const originalPreview = resultData?.original_url
    || uploadedFiles[0]?.previewUrl
    || toAssetPath(uploadedFiles[0]?.file_url);
  const resultUrl = resultData?.result_url;

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
            <p className="text-gray-600 text-lg">经典精修与视觉大模型功能互斥，请选择一组后开始处理</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload size={20} className="mr-2 text-blue-600" />上传图片
          </h3>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">拖拽图片到此处，或</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <span className="flex items-center"><Loader2 size={16} className="mr-2 animate-spin" />上传中...</span>
              ) : (
                '选择文件'
              )}
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
            <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG、GIF，最大 10MB</p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">已上传 {uploadedFiles.length} 个文件</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {uploadedFiles.map((file) => (
                  <div key={file.file_id} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {file.previewUrl ? (
                        <img src={file.previewUrl} alt={file.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><FileImage size={32} /></div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(file.file_id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{file.file_name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">图片优化设置</h3>
          <p className="text-xs text-gray-500 mb-6">图1（经典精修）与图2（视觉大模型）互斥：选中一组后另一组不可同时使用</p>

          <div className={`space-y-6 rounded-lg border p-4 transition-all ${classicActive ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-800">优化类型（图1）</label>
              {classicActive && <span className="text-xs text-blue-600 font-medium">已选此功能集</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {optimizeTypes.map((type) => {
                const selected = classicActive && optimizeType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => selectClassic(type.id)}
                    className={`flex flex-col items-center p-4 rounded-lg border transition-all ${
                      selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}
                  >
                    {type.icon}
                    <span className="text-sm mt-2">{type.name}</span>
                  </button>
                );
              })}
            </div>
            <div className={!classicActive ? 'pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优化强度: {Math.round(intensity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={intensity}
                disabled={!classicActive}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-40"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>轻度</span><span>标准</span><span>强力</span>
              </div>
            </div>
          </div>

          <div className={`mt-6 space-y-4 rounded-lg border p-4 transition-all ${vlmActive ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-800">视觉大模型（图2）</label>
              {vlmActive && <span className="text-xs text-blue-600 font-medium">已选此功能集</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {VLM_OPTIONS.map((option) => {
                const selected = vlmActive && vlmAction === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => selectVlm(option.key)}
                    className={`flex items-start text-left p-4 rounded-lg border transition-all ${
                      selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-sm border flex-shrink-0 ${
                        selected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                      }`}
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleOptimize}
              disabled={!!processingTask || uploadedFiles.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {processingTask ? (
                <><Loader2 size={18} className="mr-2 animate-spin" />处理中...</>
              ) : (
                <><Wand2 size={18} className="mr-2" />开始优化</>
              )}
            </button>
          </div>
        </div>

        {processingTask && taskStatus && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">处理进度</h3>
              <span className="text-sm text-gray-500">
                {taskStatus.status === 'processing' ? '处理中' : taskStatus.status === 'pending' ? '排队中' : taskStatus.status}
              </span>
            </div>
            <Progress value={taskStatus.progress || 0} className="mb-2" />
            <p className="text-sm text-gray-600">{taskStatus.message || `${taskStatus.progress || 0}% 完成`}</p>
          </div>
        )}

        {/* 优化结果常驻页面，不因关闭弹窗而消失 */}
        {resultData && resultUrl && (
          <div
            ref={resultSectionRef}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mt-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Check size={20} className="mr-2 text-green-600" />
                优化结果
              </h3>
              <div className="flex items-center gap-2">
                {resultData.completed_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(resultData.completed_at).toLocaleString()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setResultData(null)}
                  className="text-xs text-gray-500 hover:text-red-500 px-2 py-1"
                >
                  清除结果
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">原图</p>
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center">
                  {originalPreview ? (
                    <img src={originalPreview} alt="原图" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-400 text-sm">无原图预览</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">结果图</p>
                <div className="rounded-lg overflow-hidden border border-blue-200 bg-gray-50 aspect-square flex items-center justify-center">
                  <img src={resultUrl} alt="优化结果" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-100">
              <a
                href={resultUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
              >
                <Download size={16} className="mr-2" />下载结果
              </a>
              <a
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
              >
                <Eye size={16} className="mr-2" />新窗口查看
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageOptimizePage;
