import { AgentType, type Agent, type AgentConfig, type ValidationResult } from '../types.js';
import { renderTemplate } from './email-templates.js';

export class EmailPublisherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailPublisherError';
  }
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailPublisherConfig extends AgentConfig {
  smtp: SmtpConfig;
  fromAddress: string;
  fromName: string;
}

export interface EmailRecipients {
  type: 'subscriber_list' | 'custom';
  addresses?: string[];
  subscriberListFn?: () => Promise<string[]>;
}

export interface EmailPublisherInput {
  subject: string;
  htmlContent: string;
  recipients: EmailRecipients;
  template: 'newsletter' | 'digest' | 'minimal';
}

export interface EmailPublisherOutput {
  sent: number;
  failed: number;
  bounces: string[];
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export interface Transporter {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<SendMailResult>;
  verify(): Promise<boolean>;
}

export type TransporterFactory = (config: SmtpConfig) => Transporter;

export class EmailPublisherAgent implements Agent<EmailPublisherInput, EmailPublisherOutput> {
  type = AgentType.EMAIL_PUBLISHER;

  private createTransporter: TransporterFactory;

  constructor(createTransporter: TransporterFactory) {
    this.createTransporter = createTransporter;
  }

  async execute(
    input: EmailPublisherInput,
    config?: EmailPublisherConfig
  ): Promise<EmailPublisherOutput> {
    const cfg = config ?? {
      smtp: { host: '', port: 587, secure: false, auth: { user: '', pass: '' } },
      fromAddress: '',
      fromName: ''
    };

    const transporter = this.createTransporter(cfg.smtp);

    let addresses: string[];

    if (input.recipients.type === 'subscriber_list' && input.recipients.subscriberListFn) {
      addresses = await input.recipients.subscriberListFn();
    } else {
      addresses = input.recipients.addresses ?? [];
    }

    const renderedHtml = renderTemplate(input.template, input.htmlContent);

    let sent = 0;
    let failed = 0;
    const bounces: string[] = [];

    for (const address of addresses) {
      const result = await transporter.sendMail({
        from: `"${cfg.fromName}" <${cfg.fromAddress}>`,
        to: address,
        subject: input.subject,
        html: renderedHtml
      });

      sent += result.accepted.length;
      failed += result.rejected.length;
      bounces.push(...result.rejected);
    }

    return { sent, failed, bounces };
  }

  async sendTestEmail(
    toAddress: string,
    config: EmailPublisherConfig
  ): Promise<EmailPublisherOutput> {
    const transporter = this.createTransporter(config.smtp);

    try {
      await transporter.verify();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new EmailPublisherError(`SMTP verification failed: ${message}`);
    }

    const result = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromAddress}>`,
      to: toAddress,
      subject: 'Test Email - SMTP Verification',
      html: renderTemplate('minimal', '<p>This is a test email to verify SMTP configuration.</p>')
    });

    return {
      sent: result.accepted.length,
      failed: result.rejected.length,
      bounces: [...result.rejected]
    };
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];
    if (!config.smtp) errors.push('smtp is required');
    if (!config.fromAddress) errors.push('fromAddress is required');
    if (!config.fromName) errors.push('fromName is required');
    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}
