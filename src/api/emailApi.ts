import { EmailProvider, EmailConfig, EmailMessage, EmailAttachment } from '../store/emailStore';

const BASE_URL = '/api/email';

const DEFAULT_TIMEOUT = 30000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry<T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetcher();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries && isRetryableError(error)) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('请求失败');
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('econnreset') ||
           message.includes('aborted');
  }
  return false;
}

export async function getProviders(): Promise<EmailProvider[]> {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/providers`);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

export async function fetchProviders(): Promise<EmailProvider[]> {
  return getProviders();
}

export async function validateConfig(config: Omit<EmailConfig, 'id'>): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout(`${BASE_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }));
    const data = await response.json();
    if (data.success) {
      return { valid: data.data.valid, error: data.data.error };
    }
    return { valid: false, error: data.error || '验证失败' };
  } catch {
    return { valid: false, error: '网络连接失败，请稍后重试' };
  }
}

export async function fetchEmails(config: EmailConfig, limit: number = 50): Promise<EmailMessage[]> {
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout(`${BASE_URL}/emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, limit })
    }, 120000));
    const data = await response.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

export async function fetchEmailsFromAllAccounts(configs: EmailConfig[], limit: number = 50): Promise<EmailMessage[]> {
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout(`${BASE_URL}/emails/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: configs, limit })
    }, 90000));
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (e) {
    return [];
  }
}

export async function sendEmail(
  config: EmailConfig,
  to: string[],
  subject: string,
  body: string,
  htmlBody: string,
  attachments?: { filename: string; content: string; contentType: string }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout(`${BASE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, to, subject, body, htmlBody, attachments })
    }, 60000));
    const data = await response.json();
    if (data.success) {
      return { success: data.data.sent, error: data.data.error };
    }
    return { success: false, error: data.error || '发送邮件失败' };
  } catch {
    return { success: false, error: '网络连接超时，请稍后重试' };
  }
}

export async function downloadAttachment(
  config: EmailConfig,
  emailId: string,
  attachmentIndex: number
): Promise<EmailAttachment | null> {
  try {
    const response = await fetchWithRetry(() => fetchWithTimeout(`${BASE_URL}/attachment/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, emailId, attachmentIndex })
    }, 60000));
    const data = await response.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}