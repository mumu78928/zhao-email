import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Download, DownloadCloud, Loader2, Search, Paperclip, Clock, User, ChevronLeft, AlertCircle, CheckSquare, Square, MailCheck, FileArchive } from 'lucide-react';
import JSZip from 'jszip';
import { useEmailStore, EmailMessage, EmailAttachment, EmailConfig } from '../store/emailStore';
import { fetchEmails, fetchEmailsFromAllAccounts } from '../api/emailApi';
import Sidebar from '../components/Sidebar';

function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function sanitizeHtml(html: string): string {
  try {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(s => s.remove());
    const iframes = temp.querySelectorAll('iframe');
    iframes.forEach(f => f.remove());
    const dangerous = temp.querySelectorAll('[onclick],[onerror],[onload],[onmouseover]');
    dangerous.forEach(el => {
      el.removeAttribute('onclick');
      el.removeAttribute('onerror');
      el.removeAttribute('onload');
      el.removeAttribute('onmouseover');
    });
    return temp.innerHTML;
  } catch {
    return html;
  }
}

function buildEmailHtml(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #d1d5db;
  background: transparent;
  margin: 0;
  padding: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
a { color: #60a5fa; text-decoration: underline; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; max-width: 100%; }
td, th { border: 1px solid #475569; padding: 8px; }
th { background: #334155; }
pre { white-space: pre-wrap; word-wrap: break-word; }
blockquote { border-left: 3px solid #475569; margin: 0; padding-left: 12px; color: #9ca3af; }
</style>
</head>
<body>
${html || '<p>（HTML 内容为空）</p>'}
</body>
</html>`;
}

function EmailIframe({ html, emailId }: { html: string; emailId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(500);
  const [blobUrl, setBlobUrl] = useState('');
  const [loadError, setLoadError] = useState(false);

  const fullHtml = useMemo(() => buildEmailHtml(html), [html]);

  // 使用 Blob URL 代替 srcDoc，提升 Edge 等浏览器兼容性
  useEffect(() => {
    setLoadError(false);
    try {
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch {
      setLoadError(true);
    }
  }, [fullHtml]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !blobUrl) return;
    let isMounted = true;

    const updateHeight = () => {
      if (!isMounted) return;
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const body = doc.body;
        const docEl = doc.documentElement;
        if (!body || !docEl) return;
        const h = Math.max(body.scrollHeight, body.offsetHeight, docEl.clientHeight, docEl.scrollHeight, docEl.offsetHeight);
        if (h > 100) setHeight(h + 20);
      } catch {
        // 跨域或其它问题，忽略
      }
    };

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const onLoad = () => {
      if (!isMounted) return;
      setLoadError(false);
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      const imgs = doc.querySelectorAll('img');
      if (imgs.length === 0) {
        timeoutHandle = setTimeout(updateHeight, 100);
      } else {
        let loadedImgs = 0;
        imgs.forEach(img => {
          const onImgLoad = () => {
            if (!isMounted) return;
            loadedImgs++;
            if (loadedImgs >= imgs.length) updateHeight();
          };
          img.addEventListener('load', onImgLoad);
          img.addEventListener('error', onImgLoad);
        });
        timeoutHandle = setTimeout(updateHeight, 3000);
      }
    };

    const onError = () => {
      if (!isMounted) return;
      setLoadError(true);
    };

    iframe.addEventListener('load', onLoad);
    iframe.addEventListener('error', onError);
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      onLoad();
    }

    return () => {
      isMounted = false;
      iframe.removeEventListener('load', onLoad);
      iframe.removeEventListener('error', onError);
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [blobUrl, emailId]);

  if (loadError) {
    return (
      <div className="p-4 text-center text-slate-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
        <p className="text-sm">邮件内容加载失败，尝试以下替代方式：</p>
        <pre className="mt-2 text-left text-xs text-slate-500 bg-slate-800 p-3 rounded overflow-auto max-h-96">{html.substring(0, 2000)}</pre>
      </div>
    );
  }

  return <iframe ref={iframeRef} src={blobUrl} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="w-full border-0 bg-transparent" style={{ height: `${height}px`, minHeight: '200px' }} title="邮件内容" />;
}

export default function Inbox() {
  const navigate = useNavigate();
  const { configs, setEmails, emails, setSelectedEmail, selectedEmail } = useEmailStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState<string>('all');

  const [selectMode, setSelectMode] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);

  const requestIdRef = useRef<number>(0);
  const initialLoadedRef = useRef<boolean>(false);
  const prevConfigsIdsRef = useRef<string>('');

  useEffect(() => {
    if (configs.length === 0) {
      navigate('/');
    }
  }, [configs.length, navigate]);

  const loadEmails = async () => {
    if (configs.length === 0) return;
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      let emailList: EmailMessage[] = [];
      if (currentTab === 'all') {
        emailList = await fetchEmailsFromAllAccounts(configs);
      } else {
        const config = configs.find(c => c.id === currentTab);
        if (config) emailList = await fetchEmails(config);
      }
      if (currentRequestId === requestIdRef.current) {
        setEmails(emailList);
        setInitialized(true);
      }
    } catch (e) {
      if (currentRequestId === requestIdRef.current) {
        setError('获取邮件失败，请检查网络连接');
        setInitialized(true);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (configs.length === 0) return;
    const currentIds = configs.map(c => c.id).join(',');
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      prevConfigsIdsRef.current = currentIds;
      loadEmails();
    } else if (prevConfigsIdsRef.current !== currentIds) {
      prevConfigsIdsRef.current = currentIds;
      if (currentTab !== 'all') {
        const exists = configs.some(c => c.id === currentTab);
        if (!exists) {
          setCurrentTab('all');
          return;
        }
      }
      loadEmails();
    } else {
      loadEmails();
    }
  }, [configs, currentTab]);

  const filteredEmails = useMemo(() => {
    return emails.filter(email =>
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (email.accountEmail && email.accountEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [emails, searchTerm]);

  const handleEmailClick = (email: EmailMessage) => {
    if (selectMode) toggleEmailSelection(email.id);
    else { setSelectedEmail(email); setSelectedAttachments(new Set()); }
  };

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(emailId)) newSelected.delete(emailId);
      else newSelected.add(emailId);
      return newSelected;
    });
  };

  const selectAllEmails = () => setSelectedEmails(new Set(filteredEmails.map(e => e.id)));
  const deselectAllEmails = () => setSelectedEmails(new Set());
  const toggleSelectMode = () => { setSelectMode(prev => !prev); setSelectedEmails(new Set()); };

  const toggleAttachmentSelection = (attachmentId: string) => {
    setSelectedAttachments(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(attachmentId)) newSelected.delete(attachmentId);
      else newSelected.add(attachmentId);
      return newSelected;
    });
  };

  const selectAllAttachments = () => {
    if (!selectedEmail) return;
    setSelectedAttachments(new Set((selectedEmail.attachments || []).map(a => a.id)));
  };

  const deselectAllAttachments = () => setSelectedAttachments(new Set());

  const downloadSingleAttachment = (attachment: EmailAttachment) => {
    if (!attachment.content) { setError('附件内容为空，无法下载'); return; }
    try { const blob = base64ToBlob(attachment.content, attachment.contentType); downloadBlob(blob, attachment.filename); }
    catch { setError('下载附件失败'); }
  };

  const downloadSelectedAttachments = () => {
    if (!selectedEmail || selectedAttachments.size === 0) return;
    setDownloading(true);
    const selected = selectedEmail.attachments.filter(a => selectedAttachments.has(a.id));
    let index = 0;
    const downloadNext = () => {
      if (index >= selected.length) { setDownloading(false); setSelectedAttachments(new Set()); return; }
      downloadSingleAttachment(selected[index]);
      index++;
      setTimeout(downloadNext, 300);
    };
    downloadNext();
  };

  const getSelectedAttachmentsCount = (): number => {
    let count = 0;
    for (const email of emails) if (selectedEmails.has(email.id)) count += email.attachments?.length || 0;
    return count;
  };

  const bulkDownloadAttachments = async () => {
    if (selectedEmails.size === 0) return;
    setBulkDownloading(true);
    const selectedEmailList = emails.filter(e => selectedEmails.has(e.id));
    let totalAttachments = 0;
    const allAttachments: { attachment: EmailAttachment; email: EmailMessage }[] = [];
    for (const email of selectedEmailList) {
      const atts = email.attachments || [];
      for (const att of atts) { allAttachments.push({ attachment: att, email }); totalAttachments++; }
    }
    setBulkProgress({ current: 0, total: totalAttachments });

    if (totalAttachments === 0) {
      setBulkDownloading(false);
      return;
    }

    try {
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (let i = 0; i < allAttachments.length; i++) {
        const { attachment, email } = allAttachments[i];
        if (attachment.content) {
          try {
            const binaryString = atob(attachment.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) bytes[j] = binaryString.charCodeAt(j);
            const safeSubject = (email.subject || '未命名邮件').replace(/[\\/:*?"<>|]/g, '_').substring(0, 30).trim() || '未命名邮件';
            let fileName = attachment.filename || `附件_${i + 1}`;
            let fullPath = `${safeSubject}/${fileName}`;
            let counter = 1;
            while (usedNames.has(fullPath)) {
              const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
              const base = ext ? fileName.slice(0, -ext.length) : fileName;
              fullPath = `${safeSubject}/${base}_${counter}${ext}`;
              counter++;
            }
            usedNames.add(fullPath);
            zip.file(fullPath, bytes);
          } catch {}
        }
        setBulkProgress({ current: i + 1, total: totalAttachments });
        await new Promise(r => setTimeout(r, 30));
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const zipName = `邮件附件批量下载_${timestamp}.zip`;
      downloadBlob(blob, zipName);
    } catch (err) {
      setError('打包下载失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setBulkDownloading(false);
      setSelectMode(false);
      setSelectedEmails(new Set());
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasConfigs = configs.length > 0;

  return (
    <div className="flex h-screen bg-slate-900">
      {hasConfigs ? (
        <>
          <Sidebar onRefresh={loadEmails} />
          
          <main className="flex-1 flex overflow-hidden">
            <div className={`${selectedEmail ? 'w-1/2' : 'w-full'} flex flex-col border-r border-slate-700`}>
              <div className="p-4 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Mail className="w-6 h-6 text-blue-500" />
                    收件箱
                    <span className="text-sm font-normal text-gray-400">({filteredEmails.length}封)</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    {selectMode ? (
                      <>
                        <button onClick={deselectAllEmails} className="text-sm text-gray-400 hover:text-white px-3 py-2">取消全选</button>
                        <button onClick={selectAllEmails} className="text-sm text-blue-500 hover:text-blue-400 px-3 py-2">全选</button>
                        <button onClick={bulkDownloadAttachments} disabled={bulkDownloading || selectedEmails.size === 0 || getSelectedAttachmentsCount() === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white rounded-lg text-sm font-medium transition-colors">
                          {bulkDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                          {bulkDownloading ? `打包中 ${bulkProgress.current}/${bulkProgress.total}` : `打包下载(${getSelectedAttachmentsCount()})`}
                        </button>
                        <button onClick={toggleSelectMode} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors">退出多选</button>
                      </>
                    ) : (
                      <>
                        <button onClick={toggleSelectMode} className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors">
                          <CheckSquare className="w-4 h-4" />
                          多选下载
                        </button>
                        <button onClick={loadEmails} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-4 h-4" />}
                          刷新
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {configs.length > 1 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <button onClick={() => setCurrentTab('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentTab === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'}`}>
                      全部账户 ({configs.length})
                    </button>
                    {configs.map((cfg) => (
                      <button key={cfg.id} onClick={() => setCurrentTab(cfg.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentTab === cfg.id ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'}`}>
                        {cfg.email}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="搜索邮件..." className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              {error && (
                <div className="m-4 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-center text-red-400">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {error}
                </div>
              )}

              {selectMode && selectedEmails.size > 0 && (
                <div className="px-4 py-2 bg-blue-900/30 border-b border-blue-800 text-blue-300 text-sm">
                  已选择 {selectedEmails.size} 封邮件，共 {getSelectedAttachmentsCount()} 个附件
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {loading || !initialized ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Mail className="w-16 h-16 mb-4 opacity-50" />
                    <p>暂无邮件</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-700">
                    {filteredEmails.map((email) => (
                      <li key={email.id} onClick={() => handleEmailClick(email)} className={`p-4 cursor-pointer transition-all duration-200 hover:bg-slate-800/50 ${selectedEmail?.id === email.id ? 'bg-blue-600/10 border-l-4 border-blue-500' : ''} ${selectMode && selectedEmails.has(email.id) ? 'bg-blue-600/20 border-l-4 border-blue-400' : ''}`}>
                        <div className="flex items-start gap-3">
                          {selectMode && (
                            <div className="flex-shrink-0 mt-1">
                              {selectedEmails.has(email.id) ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-gray-500" />}
                            </div>
                          )}
                          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white truncate">{email.from?.name || email.from?.address || '未知发件人'}</span>
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatDate(email.date.toString())}</span>
                            </div>
                            <p className="text-sm text-gray-300 truncate mb-1">{email.subject || '(无主题)'}</p>
                            <p className="text-xs text-gray-500 truncate">{(email.body || email.htmlBody) ? ((email.body || '').substring(0, 100) + '...') : '无内容'}</p>
                            {(email.attachments?.length || 0) > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <Paperclip className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">{email.attachments.length}个附件</span>
                              </div>
                            )}
                            {email.accountEmail && configs.length > 1 && (
                              <div className="flex items-center gap-1 mt-1">
                                <MailCheck className="w-3 h-3 text-blue-400" />
                                <span className="text-xs text-blue-400">{email.accountEmail}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {selectedEmail && (
              <div className="w-1/2 flex flex-col bg-slate-800">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                  <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                    返回列表
                  </button>
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(selectedEmail.date).toLocaleString('zh-CN')}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <h1 className="text-xl font-bold text-white mb-4">{selectedEmail.subject}</h1>
                  
                  <div className="flex items-center gap-4 mb-6 p-4 bg-slate-700/50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{selectedEmail.from?.name || selectedEmail.from?.address || '未知发件人'}</p>
                      <p className="text-sm text-gray-400">{selectedEmail.from?.address || ''}</p>
                    </div>
                  </div>

                  {selectedEmail.to && selectedEmail.to.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-500 mb-2">收件人</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.to.map((recipient, index) => (
                          <span key={`to-${index}-${recipient?.address || recipient?.name || 'unknown'}`} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-gray-300">
                            {recipient?.name || recipient?.address || '未知'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="prose prose-invert max-w-none">
                    {selectedEmail.htmlBody ? (
                      <EmailIframe html={sanitizeHtml(selectedEmail.htmlBody)} emailId={selectedEmail.id} />
                    ) : (
                      <pre className="whitespace-pre-wrap text-gray-300 font-sans">{selectedEmail.body || '（无内容）'}</pre>
                    )}
                  </div>

                  {(selectedEmail.attachments?.length || 0) > 0 && (
                    <div className="mt-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                          <Paperclip className="w-5 h-5 text-blue-500" />
                          附件 ({selectedEmail.attachments.length})
                        </h3>
                        <div className="flex items-center gap-2">
                          {selectedAttachments.size > 0 && (
                            <>
                              <button onClick={deselectAllAttachments} className="text-sm text-gray-400 hover:text-white">取消选择</button>
                              <button onClick={downloadSelectedAttachments} disabled={downloading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                                批量下载 ({selectedAttachments.size})
                              </button>
                            </>
                          )}
                          {selectedAttachments.size === 0 && (
                            <button onClick={selectAllAttachments} className="text-sm text-blue-500 hover:text-blue-400">全选</button>
                          )}
                        </div>
                      </div>
                      
                      <ul className="space-y-2">
                        {selectedEmail.attachments.map((attachment) => (
                          <li key={attachment.id} className={`flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border transition-all ${selectedAttachments.has(attachment.id) ? 'border-blue-500 bg-blue-600/10' : 'border-transparent hover:border-slate-600'}`}>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={selectedAttachments.has(attachment.id)} onChange={() => toggleAttachmentSelection(attachment.id)} className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500" />
                              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                                <Paperclip className="w-5 h-5 text-gray-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white text-sm truncate max-w-[180px]">{attachment.filename}</p>
                                <p className="text-sm text-gray-500">{formatSize(attachment.size)}</p>
                              </div>
                            </div>
                            
                            <button onClick={(e) => { e.stopPropagation(); downloadSingleAttachment(attachment); }} className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors">
                              <Download className="w-4 h-4" />
                              下载
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      ) : (
        <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center">
          <div className="text-gray-400">加载中...</div>
        </div>
      )}
    </div>
  );
}
