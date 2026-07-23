import React, { useState } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../context/AuthContext.jsx';

/** 全局登录/注册弹窗：未登录点功能时弹出 */
export default function AuthModal() {
  const { authModalOpen, closeAuth, authMode, setAuthMode, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = authMode !== 'register';

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleOpenChange = (open) => {
    if (!open) {
      closeAuth();
      resetForm();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.warning('请输入账号和密码');
      return;
    }
    if (!isLogin && !username.trim()) {
      toast.warning('请输入用户名');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        toast.success('登录成功，可使用全部功能');
      } else {
        const res = await register({
          username: username.trim(),
          email: email.trim(),
          password,
        });
        if (res?.success === false) {
          throw new Error(res.message || '注册失败');
        }
        toast.success('注册并登录成功');
      }
      closeAuth();
      resetForm();
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message || (isLogin ? '登录失败' : '注册失败');
      // 后端挂掉时常见 502/500 无业务文案
      if (/请求失败\s*\(?5\d\d\)?|Network|ECONNREFUSED|网络连接失败/i.test(String(msg))) {
        toast.error('无法连接服务器，请确认后端已启动（端口 8000）后再试');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isLogin ? '登录后继续使用' : '注册账号'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 -mt-1">
          登录后可使用平台全部功能（智能美工、合规文案、定价、上架等）
        </p>
        <div className="flex rounded-lg border border-gray-200 p-1 mb-2">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 text-sm rounded-md ${isLogin ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 text-sm rounded-md ${!isLogin ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
          >
            注册
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如：zhangsan"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isLogin ? '邮箱或用户名' : '邮箱'}
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isLogin ? 'dev 或 you@example.com' : 'you@example.com'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={18} className="mr-2 animate-spin" />请稍候…</>
            ) : isLogin ? (
              <><LogIn size={18} className="mr-2" />登录</>
            ) : (
              <><UserPlus size={18} className="mr-2" />注册并登录</>
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center">
          开发联调：dev@local.test / dev123456
        </p>
      </DialogContent>
    </Dialog>
  );
}
