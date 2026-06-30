import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly devMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.fromAddress = configService.get<string>('MAIL_FROM', 'noreply@localhost');
    this.devMode = !configService.get<string>('SMTP_USER');

    if (this.devMode) {
      /**
       * Dev mode: no SMTP credentials configured.
       * Try MailHog on localhost:1025 first, then fall back to console logging.
       *
       * Start MailHog with: docker compose --profile tools up mailhog
       * View captured emails at: http://localhost:8025
       */
      this.transporter = nodemailer.createTransport({
        host: configService.get<string>('SMTP_HOST', 'mailhog'),
        port: configService.get<number>('SMTP_PORT', 1025),
        secure: false,
        ignoreTLS: true,
      });

      this.logger.warn(
        '📬 Email running in DEV mode. ' +
          'Emails will be captured by MailHog (http://localhost:8025) if running, ' +
          'or logged to console.',
      );
    } else {
      // Production SMTP (Gmail, SMTP2Go, SES, SendGrid, Mailgun, etc.)
      this.transporter = nodemailer.createTransport({
        host: configService.getOrThrow<string>('SMTP_HOST'),
        port: configService.get<number>('SMTP_PORT', 587),
        secure: configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: configService.getOrThrow<string>('SMTP_USER'),
          pass: configService.getOrThrow<string>('SMTP_PASS'),
        },
      });
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;

    if (this.devMode) {
      // Verify MailHog is reachable; if not, just log
      try {
        await this.transporter.verify();
      } catch {
        this.logger.log(
          `[EMAIL — DEV] To: ${to} | Subject: ${options.subject}\n` +
            `Start MailHog with "docker compose --profile tools up" to capture emails.`,
        );
        return;
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text ?? options.subject,
        replyTo: options.replyTo,
      });

      this.logger.log(
        this.devMode
          ? `📧 Email captured by MailHog: ${info.messageId} → ${to}`
          : `📧 Email sent: ${info.messageId} → ${to}`,
      );
    } catch (err) {
      this.logger.error(`Email delivery failed to ${to}: ${err.message}`);
      // In dev mode, don't throw — just warn
      if (!this.devMode) throw err;
    }
  }
}
