export interface EmailProvider {
  id: string;
  name: string;
  icon: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  webUrl: string;
  authHelpUrl: string;
}

export const PRESET_PROVIDERS: EmailProvider[] = [
  {
    id: 'qq',
    name: 'QQ邮箱',
    icon: '📧',
    imapHost: 'imap.qq.com',
    imapPort: 993,
    smtpHost: 'smtp.qq.com',
    smtpPort: 465,
    webUrl: 'https://mail.qq.com',
    authHelpUrl: 'https://service.mail.qq.com/detail/0/75'
  },
  {
    id: '163',
    name: '163邮箱',
    icon: '📨',
    imapHost: 'imap.163.com',
    imapPort: 993,
    smtpHost: 'smtp.163.com',
    smtpPort: 465,
    webUrl: 'https://mail.163.com',
    authHelpUrl: 'https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b'
  },
  {
    id: '126',
    name: '126邮箱',
    icon: '📬',
    imapHost: 'imap.126.com',
    imapPort: 993,
    smtpHost: 'smtp.126.com',
    smtpPort: 465,
    webUrl: 'https://mail.126.com',
    authHelpUrl: 'https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b'
  },
  {
    id: 'sina',
    name: '新浪邮箱',
    icon: '💌',
    imapHost: 'imap.sina.com',
    imapPort: 993,
    smtpHost: 'smtp.sina.com',
    smtpPort: 465,
    webUrl: 'https://mail.sina.com.cn',
    authHelpUrl: 'http://help.sina.com.cn/comquestiondetail/view/1566/'
  },
  {
    id: '139',
    name: '139邮箱',
    icon: '📩',
    imapHost: 'imap.139.com',
    imapPort: 993,
    smtpHost: 'smtp.139.com',
    smtpPort: 465,
    webUrl: 'https://mail.139.com',
    authHelpUrl: 'https://help.mail.10086.cn/statichtml/16/Content/1234606.html'
  },
  {
    id: 'yeah',
    name: 'yeah邮箱',
    icon: '📮',
    imapHost: 'imap.yeah.net',
    imapPort: 993,
    smtpHost: 'smtp.yeah.net',
    smtpPort: 465,
    webUrl: 'https://mail.yeah.net',
    authHelpUrl: 'https://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2a5feb28b66796d3b'
  }
];

export interface EmailAccount {
  id: string;
  provider: string;
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  webUrl: string;
}

export function getProviderById(providerId: string): EmailProvider | undefined {
  return PRESET_PROVIDERS.find(p => p.id === providerId);
}

export function buildAccountConfig(
  email: string,
  password: string,
  providerId: string,
  customConfig?: Partial<EmailProvider>
): EmailAccount {
  const preset = getProviderById(providerId);

  return {
    id: `${providerId}-${email}`,
    provider: preset?.name || providerId,
    email,
    password,
    imapHost: customConfig?.imapHost || preset?.imapHost || '',
    imapPort: customConfig?.imapPort || preset?.imapPort || 993,
    smtpHost: customConfig?.smtpHost || preset?.smtpHost || '',
    smtpPort: customConfig?.smtpPort || preset?.smtpPort || 465,
    webUrl: customConfig?.webUrl || preset?.webUrl || ''
  };
}