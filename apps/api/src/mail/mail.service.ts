import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { AppConfigService } from '../config/app-config.service';
import { buildPasswordResetEmail } from './mail.templates';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

  constructor(private readonly appConfig: AppConfigService) {
    if (this.appConfig.smtpConfigured) {
      this.transporter = nodemailer.createTransport({
        host: this.appConfig.smtpHost,
        port: this.appConfig.smtpPort,
        secure: this.appConfig.smtpSecure,
        auth:
          this.appConfig.smtpUser && this.appConfig.smtpPass
            ? {
                user: this.appConfig.smtpUser,
                pass: this.appConfig.smtpPass,
              }
            : undefined,
      });
    }
  }

  onModuleInit() {
    if (!this.transporter) {
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST empty). Password-reset emails will NOT be delivered.',
      );
      return;
    }

    if (!this.appConfig.smtpUser || !this.appConfig.smtpPass) {
      this.logger.warn(
        'SMTP_HOST is set but SMTP_USER/SMTP_PASS are missing. Outbound mail will fail until credentials are added.',
      );
      return;
    }

    // Do not await — SMTP verify can hang on free hosts and delay /health.
    void this.transporter
      .verify()
      .then(() => {
        this.logger.log(
          `SMTP ready (${this.appConfig.smtpHost}:${this.appConfig.smtpPort})`,
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`SMTP verification failed: ${message}`);
      });
  }

  async sendPasswordReset(input: {
    to: string;
    locale: string;
    resetUrl: string;
    expiresMinutes: number;
    userName?: string | null;
  }) {
    const content = buildPasswordResetEmail(input);
    await this.sendMail({
      to: input.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      resetUrl: input.resetUrl,
    });
  }

  private async sendMail(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
    resetUrl?: string;
  }) {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured. Email skipped for ${input.to}: ${input.subject}`,
      );
      if (input.resetUrl) {
        this.logger.warn(`Dev reset link (not emailed): ${input.resetUrl}`);
      }
      return;
    }

    if (!this.appConfig.smtpUser || !this.appConfig.smtpPass) {
      this.logger.error(
        `SMTP credentials missing. Email not sent to ${input.to}. Set SMTP_USER and SMTP_PASS in apps/api/.env`,
      );
      if (input.resetUrl && !this.appConfig.isProduction) {
        this.logger.warn(`Dev reset link (not emailed): ${input.resetUrl}`);
      }
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.appConfig.smtpFrom,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      this.logger.log(
        `Email sent to ${input.to}: ${input.subject} (id=${info.messageId})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${input.to}: ${message}`);
      throw error;
    }
  }
}
