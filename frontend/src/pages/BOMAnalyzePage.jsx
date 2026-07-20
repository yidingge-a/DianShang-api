import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Calculator, BarChart3, Package, Truck, User, Box, Building2,
  Check, Loader2, AlertCircle, Sparkles, Upload, ImageIcon, ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { pricingApi } from '../services/index.js';
import { uploadApi } from '../services/index.js';

const BOMAnalyzePage = () => {
  const fileInputRef = useRef(null);
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSpecs, setProductSpecs] = useState('');
  const [imageId, setImageId] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [visionParse, setVisionParse] = useState(null);
  const [bomResult, setBomResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);

  const applyVisionToForm = (vp) => {
    if (!vp) return;
    if (vp.product_name) setProductName(vp.product_name);
    if (vp.product_category) setProductCategory(vp.product_category);
    const specParts = [
      vp.product_specs,
      vp.description,
      vp.visible_materials?.length ? `可见材质：${vp.visible_materials.join('、')}` : '',
      vp.visible_components?.length ? `可见部件：${vp.visible_components.join('、')}` : '',
      vp.brand_or_model ? `品牌/型号：${vp.brand_or_model}` : '',
    ].filter(Boolean);
    if (specParts.length) setProductSpecs(specParts.join('\n'));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('请上传图片文件');
      return;
    }

    setIsUploading(true);
    setVisionParse(null);
    setBomResult(null);
    setImagePreview(URL.createObjectURL(file));

    try {
      const uploadRes = await uploadApi.upload(file, 'image', 'bom');
      if (!uploadRes.success || !uploadRes.data?.file_id) {
        throw new Error(uploadRes.message || '上传失败');
      }
      const fid = uploadRes.data.file_id;
      setImageId(fid);

      setIsParsing(true);
      const parseRes = await pricingApi.parseBOMImage({ image_id: fid });
      if (parseRes.success && parseRes.data?.vision_parse) {
        const vp = parseRes.data.vision_parse;
        setVisionParse(vp);
        applyVisionToForm(vp);
        toast.success('vLLM 图片识别完成');
      } else {
        throw new Error(parseRes.message || '图片识别失败');
      }
    } catch (error) {
      toast.error(error.message || '图片处理失败');
      setImageId('');
      setImagePreview('');
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBOMAnalyze = async () => {
    const name = productName.trim() || visionParse?.product_name?.trim();
    if (!name && !imageId) {
      toast.warning('请输入产品名称或上传产品图片');
      return;
    }
    setIsAnalyzing(true);
    setBomResult(null);
    try {
      const payload = {
        product_name: name || productName.trim(),
        product_category: productCategory.trim(),
        product_specs: productSpecs.trim(),
      };
      if (imageId) payload.image_id = imageId;
      if (visionParse) payload.vision_parse = visionParse;

      const response = await pricingApi.analyzeBOM(payload);
      if (response.success) {
        setBomResult(response.data);
        if (response.data?.vision_parse) setVisionParse(response.data.vision_parse);
        toast.success('AI 成本拆解完成！');
      }
    } catch (error) {
      toast.error(error.message || '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveBOM = async () => {
    if (!bomResult) {
      toast.warning('请先进行 AI 成本拆解');
      return;
    }
    try {
      const response = await pricingApi.saveBOMProduct({
        product_name: productName.trim() || visionParse?.product_name,
        product_category: productCategory.trim(),
        product_specs: productSpecs.trim(),
        image_id: imageId,
        vision_parse: visionParse,
        ...bomResult,
      });
      if (response.success) {
        toast.success('产品成本信息已保存！');
        setSavedProducts((prev) => [
          ...prev,
          { name: productName || visionParse?.product_name, total_cost: bomResult.total_cost },
        ]);
      }
    } catch (error) {
      toast.error(error.message || '保存失败');
    }
  };

  const busy = isUploading || isParsing;

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-[1300px] mx-auto px-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <ArrowLeft size={20} /><span>返回首页</span>
            </Link>
            <span className="text-gray-400">/</span>
            <Link to="/pricing-cost" className="text-gray-600 hover:text-blue-600 transition-colors">定价成本</Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">BOM产品成本拆解分析</span>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">BOM产品成本拆解分析</h1>
            <p className="text-gray-600 text-lg">上传产品图 vLLM 识图 → LLM 一键拆解成本</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1300px] mx-auto px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Sparkles size={20} className="mr-2 text-blue-600" />AI 一键成本拆解
          </h3>
          <div className="space-y-4">
            {/* 图片上传 + vLLM 识图 */}
            <div className="border border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 shrink-0"
                >
                  {busy ? (
                    <><Loader2 size={18} className="animate-spin" />{isParsing ? 'vLLM 识图中...' : '上传中...'}</>
                  ) : (
                    <><Upload size={18} />上传产品图片</>
                  )}
                </button>
                {imagePreview && (
                  <img src={imagePreview} alt="产品预览" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
                )}
                <p className="text-sm text-gray-500 flex-1">
                  上传后由 vLLM 自动识别产品名称、材质、部件等信息，并回填到下方表单。
                  需在服务端 .env 配置 <code className="text-xs bg-gray-200 px-1 rounded">VISION_API_BASE</code>、<code className="text-xs bg-gray-200 px-1 rounded">VISION_MODEL</code>。
                </p>
              </div>
            </div>

            {/* vLLM 识图结果展示 */}
            {visionParse && (
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <p className="font-medium text-gray-900 mb-3 flex items-center">
                  <ScanLine size={18} className="mr-2 text-purple-600" />vLLM 图片识别结果
                  {visionParse.confidence && (
                    <span className="ml-2 text-xs font-normal text-purple-600 bg-white px-2 py-0.5 rounded">
                      置信度: {visionParse.confidence}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {visionParse.product_name && (
                    <div><span className="text-gray-500">产品名称：</span>{visionParse.product_name}</div>
                  )}
                  {visionParse.product_category && (
                    <div><span className="text-gray-500">品类：</span>{visionParse.product_category}</div>
                  )}
                  {visionParse.brand_or_model && (
                    <div><span className="text-gray-500">品牌/型号：</span>{visionParse.brand_or_model}</div>
                  )}
                </div>
                {visionParse.visible_materials?.length > 0 && (
                  <p className="text-sm mt-2 text-gray-700">
                    <span className="text-gray-500">可见材质：</span>{visionParse.visible_materials.join('、')}
                  </p>
                )}
                {visionParse.visible_components?.length > 0 && (
                  <p className="text-sm mt-1 text-gray-700">
                    <span className="text-gray-500">可见部件：</span>{visionParse.visible_components.join('、')}
                  </p>
                )}
                {(visionParse.description || visionParse.raw_text) && (
                  <div className="mt-3 p-3 bg-white rounded border border-purple-100 text-sm text-gray-700 whitespace-pre-wrap">
                    <p className="text-gray-500 mb-1 flex items-center"><ImageIcon size={14} className="mr-1" />识图描述</p>
                    {visionParse.description || visionParse.raw_text}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">产品名称 *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="可手动填写，或由 vLLM 识图自动填入"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">产品品类（选填）</label>
              <input
                type="text"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="例如：家居用品 / 杯壶器皿"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">规格与材质（选填，可编辑识图结果）</label>
              <textarea
                value={productSpecs}
                onChange={(e) => setProductSpecs(e.target.value)}
                placeholder="识图结果会自动填入，也可手动补充"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBOMAnalyze}
                disabled={isAnalyzing || busy}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isAnalyzing ? (
                  <><Loader2 size={18} className="mr-2 animate-spin" />AI 拆解中...</>
                ) : (
                  <><Sparkles size={18} className="mr-2" />AI 一键拆解成本</>
                )}
              </button>
              <button
                onClick={handleSaveBOM}
                disabled={!bomResult}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center"
              >
                <Check size={18} className="mr-2" />保存产品
              </button>
            </div>
          </div>
        </div>

        {bomResult && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <BarChart3 size={20} className="mr-2 text-blue-600" />成本分析结果
            </h3>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-2">AI 估算总成本</p>
                <p className="text-4xl font-bold text-blue-600">¥{Number(bomResult.total_cost).toFixed(2)}</p>
              </div>

              {bomResult.vision_parse && (
                <div className="text-xs text-purple-600 bg-purple-50 border border-purple-100 rounded px-3 py-2">
                  本次拆解已参考 vLLM 识图信息
                </div>
              )}

              {bomResult.components?.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-3 flex items-center">
                    <Package size={16} className="mr-2" />原材料 / 配件（AI 拆解）
                  </p>
                  <div className="space-y-2">
                    {bomResult.components.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700 border-b border-gray-100 pb-2">
                        <span>{c.name} × {c.quantity}</span>
                        <span className="text-blue-600">¥{(c.quantity * c.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bomResult.processes?.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-3 flex items-center">
                    <Building2 size={16} className="mr-2" />加工工艺（AI 拆解）
                  </p>
                  <div className="space-y-2">
                    {bomResult.processes.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700">
                        <span>{p.name}</span>
                        <span className="text-blue-600">¥{Number(p.cost).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 flex items-center">
                  <User size={14} className="mr-2 text-gray-500" />
                  <span>人工 ¥{Number(bomResult.labor_cost || 0).toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center">
                  <Truck size={14} className="mr-2 text-gray-500" />
                  <span>物流 ¥{Number(bomResult.logistics_cost || 0).toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center">
                  <Box size={14} className="mr-2 text-gray-500" />
                  <span>包装 ¥{Number(bomResult.packaging_cost || 0).toFixed(2)}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center">
                  <Calculator size={14} className="mr-2 text-gray-500" />
                  <span>管理费 {(Number(bomResult.overhead_rate || 0) * 100).toFixed(0)}%</span>
                </div>
              </div>

              {bomResult.cost_breakdown && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(bomResult.cost_breakdown).map(([key, value]) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 text-sm">{getCostLabel(key)}</span>
                        <span className="text-sm font-medium text-blue-600">
                          ¥{value.total?.toFixed(2)} ({value.percentage?.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(value.percentage || 0, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bomResult.suggestions?.length > 0 && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <p className="font-medium text-gray-900 mb-2 flex items-center">
                    <AlertCircle size={16} className="mr-2 text-yellow-600" />AI 优化建议
                  </p>
                  <ul className="space-y-2">
                    {bomResult.suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start">
                        <span className="text-yellow-600 mr-2">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {savedProducts.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">已保存产品</h3>
            <div className="space-y-2">
              {savedProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="text-blue-600 font-medium">总成本: ¥{p.total_cost?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getCostLabel(key) {
  const labels = {
    raw_materials: '原材料成本',
    processes: '加工成本',
    labor: '人工成本',
    logistics: '物流成本',
    packaging: '包装成本',
    overhead: '管理费用',
  };
  return labels[key] || key;
}

export default BOMAnalyzePage;
