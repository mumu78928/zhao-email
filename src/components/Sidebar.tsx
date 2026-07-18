import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Send, Settings, ExternalLink, LogOut, RefreshCw, MailCheck } from 'lucide-react';
import { useEmailStore } from '../store/emailStore';
import { getProviders } from '../api/emailApi';

interface SidebarProps {
  onRefresh: () => void;
}

export default function Sidebar({ onRefresh }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { configs, providers, clearConfigs, setProviders } = useEmailStore();

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  const getWebUrl = () => {
    if (configs.length === 0) return '';
    const config = configs[0];
    if (config.customConfig?.webUrl) return config.customConfig.webUrl;
    const provider = providers.find(p => p.id === config.providerId);
    return provider?.webUrl || '';
  };

  const handleLogout = () => {
    clearConfigs();
    navigate('/');
  };

  const handleRefreshProviders = async () => {
    const providerList = await getProviders();
    setProviders(providerList);
  };

  const menuItems = [
    { icon: Mail, path: '/inbox', label: '收件箱' },
    { icon: Send, path: '/compose', label: '写邮件' },
    { icon: Settings, path: '/settings', label: '设置' }
  ];

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">邮箱客户端</h1>
            <p className="text-xs text-gray-400">
              {configs.length > 0 ? `${configs.length}个账户` : '未登录'}
            </p>
          </div>
        </div>
      </div>

      {configs.length > 0 && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <MailCheck className="w-4 h-4" />
            <span>已添加账户</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {configs.map((config) => (
              <div
                key={config.id}
                className="px-3 py-2 bg-slate-700/50 rounded-lg"
              >
                <p className="text-sm text-white truncate">{config.email}</p>
                <p className="text-xs text-gray-500">{getProviderName(config.providerId)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={onRefresh}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-slate-700 hover:text-white transition-all duration-200"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="font-medium">刷新邮件</span>
        </button>
        
        {getWebUrl() && (
          <button
            onClick={() => window.open(getWebUrl(), '_blank')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-slate-700 hover:text-white transition-all duration-200"
          >
            <ExternalLink className="w-5 h-5" />
            <span className="font-medium">网页版邮箱</span>
          </button>
        )}

        {configs.length > 0 && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">退出登录</span>
          </button>
        )}
      </div>
    </aside>
  );
}