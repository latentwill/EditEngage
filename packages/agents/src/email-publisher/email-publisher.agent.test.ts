import { describe, it, expect, vi } from 'vitest';
import { EmailPublisherAgent, EmailPublisherError } from './email-publisher.agent.js';
import type { EmailPublisherConfig, TransporterFactory, Transporter } from './email-publisher.agent.js';

function createMockTransporter(overrides: Partial<Transporter> = {}): Transporter {
  return {
    sendMail: vi.fn().mockResolvedValue({ messageId: `msg-${Date.now()}`, accepted: ['test@example.com'], rejected: [] }),
    verify: vi.fn().mockResolvedValue(true),
    ...overrides
  };
}

function createMockTransporterFactory(transporter?: Transporter): TransporterFactory {
  const mock = transporter ?? createMockTransporter();
  return vi.fn().mockReturnValue(mock);
}

const baseConfig: EmailPublisherConfig = {
  smtp: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'noreply@example.com',
      pass: 'smtp-password-123'
    }
  },
  fromAddress: 'newsletter@example.com',
  fromName: 'Example Newsletter'
};

/**
 * @behavior Email Publisher configures Nodemailer with project SMTP settings
 * @business_rule SMTP transport must be created with the exact host, port, auth, and security settings from config
 */
describe('EmailPublisherAgent', () => {
  it('configures Nodemailer with project SMTP settings', async () => {
    const mockTransporter = createMockTransporter();
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    await agent.execute(
      {
        subject: 'Weekly Newsletter',
        htmlContent: '<h1>Hello</h1>',
        recipients: { type: 'custom', addresses: ['user@example.com'] },
        template: 'newsletter'
      },
      baseConfig
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'noreply@example.com',
        pass: 'smtp-password-123'
      }
    });
  });

  /**
   * @behavior Email Publisher sends to subscriber list when recipients = "subscriber_list"
   * @business_rule When recipient type is subscriber_list, the agent must call the subscriberListFn to get addresses and send to each
   */
  it('sends to subscriber list when recipients = "subscriber_list"', async () => {
    const subscriberAddresses = ['sub1@example.com', 'sub2@example.com', 'sub3@example.com'];
    const subscriberListFn = vi.fn().mockResolvedValue(subscriberAddresses);

    const mockTransporter = createMockTransporter({
      sendMail: vi.fn().mockImplementation(({ to }: { to: string }) =>
        Promise.resolve({ messageId: `msg-${to}`, accepted: [to], rejected: [] })
      )
    });
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    const result = await agent.execute(
      {
        subject: 'Monthly Digest',
        htmlContent: '<h1>Digest</h1>',
        recipients: { type: 'subscriber_list', subscriberListFn },
        template: 'digest'
      },
      baseConfig
    );

    expect(subscriberListFn).toHaveBeenCalledTimes(1);
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    expect(result.sent).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.bounces).toEqual([]);
  });

  /**
   * @behavior Email Publisher sends to custom email addresses when recipients = "custom"
   * @business_rule When recipient type is custom, the agent must send to each provided address individually and track results
   */
  it('sends to custom email addresses when recipients = "custom"', async () => {
    const customAddresses = ['alice@example.com', 'bob@example.com'];

    const mockTransporter = createMockTransporter({
      sendMail: vi.fn().mockImplementation(({ to }: { to: string }) =>
        Promise.resolve({ messageId: `msg-${to}`, accepted: [to], rejected: [] })
      )
    });
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    const result = await agent.execute(
      {
        subject: 'Custom Update',
        htmlContent: '<p>Custom content</p>',
        recipients: { type: 'custom', addresses: customAddresses },
        template: 'minimal'
      },
      baseConfig
    );

    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);

    const firstCall = (mockTransporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0] as { to: string; from: string; subject: string };
    expect(firstCall.to).toBe('alice@example.com');
    expect(firstCall.from).toContain('newsletter@example.com');
    expect(firstCall.subject).toBe('Custom Update');

    const secondCall = (mockTransporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[1][0] as { to: string };
    expect(secondCall.to).toBe('bob@example.com');

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  /**
   * @behavior Email Publisher renders email template with content
   * @business_rule Each template (newsletter/digest/minimal) must wrap content in the appropriate HTML structure before sending
   */
  it('renders email template (newsletter/digest/minimal) with content', async () => {
    const mockTransporter = createMockTransporter({
      sendMail: vi.fn().mockImplementation(({ to }: { to: string }) =>
        Promise.resolve({ messageId: `msg-${to}`, accepted: [to], rejected: [] })
      )
    });
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    // Test newsletter template
    await agent.execute(
      {
        subject: 'Newsletter',
        htmlContent: '<p>Newsletter body</p>',
        recipients: { type: 'custom', addresses: ['user@example.com'] },
        template: 'newsletter'
      },
      baseConfig
    );

    const newsletterCall = (mockTransporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0] as { html: string };
    expect(newsletterCall.html).toContain('Newsletter body');
    expect(newsletterCall.html).toContain('newsletter-wrapper');

    // Test digest template
    await agent.execute(
      {
        subject: 'Digest',
        htmlContent: '<p>Digest body</p>',
        recipients: { type: 'custom', addresses: ['user@example.com'] },
        template: 'digest'
      },
      baseConfig
    );

    const digestCall = (mockTransporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[1][0] as { html: string };
    expect(digestCall.html).toContain('Digest body');
    expect(digestCall.html).toContain('digest-wrapper');

    // Test minimal template
    await agent.execute(
      {
        subject: 'Minimal',
        htmlContent: '<p>Minimal body</p>',
        recipients: { type: 'custom', addresses: ['user@example.com'] },
        template: 'minimal'
      },
      baseConfig
    );

    const minimalCall = (mockTransporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[2][0] as { html: string };
    expect(minimalCall.html).toContain('Minimal body');
    expect(minimalCall.html).toContain('minimal-wrapper');
  });

  /**
   * @behavior Email Publisher returns send/fail/bounce counts on completion
   * @business_rule The result must accurately report how many emails succeeded, failed, and which addresses bounced for operational tracking
   */
  it('returns { sent: N, failed: N, bounces: [...] } on completion', async () => {
    let callIndex = 0;
    const mockTransporter = createMockTransporter({
      sendMail: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 2) {
          // Second email bounces
          return Promise.resolve({
            messageId: `msg-${callIndex}`,
            accepted: [],
            rejected: ['bounce@example.com']
          });
        }
        if (callIndex === 4) {
          // Fourth email also bounces
          return Promise.resolve({
            messageId: `msg-${callIndex}`,
            accepted: [],
            rejected: ['bad@example.com']
          });
        }
        // Others succeed
        return Promise.resolve({
          messageId: `msg-${callIndex}`,
          accepted: [`user${callIndex}@example.com`],
          rejected: []
        });
      })
    });
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    const result = await agent.execute(
      {
        subject: 'Broadcast',
        htmlContent: '<p>Content</p>',
        recipients: {
          type: 'custom',
          addresses: [
            'user1@example.com',
            'bounce@example.com',
            'user3@example.com',
            'bad@example.com',
            'user5@example.com'
          ]
        },
        template: 'newsletter'
      },
      baseConfig
    );

    expect(result.sent).toBe(3);
    expect(result.failed).toBe(2);
    expect(result.bounces).toEqual(['bounce@example.com', 'bad@example.com']);
  });

  /**
   * @behavior Test email sends single email to user's address for SMTP verification
   * @business_rule A test send must verify the SMTP connection first, then send exactly one email to confirm deliverability
   */
  it('test email sends single email to user address for SMTP verification', async () => {
    const mockTransporter = createMockTransporter({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({
        messageId: 'test-msg-id',
        accepted: ['admin@example.com'],
        rejected: []
      })
    });
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    const result = await agent.sendTestEmail('admin@example.com', baseConfig);

    // Must verify SMTP connection first
    expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    // Must send exactly one email
    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    const sendCall = (mockTransporter.sendMail as ReturnType<typeof vi.fn>).mock.calls[0][0] as { to: string; subject: string };
    expect(sendCall.to).toBe('admin@example.com');
    expect(sendCall.subject).toContain('Test');
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('test email throws EmailPublisherError when SMTP verification fails', async () => {
    const mockTransporter = createMockTransporter({
      verify: vi.fn().mockRejectedValue(new Error('Connection refused')),
      sendMail: vi.fn()
    });
    const factory = createMockTransporterFactory(mockTransporter);

    const agent = new EmailPublisherAgent(factory);

    await expect(
      agent.sendTestEmail('admin@example.com', baseConfig)
    ).rejects.toThrow(EmailPublisherError);

    await expect(
      agent.sendTestEmail('admin@example.com', baseConfig)
    ).rejects.toThrow('SMTP verification failed: Connection refused');

    // Must NOT attempt to send if verify fails
    expect(mockTransporter.sendMail).not.toHaveBeenCalled();
  });
});
