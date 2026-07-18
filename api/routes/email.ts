import express from 'express';
import { PRESET_PROVIDERS, buildAccountConfig, EmailAccount } from '../services/emailConfig';
import { fetchEmails, validateAccount, sendEmail, downloadAttachment, EmailMessage } from '../services/emailService';

const router = express.Router();

router.get('/providers', (req, res) => {
  res.json({ success: true, data: PRESET_PROVIDERS });
});

router.post('/validate', async (req, res) => {
  try {
    const { email, password, providerId, customConfig } = req.body;
    const account = buildAccountConfig(email, password, providerId, customConfig);
    const result = await validateAccount(account);
    res.json({ success: true, data: { valid: result.valid, error: result.error } });
  } catch (error) {
    res.json({ success: false, error: '验证失败：' + (error as Error).message });
  }
});

router.post('/emails', async (req, res) => {
  try {
    const { email, password, providerId, customConfig, limit = 50 } = req.body;
    const account = buildAccountConfig(email, password, providerId, customConfig);
    const emails = await fetchEmails(account, limit);
    const emailsWithAccount = emails.map(e => ({ ...e, accountEmail: email }));
    res.json({ success: true, data: emailsWithAccount });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '获取邮件失败';
    res.json({ success: false, error: errMsg });
  }
});

router.post('/emails/batch', async (req, res) => {
  try {
    const { accounts, limit = 50 } = req.body;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.json({ success: false, error: '请提供账户列表' });
    }

    // 单账户超时封装：避免某个 hang 住的账户拖累整个 batch
    const fetchWithTimeout = (account: any, ms: number = 60000) => {
      return new Promise<EmailMessage[]>((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve([]);
          }
        }, ms);
        fetchEmails(account, limit)
          .then((emails) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(emails);
            }
          })
          .catch(() => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve([]);
            }
          });
      });
    };

    // 并行获取所有账户的邮件（任一账户失败不影响其他账户）
    const tasks = accounts.map(async (acc) => {
      try {
        const { email, password, providerId, customConfig } = acc;
        const account = buildAccountConfig(email, password, providerId, customConfig);
        const emails = await fetchWithTimeout(account, 60000);
        return emails.map(e => ({ ...e, accountEmail: email }));
      } catch {
        return [];
      }
    });

    const results = await Promise.all(tasks);
    const allEmails = results.flat();

    allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ success: true, data: allEmails });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '获取邮件失败';
    res.json({ success: false, error: errMsg });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { email, password, providerId, customConfig, to, subject, body, htmlBody, attachments } = req.body;
    const account = buildAccountConfig(email, password, providerId, customConfig);
    const result = await sendEmail(account, to, subject, body, htmlBody, attachments);
    res.json({ success: result.success, data: { sent: result.success, error: result.error } });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '发送邮件失败';
    res.json({ success: false, error: errMsg });
  }
});

router.post('/attachment/download', async (req, res) => {
  try {
    const { email, password, providerId, customConfig, emailId, attachmentIndex } = req.body;
    const account = buildAccountConfig(email, password, providerId, customConfig);
    const attachment = await downloadAttachment(account, emailId, attachmentIndex);
    res.json({ success: true, data: attachment });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '下载附件失败';
    res.json({ success: false, error: errMsg });
  }
});

export default router;