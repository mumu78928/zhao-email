import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Paperclip, User, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useEmailStore } from '../store/emailStore';
import { sendEmail } from '../api/emailApi';
import Sidebar from '../components/Sidebar';

interface AttachmentFile {
  id: string;
  filename: string;
  content: string;
  contentType: string;
  size: number;
}

export default function Compose() {
  const navigate = useNavigate();
  const { getActiveConfig } = useEmailStore();
  const config = getActiveConfig();

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ to?: boolean; subject?: boolean; body?: boolean }>({});

  // 将导航移到 useEffect 中，避免渲染期间调用 navigate 导致 DOM 不一致
  useEffect(() => {
    if (!config) {
      navigate('/');
    }
  }, [config, navigate]);

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const base64Content = content.split(',')[1] || content;
        
        setAttachments(prev => [...prev, {
          id: `${file.name}-${Date.now()}`,
          filename: file.name,
          content: base64Content,
          contentType: file.type || 'application/octet-stream',
          size: file.size
        }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSent(false);
    setValidationErrors({});

    const errors: { to?: boolean; subject?: boolean; body?: boolean } = {};
    if (!to) errors.to = true;
    if (!subject) errors.subject = true;
    if (!body) errors.body = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const missing = [];
      if (errors.to) missing.push('收件人');
      if (errors.subject) missing.push('主题');
      if (errors.body) missing.push('正文');
      setError('请填写完整信息：' + missing.join('、'));
      setSending(false);
      return;
    }

    const toList = to.split(',').map(t => t.trim()).filter(t => t);

    try {
      const result = await sendEmail(
        config,
        toList,
        subject,
        body,
        '',
        attachments.length > 0 ? attachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        })) : undefined
      );

      if (result.success) {
        setSent(true);
        setTo('');
        setSubject('');
        setBody('');
        setAttachments([]);
      } else {
        setError(result.error || '发送邮件失败，请检查网络连接');
      }
    } catch {
      setError('发送邮件失败，请稍后重试');
    }

    setSending(false);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar onRefresh={() => {}} />
      
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl">
          <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
            <div className="p-4 bg-slate-700 border-b border-slate-600">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" />
                撰写新邮件
              </h2>
            </div>

            {sent && (
              <div className="m-4 p-4 bg-green-900/20 border border-green-800 rounded-xl flex items-center text-green-400">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                邮件发送成功！
              </div>
            )}

            {error && (
              <div className="m-4 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-center text-red-400">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            <form onSubmit={handleSend} className="p-6 space-y-4">
              <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                validationErrors.to ? 'bg-red-900/20 border border-red-800' : 'bg-slate-700/50'
              }`}>
                <User className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    if (validationErrors.to) setValidationErrors(prev => ({ ...prev, to: false }));
                  }}
                  placeholder="收件人（多个邮箱用逗号分隔）"
                  className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                />
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                validationErrors.subject ? 'bg-red-900/20 border border-red-800' : 'bg-slate-700/50'
              }`}>
                <span className="text-gray-400 font-medium">主题</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (validationErrors.subject) setValidationErrors(prev => ({ ...prev, subject: false }));
                  }}
                  placeholder="邮件主题"
                  className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
                />
              </div>

              <div className={`p-3 rounded-xl transition-colors ${
                validationErrors.body ? 'bg-red-900/20 border border-red-800' : 'bg-slate-700/50'
              }`}>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (validationErrors.body) setValidationErrors(prev => ({ ...prev, body: false }));
                  }}
                  placeholder="撰写邮件内容..."
                  rows={12}
                  className="w-full bg-transparent text-white placeholder-gray-400 focus:outline-none resize-none"
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-400">附件</p>
                  <ul className="space-y-2">
                    {attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-white">{attachment.filename}</p>
                            <p className="text-xs text-gray-500">{formatSize(attachment.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl cursor-pointer transition-colors">
                  <Paperclip className="w-5 h-5" />
                  <span className="font-medium">添加附件</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/inbox')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-xl font-medium transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    发送
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}