import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext.jsx';

/** 登录页：邮箱或用户名 + 密码 */
const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('请输入账号和密码');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('登录成功');
      navigate('/');
    } catch (err) {
      toast.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">登录</h1>
          <p className="text-gray-600 mt-2 text-sm">全链路电商智能系统</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱或用户名</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev 或 dev@local.test"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <><Loader2 size={18} className="mr-2 animate-spin" />登录中...</> : <><LogIn size={18} className="mr-2" />登录</>}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">
          还没有账号？
          <Link to="/register" className="text-blue-600 hover:underline ml-1">立即注册</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-4">
          开发联调：dev@local.test / dev123456
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
