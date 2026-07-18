import Imap from 'imap';
import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail, Attachment, AddressObject } from 'mailparser';
import { EmailAccount } from './emailConfig';
import iconv from 'iconv-lite';
import libmime from 'libmime';

// ============ 解码工具函数 ============

/**
 * 解码 MIME 编码的头部字段 (例如 =?UTF-8?B?xxx?= 或 =?GBK?Q?xxx?=)
 */
function decodeMimeHeader(value: string): string {
  if (!value) return value;
  if (!/=\?.*?\?=/.test(value)) return value;
  try {
    return libmime.decodeHeader(value);
  } catch {
    return value;
  }
}

/**
 * 解码 Quoted-Printable 编码（保留原始行为，错误时返回原值）
 */
function decodeQuotedPrintable(value: string): string {
  if (!value) return value;
  try {
    return libmime.decodeQuotedPrintable(value);
  } catch {
    return value;
  }
}

/**
 * 智能解码字符串：根据 charset 转换为 UTF-8
 */
function decodeString(str: string, charset?: string): string {
  if (!str) return str;

  // 0. 关键修复：如果字符串已经包含 CJK 中日韩字符，说明 mailparser 已正确解码
  // 此时绝不能用 binary 方式重新编码，否则会丢弃高位字节导致中文被破坏
  if (/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(str)) {
    return str;
  }

  // 1. 优先根据指定 charset 解码
  if (charset && charset.toLowerCase() !== 'utf-8' && charset.toLowerCase() !== 'utf8') {
    try {
      const lowerCharset = charset.toLowerCase();
      if (iconv.encodingExists(lowerCharset)) {
        const buf = Buffer.from(str, 'binary');
        const decoded = iconv.decode(buf, lowerCharset);
        // 解码后如果出现了 CJK 字符，说明转换成功
        if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(decoded)) {
          return decoded;
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. 尝试 UTF-8 解码
  try {
    const buf = Buffer.from(str, 'binary');
    const utf8 = buf.toString('utf8');
    if (!/[\uFFFD]/.test(utf8)) {
      return utf8;
    }

    // 3. 尝试常见中文编码
    const encodings = ['gbk', 'gb2312', 'gb18030', 'big5', 'shift_jis', 'euc-jp', 'euc-kr'];
    for (const enc of encodings) {
      try {
        const decoded = iconv.decode(buf, enc);
        if (!/[\uFFFD]/.test(decoded)) {
          return decoded;
        }
      } catch {
        continue;
      }
    }

    return utf8;
  } catch {
    return str;
  }
}

/**
 * 确保字符串是 UTF-8 编码
 */
function ensureUtf8(str: string, charset?: string): string {
  if (!str) return str;
  // 先尝试按指定 charset 解码
  if (charset) {
    return decodeString(str, charset);
  }
  return decodeString(str);
}

/**
 * 修复 HTML 中的 charset 声明
 */
function fixHtmlCharset(html: string): string {
  if (!html) return html;
  html = html.replace(
    /<meta[^>]+charset\s*=\s*["']?[^"'\s>]+["']?[^>]*>/gi,
    '<meta charset="UTF-8">'
  );
  html = html.replace(
    /<meta\s+http-equiv\s*=\s*["']?content-type["']?[^>]+charset\s*=\s*[^"';\s>]+[^>]*>/gi,
    '<meta charset="UTF-8">'
  );
  if (!html.toLowerCase().includes('charset="utf-8"') && html.toLowerCase().includes('<head>')) {
    html = html.replace(/<head[^>]*>/i, '$&\n<meta charset="UTF-8">');
  }
  if (!html.toLowerCase().includes('<head>') && !html.toLowerCase().includes('<meta charset="utf-8"')) {
    html = '<meta charset="UTF-8">' + html;
  }
  return html;
}

// ============ 类型定义 ============

export interface EmailMessage {
  id: string;
  uid: number;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  subject: string;
  body: string;
  htmlBody: string;
  attachments: EmailAttachment[];
  date: Date;
  read: boolean;
  accountEmail: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  content: string;
  emailId: string;
  contentId?: string;
}

// ============ 邮件解析辅助函数 ============

/**
 * 解码地址对象数组
 */
function decodeAddresses(addr: AddressObject | AddressObject[] | undefined): { name: string; address: string }[] {
  if (!addr) return [];
  const list = Array.isArray(addr) ? addr : [addr];
  const result: { name: string; address: string }[] = [];
  for (const obj of list) {
    if (obj.value && Array.isArray(obj.value)) {
      for (const item of obj.value) {
        result.push({
          name: decodeMimeHeader(item.name || ''),
          address: item.address || ''
        });
      }
    }
  }
  return result;
}

/**
 * 智能解码文本/HTML 字段，根据 charset 提示选择编码
 */
function decodeTextContent(content: string, charset?: string): string {
  if (!content) return '';
  // 先尝试 UTF-8
  let decoded = ensureUtf8(content, charset);
  // 如果包含 =XX 形式但 libmime 已经处理过，跳过 QP 解码
  // 处理残留的 QP 编码（如 =E4=B8=AD=E6=96=87）
  if (/=[0-9A-Fa-f]{2}/.test(decoded)) {
    try {
      decoded = libmime.decodeQuotedPrintable(decoded);
    } catch {
      // ignore
    }
  }
  return decoded;
}

/**
 * 解析单个邮件
 */
function parseEmail(parsed: ParsedMail, account: EmailAccount, seqno: number): EmailMessage {
  // 使用账户邮箱+seqno生成全局唯一ID，避免跨账户ID冲突导致React key重复
  // 使用::作为分隔符，避免邮箱中的-字符造成解析困难
  const emailId = `${account.email}::${seqno}`;

  // 解析附件
  const emailAttachments: EmailAttachment[] = (parsed.attachments || []).map((att, index) => {
    const contentBuffer = att.content as Buffer;
    let filename = att.filename || `attachment-${index}`;
    // 解码文件名（先 MIME 头，再 charset）
    if (filename) {
      filename = decodeMimeHeader(filename);
      if (att.charset && att.charset.toLowerCase() !== 'utf-8') {
        try {
          filename = ensureUtf8(filename, att.charset);
        } catch {
          // ignore
        }
      }
      // 处理 QP 编码残留
      if (/=[0-9A-Fa-f]{2}/.test(filename)) {
        try { filename = libmime.decodeQuotedPrintable(filename); } catch { /* ignore */ }
      }
    }
    return {
      id: `${emailId}-att-${index}`,
      filename: filename || `attachment-${index}`,
      contentType: att.contentType || 'application/octet-stream',
      size: att.size || contentBuffer?.length || 0,
      content: contentBuffer ? contentBuffer.toString('base64') : '',
      emailId: emailId,
      contentId: att.contentId || undefined
    };
  });

  // 解析 HTML 正文
  let htmlBody = '';
  if (parsed.html) {
    htmlBody = decodeTextContent(parsed.html, parsed.htmlCharSet);
    htmlBody = fixHtmlCharset(htmlBody);
  }

  // 解析纯文本正文
  let textBody = '';
  if (parsed.text) {
    textBody = decodeTextContent(parsed.text, parsed.textCharSet);
  }

  // 解析主题
  const subject = decodeMimeHeader(parsed.subject || '');

  // 解析发件人
  let fromName = '';
  let fromAddress = '';
  if (parsed.from?.value?.[0]) {
    fromName = decodeMimeHeader(parsed.from.value[0].name || '');
    fromAddress = parsed.from.value[0].address || '';
  }

  // 解析收件人
  const toRecipients = decodeAddresses(parsed.to);

  return {
    id: emailId,
    uid: seqno,
    from: { name: fromName, address: fromAddress },
    to: toRecipients,
    subject,
    body: textBody,
    htmlBody,
    attachments: emailAttachments,
    date: parsed.date || new Date(),
    read: false,
    accountEmail: account.email
  };
}

// ============ IMAP 连接 ============

export async function connectImap(account: EmailAccount): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: account.email,
      password: account.password,
      host: account.imapHost,
      port: account.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false, servername: account.imapHost },
      connTimeout: 30000,
      authTimeout: 30000,
      keepalive: { interval: 30000, idleInterval: 60000, forceNoop: true }
    });

    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { imap.destroy(); } catch { /* ignore */ }
        reject(new Error('IMAP连接超时'));
      }
    }, 40000);

    imap.once('ready', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      resolve(imap);
    });

    imap.once('error', (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      reject(err);
    });

    imap.connect();
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]);
}

async function readMessageBody(msg: Imap.ImapMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let chunks: Buffer[] = [];
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    msg.on('body', (stream) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      stream.on('end', () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        resolve(Buffer.concat(chunks));
      });
      stream.on('error', (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        reject(err);
      });
    });

    msg.on('error', (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      reject(err);
    });

    timeoutHandle = setTimeout(() => {
      reject(new Error('读取邮件正文超时'));
    }, 30000);
  });
}

// ============ 邮件获取 ============

/**
 * 为 IMAP 连接发送 ID 命令（139邮箱必需）
 */
function sendImapId(imap: Imap, account: EmailAccount): Promise<void> {
  return new Promise((resolve) => {
    try {
      // 检查服务器是否支持 ID 命令
      if (!(imap as any).serverSupports || !(imap as any).serverSupports('ID')) {
        resolve();
        return;
      }
      const params: any = {
        name: 'EmailClient',
        version: '1.0.0',
        vendor: 'ZhaoYouze',
        contact: account.email
      };
      (imap as any).id(params, (err: Error | null) => {
        // ID 命令失败不应中断后续流程
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

export async function fetchEmails(account: EmailAccount, limit: number = 50): Promise<EmailMessage[]> {
  const imap = await connectImap(account);

  // 139 邮箱需要 ID 命令
  if (account.imapHost.includes('139.com')) {
    await sendImapId(imap, account);
  }

  return withTimeout(new Promise<EmailMessage[]>((resolve, reject) => {
    const messages: EmailMessage[] = [];
    let settled = false;

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      imap.removeAllListeners();
      try { imap.destroy(); } catch { /* ignore */ }
      if (err) reject(err);
      else resolve(messages);
    };

    imap.openBox('INBOX', false, async (err) => {
      if (err) {
        return finish(err);
      }

      try {
        // 尝试多种搜索方式（兼容不同 IMAP 实现）
        let searchResult: number[] = [];
        const searchStrategies: any[][] = [['ALL'], ['UID SEARCH ALL']];
        for (const strategy of searchStrategies) {
          try {
            searchResult = await new Promise<any[]>((res, rej) => {
              imap.search(strategy, (searchErr, results) => {
                if (searchErr) rej(searchErr);
                else res(results || []);
              });
            });
            if (searchResult.length > 0) break;
          } catch {
            // 继续尝试下一个
            continue;
          }
        }

        if (searchResult.length === 0) {
          return finish();
        }

        const uids = searchResult.slice(-limit);

        if (uids.length === 0) {
          return finish();
        }

        const f = imap.fetch(uids, {
          bodies: [''],
          struct: true,
          markSeen: false
        });

        let processedCount = 0;
        const totalCount = uids.length;
        let endCalled = false;

        const tryFinish = () => {
          if (processedCount >= totalCount || endCalled) {
            finish();
          }
        };

        f.on('message', (msg, seqno) => {
          (async () => {
            const emailId = `${account.email}::${seqno}`;
            try {
              const rawBuffer = await readMessageBody(msg);
              if (!rawBuffer || rawBuffer.length === 0) {
                // 139 邮箱偶尔会返回 0 字节邮件
                messages.push({
                  id: emailId,
                  uid: seqno,
                  from: { name: '', address: '' },
                  to: [],
                  subject: '(空邮件)',
                  body: '',
                  htmlBody: '',
                  attachments: [],
                  date: new Date(),
                  read: false,
                  accountEmail: account.email
                });
              } else {
                const parsed = await simpleParser(rawBuffer, {
                  skipHtmlToText: true,
                  skipTextToHtml: true,
                  maxHtmlLengthToParse: 5 * 1024 * 1024
                });
                const email = parseEmail(parsed, account, seqno);
                messages.push(email);
              }
            } catch (e) {
              messages.push({
                id: emailId,
                uid: seqno,
                from: { name: '', address: '' },
                to: [],
                subject: '(解析失败)',
                body: '',
                htmlBody: '',
                attachments: [],
                date: new Date(),
                read: false,
                accountEmail: account.email
              });
            }
            processedCount++;
            tryFinish();
          })();
        });

        f.on('error', (fetchErr) => {
          finish(fetchErr);
        });

        f.on('end', () => {
          endCalled = true;
          // 兜底：如果所有消息都已处理，或在 2 秒内无新消息到达则强制结束
          if (processedCount >= totalCount) {
            finish();
          } else {
            setTimeout(() => {
              if (!settled) {
                finish();
              }
            }, 3000);
          }
        });
      } catch (e) {
        finish(e instanceof Error ? e : new Error('搜索邮件失败'));
      }
    });
  }), 120000, '获取邮件超时');
}

// ============ 账户验证 ============

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export async function validateAccount(account: EmailAccount): Promise<ValidationResult> {
  return new Promise((resolve) => {
    if (!account.email || !account.password) {
      resolve({ valid: false, error: '邮箱地址或授权码不能为空' });
      return;
    }
    if (!account.imapHost || !account.imapPort) {
      resolve({ valid: false, error: 'IMAP服务器配置缺失' });
      return;
    }

    const imap = new Imap({
      user: account.email,
      password: account.password,
      host: account.imapHost,
      port: account.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false, servername: account.imapHost },
      connTimeout: 30000,
      authTimeout: 30000
    });

    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: ValidationResult) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      imap.removeAllListeners();
      try { imap.end(); } catch { /* ignore */ }
      try { imap.destroy(); } catch { /* ignore */ }
      resolve(result);
    };

    timeoutHandle = setTimeout(() => {
      finish({ valid: false, error: '连接超时，请检查网络或邮箱服务器地址' });
    }, 40000);

    imap.once('ready', () => {
      finish({ valid: true });
    });

    imap.once('error', (err: Error) => {
      const errMsg = err.message || '';
      let friendlyError = '验证失败';
      const lowerErr = errMsg.toLowerCase();
      if (errMsg.includes('Login fail') || errMsg.includes('登录失败') ||
          lowerErr.includes('authenticate') || lowerErr.includes('invalid credentials') ||
          lowerErr.includes('auth failed') || lowerErr.includes('password') ||
          errMsg.includes('service is not open') || errMsg.includes('IMAP service') ||
          errMsg.includes('service is not enabled')) {
        friendlyError = '授权码错误或IMAP服务未开启。请：\n1. 确认授权码填写正确（不是邮箱登录密码）\n2. 登录邮箱网页版，在设置中开启IMAP/SMTP服务\n3. 点击下方"如何获取授权码"链接查看教程';
      } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
        friendlyError = `无法解析服务器地址：${account.imapHost}，请检查IMAP服务器配置`;
      } else if (errMsg.includes('ECONNREFUSED')) {
        friendlyError = `连接被拒绝，请检查IMAP端口(${account.imapPort})是否正确`;
      } else if (errMsg.includes('ECONNRESET') || errMsg.includes('socket')) {
        friendlyError = '网络连接被重置，可能是SSL/TLS配置问题或防火墙拦截';
      } else if (errMsg.includes('timeout')) {
        friendlyError = '连接超时，请检查网络连接';
      } else if (errMsg.includes('certificate') || errMsg.includes('SSL')) {
        friendlyError = 'SSL证书验证失败：' + errMsg;
      } else if (errMsg.includes('frequency') || errMsg.includes('limited') || errMsg.includes('busy')) {
        friendlyError = '登录频率受限或系统繁忙，请稍后再试';
      } else {
        friendlyError = '验证失败：' + errMsg;
      }
      finish({ valid: false, error: friendlyError });
    });

    imap.connect();
  });
}

// ============ 发送邮件 ============

export async function sendEmail(
  account: EmailAccount,
  to: string[],
  subject: string,
  body: string,
  htmlBody: string,
  attachments?: { filename: string; content: string; contentType: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: true,
      auth: {
        user: account.email,
        pass: account.password
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
      authTimeout: 15000,
      socketTimeout: 30000
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: account.email,
      to: to.join(','),
      subject: ensureUtf8(subject),
      text: ensureUtf8(body),
      html: ensureUtf8(htmlBody || body)
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att) => ({
        filename: ensureUtf8(att.filename),
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType
      }));
    }

    await withTimeout(transporter.sendMail(mailOptions), 60000, '发送邮件超时');
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '发送失败';
    return { success: false, error: errMsg };
  }
}

// ============ 下载附件 ============

export async function downloadAttachment(
  account: EmailAccount,
  emailId: string,
  attachmentIndex: number
): Promise<EmailAttachment | null> {
  const imap = await connectImap(account);

  // 从 emailId 格式 "email::seqno" 中提取 seqno
  const seqnoMatch = emailId.match(/::(\d+)$/);
  const imapSeqno = seqnoMatch ? seqnoMatch[1] : emailId;

  return withTimeout(new Promise<EmailAttachment | null>((resolve, reject) => {
    let settled = false;
    let attachments: Attachment[] = [];

    const cleanup = (error?: Error) => {
      if (settled) return;
      settled = true;
      imap.removeAllListeners();
      try { imap.destroy(); } catch { /* ignore */ }
      if (error) reject(error);
    };

    imap.openBox('INBOX', false, (err) => {
      if (err) { cleanup(err); return; }

      const f = imap.fetch(imapSeqno, {
        bodies: '',
        struct: true
      });

      f.on('message', (msg) => {
        msg.on('body', (stream) => {
          let chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              const parsed = await simpleParser(buffer, {
                skipHtmlToText: true,
                skipTextToHtml: true
              });
              attachments = parsed.attachments || [];

              if (attachmentIndex >= attachments.length) {
                cleanup();
                resolve(null);
                return;
              }

              const att = attachments[attachmentIndex];
              const contentBuffer = att.content as Buffer;
              let filename = att.filename || `attachment-${attachmentIndex}`;
              if (filename) {
                filename = decodeMimeHeader(filename);
                if (att.charset && att.charset.toLowerCase() !== 'utf-8') {
                  try { filename = ensureUtf8(filename, att.charset); } catch { /* ignore */ }
                }
                if (/=[0-9A-Fa-f]{2}/.test(filename)) {
                  try { filename = libmime.decodeQuotedPrintable(filename); } catch { /* ignore */ }
                }
              }
              cleanup();
              resolve({
                id: `${emailId}-${attachmentIndex}`,
                filename: filename || `attachment-${attachmentIndex}`,
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || 0,
                content: contentBuffer ? contentBuffer.toString('base64') : '',
                emailId,
                contentId: att.contentId || undefined
              });
            } catch (e) {
              cleanup(e instanceof Error ? e : new Error('解析附件失败'));
            }
          });
          stream.on('error', (err) => cleanup(err));
        });
        msg.on('error', (err) => cleanup(err));
      });

      f.on('error', (fetchErr) => cleanup(fetchErr));

      f.on('end', () => {
        // body 事件可能没有触发，强制结束
        if (!settled) {
          setTimeout(() => {
            if (!settled) {
              cleanup(new Error('下载附件超时'));
            }
          }, 5000);
        }
      });
    });
  }), 60000, '下载附件超时');
}
