import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Settings as SettingsIcon, Check, Loader2, AlertCircle, ExternalLink, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useEmailStore, EmailProvider } from '../store/emailStore';
import { getProviders, validateConfig } from '../api/emailApi';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { providers, setProviders, configs, addConfig, removeConfig, clearConfigs } = useEmailStore();
  
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useCustomConfig, setUseCustomConfig] = useState(false);
  const [customImapHost, setCustomImapHost] = useState('');
  const [customImapPort, setCustomImapPort] = useState(993);
  const [customSmtpHost, setCustomSmtpHost] = useState('');
  const [customSmtpPort, setCustomSmtpPort] = useState(465);
  const [customWebUrl, setCustomWebUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ provider?: boolean; email?: boolean; password?: boolean }>({});

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    const providerList = await getProviders();
    setProviders(providerList);
  };

  const getCurrentProvider = (): EmailProvider | undefined => {
    return providers.find(p => p.id === selectedProvider);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setValidationErrors({});

    const errors: { provider?: boolean; email?: boolean; password?: boolean } = {};
    if (!selectedProvider) errors.provider = true;
    if (!email) errors.email = true;
    if (!password) errors.password = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const missing = [];
      if (errors.provider) missing.push('邮箱服务商');
      if (errors.email) missing.push('邮箱地址');
      if (errors.password) missing.push('授权码');
      setError('请填写完整信息：' + missing.join('、'));
      setLoading(false);
      return;
    }

    const customConfig = useCustomConfig
      ? {
          imapHost: customImapHost,
          imapPort: customImapPort,
          smtpHost: customSmtpHost,
          smtpPort: customSmtpPort,
          webUrl: customWebUrl
        }
      : undefined;

    const config = { email, password, providerId: selectedProvider, customConfig };

    try {
      const result = await validateConfig(config);
      if (result.valid) {
        addConfig(config);
        setSuccess(true);
        setTimeout(() => {
          navigate('/inbox');
        }, 1500);
      } else {
        setError(result.error || '邮箱配置验证失败，请检查授权码是否正确');
      }
    } catch {
      setError('连接服务器失败，请检查应用是否正常运行');
    }

    setLoading(false);
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setSelectedProvider('');
    setUseCustomConfig(false);
    setCustomImapHost('');
    setCustomImapPort(993);
    setCustomSmtpHost('');
    setCustomSmtpPort(465);
    setCustomWebUrl('');
    setSuccess(false);
    setError('');
  };

  const handleRemoveAccount = (configId: string) => {
    if (configs.length === 1) {
      if (confirm('确定要删除这个账户吗？删除后将返回登录页面。')) {
        clearConfigs();
      }
    } else {
      if (confirm('确定要删除这个账户吗？')) {
        removeConfig(configId);
      }
    }
  };

  const handleOpenWebMail = (config: typeof configs[0]) => {
    let webUrl = '';
    if (config.customConfig?.webUrl) {
      webUrl = config.customConfig.webUrl;
    } else {
      const provider = providers.find(p => p.id === config.providerId);
      webUrl = provider?.webUrl || '';
    }
    if (webUrl) {
      window.open(webUrl, '_blank');
    }
  };

  if (configs.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">邮箱客户端</h1>
            <p className="text-gray-400">管理您的邮箱账户</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">已添加账户</h2>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加账户
                </button>
              </div>

              <div className="space-y-3">
                {configs.map((config) => {
                  const provider = providers.find(p => p.id === config.providerId);
                  return (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border border-slate-600 hover:border-slate-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{provider?.name || config.providerId}</p>
                          <p className="text-sm text-gray-400">{config.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenWebMail(config)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors"
                          title="打开网页版"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveAccount(config.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="删除账户"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <button
                  onClick={() => navigate('/inbox')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium transition-colors"
                >
                  返回收件箱
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-6">添加新账户</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    选择邮箱服务商
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className={`grid grid-cols-4 gap-3 p-3 rounded-xl transition-colors ${
                    validationErrors.provider ? 'bg-red-900/20 border border-red-800' : ''
                  }`}>
                    {providers.map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => {
                          setSelectedProvider(provider.id);
                          setUseCustomConfig(false);
                        }}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                          selectedProvider === provider.id
                            ? 'border-blue-500 bg-blue-600/20'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }`}
                      >
                        <span className="text-2xl mb-1">{provider.icon}</span>
                        <span className="text-xs font-medium text-gray-300">{provider.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider('custom');
                        setUseCustomConfig(true);
                      }}
                      className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedProvider === 'custom'
                          ? 'border-blue-500 bg-blue-600/20'
                          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                      }`}
                    >
                      <SettingsIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs font-medium text-gray-300">自定义</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    邮箱地址
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: false }));
                    }}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none transition-colors ${
                      validationErrors.email
                        ? 'bg-red-900/20 border border-red-800 focus:border-red-500'
                        : 'bg-slate-700/50 border border-slate-600 focus:border-blue-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    授权码
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: false }));
                    }}
                    placeholder="请输入邮箱授权码"
                    className={`w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none transition-colors ${
                      validationErrors.password
                        ? 'bg-red-900/20 border border-red-800 focus:border-red-500'
                        : 'bg-slate-700/50 border border-slate-600 focus:border-blue-500'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    提示：授权码需在邮箱网页版中获取，不是邮箱登录密码
                    {getCurrentProvider()?.authHelpUrl && (
                      <a
                        href={getCurrentProvider()!.authHelpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-1 underline"
                      >
                        点击查看如何获取授权码
                      </a>
                    )}
                  </p>
                </div>

                {useCustomConfig && (
                  <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center">
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      自定义服务器配置
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">IMAP服务器</label>
                        <input
                          type="text"
                          value={customImapHost}
                          onChange={(e) => setCustomImapHost(e.target.value)}
                          placeholder="imap.example.com"
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">IMAP端口</label>
                        <input
                          type="number"
                          value={customImapPort}
                          onChange={(e) => setCustomImapPort(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">SMTP服务器</label>
                        <input
                          type="text"
                          value={customSmtpHost}
                          onChange={(e) => setCustomSmtpHost(e.target.value)}
                          placeholder="smtp.example.com"
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">SMTP端口</label>
                        <input
                          type="number"
                          value={customSmtpPort}
                          onChange={(e) => setCustomSmtpPort(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">网页版地址</label>
                        <input
                          type="url"
                          value={customWebUrl}
                          onChange={(e) => setCustomWebUrl(e.target.value)}
                          placeholder="https://mail.example.com"
                          className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="whitespace-pre-line text-sm">{error}</div>
                  </div>
                )}

                {success && (
                  <div className="flex items-center text-green-400 bg-green-900/20 border border-green-800 rounded-xl px-4 py-3">
                    <Check className="w-5 h-5 mr-2" />
                    配置验证成功，正在跳转...
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : null}
                  添加并验证
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">简易邮箱客户端</h1>
          <p className="text-gray-400">配置您的邮箱账户以开始使用</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                选择邮箱服务商
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className={`grid grid-cols-4 gap-3 p-3 rounded-xl transition-colors ${
                validationErrors.provider ? 'bg-red-900/20 border border-red-800' : ''
              }`}>
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      setUseCustomConfig(false);
                    }}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedProvider === provider.id
                        ? 'border-blue-500 bg-blue-600/20'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-2xl mb-1">{provider.icon}</span>
                    <span className="text-xs font-medium text-gray-300">{provider.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider('custom');
                    setUseCustomConfig(true);
                  }}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedProvider === 'custom'
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <SettingsIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-medium text-gray-300">自定义</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                邮箱地址
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: false }));
                }}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none transition-colors ${
                  validationErrors.email
                    ? 'bg-red-900/20 border border-red-800 focus:border-red-500'
                    : 'bg-slate-700/50 border border-slate-600 focus:border-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                授权码
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) setValidationErrors(prev => ({ ...prev, password: false }));
                }}
                placeholder="请输入邮箱授权码"
                className={`w-full px-4 py-3 rounded-xl text-white placeholder-gray-400 focus:outline-none transition-colors ${
                  validationErrors.password
                    ? 'bg-red-900/20 border border-red-800 focus:border-red-500'
                    : 'bg-slate-700/50 border border-slate-600 focus:border-blue-500'
                }`}
              />
              <p className="text-xs text-gray-500 mt-2">
                提示：授权码需在邮箱网页版中获取，不是邮箱登录密码
                {getCurrentProvider()?.authHelpUrl && (
                  <a
                    href={getCurrentProvider()!.authHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 ml-1 underline"
                  >
                    点击查看如何获取授权码
                  </a>
                )}
              </p>
            </div>

            {useCustomConfig && (
              <div className="bg-slate-700/30 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-medium text-gray-300 flex items-center">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  自定义服务器配置
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">IMAP服务器</label>
                    <input
                      type="text"
                      value={customImapHost}
                      onChange={(e) => setCustomImapHost(e.target.value)}
                      placeholder="imap.example.com"
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">IMAP端口</label>
                    <input
                      type="number"
                      value={customImapPort}
                      onChange={(e) => setCustomImapPort(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">SMTP服务器</label>
                    <input
                      type="text"
                      value={customSmtpHost}
                      onChange={(e) => setCustomSmtpHost(e.target.value)}
                      placeholder="smtp.example.com"
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">SMTP端口</label>
                    <input
                      type="number"
                      value={customSmtpPort}
                      onChange={(e) => setCustomSmtpPort(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">网页版地址</label>
                    <input
                      type="url"
                      value={customWebUrl}
                      onChange={(e) => setCustomWebUrl(e.target.value)}
                      placeholder="https://mail.example.com"
                      className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <div className="whitespace-pre-line text-sm">{error}</div>
              </div>
            )}

            {success && (
              <div className="flex items-center text-green-400 bg-green-900/20 border border-green-800 rounded-xl px-4 py-3">
                <Check className="w-5 h-5 mr-2" />
                配置验证成功，正在跳转...
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-xl font-medium transition-colors"
              >
                重置
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : null}
                保存并验证
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}