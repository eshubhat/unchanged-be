import { Injectable } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';

// ─── Template Types ───────────────────────────────────────────────────────────

export interface OrderConfirmationData {
  customerName: string;
  orderNumber: string;
  totalAmount: number;
  items: Array<{ name: string; qty: number; price: number }>;
  shippingAddress: string;
  deliveryDate?: string;
}

export interface PasswordResetData {
  customerName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export interface ShipmentData {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  trackingUrl: string | null;
  estimatedDelivery: string | null;
}

/**
 * NotificationsService is the single entry point for all customer communications.
 * It orchestrates email + SMS channels.
 *
 * In production, replace direct calls with Bull Queue jobs:
 *   this.notificationsQueue.add('send-email', { ... })
 * This prevents transactional delays and enables retry logic.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
  ) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async sendEmailVerification(
    email: string,
    name: string,
    verificationUrl: string,
  ): Promise<void> {
    await this.emailProvider.send({
      to: email,
      subject: 'Verify your email address',
      html: this.template('email-verification', {
        name,
        verificationUrl,
        expiresIn: '24 hours',
      }),
    });
  }

  async sendPasswordReset(
    email: string,
    data: PasswordResetData,
  ): Promise<void> {
    await this.emailProvider.send({
      to: email,
      subject: 'Reset your password',
      html: this.template('password-reset', data),
    });
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async sendOrderConfirmation(
    email: string,
    phone: string,
    data: OrderConfirmationData,
  ): Promise<void> {
    await Promise.all([
      this.emailProvider.send({
        to: email,
        subject: `Order Confirmed! #${data.orderNumber}`,
        html: this.template('order-confirmation', data),
      }),
      this.smsProvider.send({
        to: phone,
        message: `Hi ${data.customerName}, your order #${data.orderNumber} has been confirmed! Total: ₹${data.totalAmount}`,
      }),
    ]);
  }

  async sendShipmentNotification(
    email: string,
    phone: string,
    data: ShipmentData,
  ): Promise<void> {
    await Promise.all([
      this.emailProvider.send({
        to: email,
        subject: `Your order #${data.orderNumber} has been shipped! 🚚`,
        html: this.template('order-shipped', data),
      }),
      this.smsProvider.send({
        to: phone,
        message: `Hi ${data.customerName}! Order #${data.orderNumber} shipped. Track: ${data.trackingUrl ?? data.trackingNumber}`,
      }),
    ]);
  }

  async sendDeliveryConfirmation(email: string, customerName: string, orderNumber: string): Promise<void> {
    await this.emailProvider.send({
      to: email,
      subject: `Your order #${orderNumber} has been delivered! 🎉`,
      html: this.template('order-delivered', { customerName, orderNumber }),
    });
  }

  async sendCancellationConfirmation(email: string, customerName: string, orderNumber: string): Promise<void> {
    await this.emailProvider.send({
      to: email,
      subject: `Order #${orderNumber} Cancelled`,
      html: this.template('order-cancelled', { customerName, orderNumber }),
    });
  }

  async sendReturnApproved(
    email: string,
    customerName: string,
    orderNumber: string,
    refundAmount: number,
  ): Promise<void> {
    await this.emailProvider.send({
      to: email,
      subject: `Return approved — Refund of ₹${refundAmount} initiated`,
      html: this.template('return-approved', { customerName, orderNumber, refundAmount }),
    });
  }

  // ─── Template Engine ──────────────────────────────────────────────────────

  /**
   * Minimal template engine.
   * In production, use Handlebars/Mjml or an ESP like SendGrid/SES templates.
   *
   * @param templateName - template identifier
   * @param data - template variables
   */
  private template(templateName: string, data: Record<string, any>): string {
    // NOTE: In production, load templates from disk or a template service.
    // This is a minimal inline implementation.
    const greeting = `<h2>Hi ${data.name ?? data.customerName ?? 'there'},</h2>`;
    const footer = `
      <hr/>
      <p style="color:#888;font-size:12px;">
        You're receiving this email because you have an account at our store.<br/>
        © ${new Date().getFullYear()} Ecommerce Store. All rights reserved.
      </p>
    `;

    const bodies: Record<string, string> = {
      'email-verification': `
        ${greeting}
        <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
        <a href="${data.verificationUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Verify Email
        </a>
        <p>This link expires in ${data.expiresIn}.</p>
      `,
      'password-reset': `
        ${greeting}
        <p>We received a request to reset your password. Click below to set a new password:</p>
        <a href="${data.resetUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
        <p>This link expires in ${data.expiresInMinutes} minutes. If you didn't request this, you can safely ignore it.</p>
      `,
      'order-confirmation': `
        ${greeting}
        <p>Your order <strong>#${data.orderNumber}</strong> has been confirmed!</p>
        <p><strong>Total: ₹${data.totalAmount}</strong></p>
        <p>We'll send you an update when it ships.</p>
      `,
      'order-shipped': `
        ${greeting}
        <p>Great news! Your order <strong>#${data.orderNumber}</strong> is on its way.</p>
        ${data.trackingUrl ? `<p><a href="${data.trackingUrl}">Track your package</a></p>` : ''}
        ${data.estimatedDelivery ? `<p>Estimated delivery: <strong>${data.estimatedDelivery}</strong></p>` : ''}
      `,
      'order-delivered': `
        ${greeting}
        <p>Your order <strong>#${data.orderNumber}</strong> has been delivered! 🎉</p>
        <p>We'd love to know what you think. Please leave a review!</p>
      `,
      'order-cancelled': `
        ${greeting}
        <p>Your order <strong>#${data.orderNumber}</strong> has been cancelled.</p>
        <p>If a payment was made, a refund will be processed within 5–7 business days.</p>
      `,
      'return-approved': `
        ${greeting}
        <p>Your return request for order <strong>#${data.orderNumber}</strong> has been approved.</p>
        <p>A refund of <strong>₹${data.refundAmount}</strong> will be credited within 5–7 business days.</p>
      `,
    };

    const body = bodies[templateName] ?? `<p>${JSON.stringify(data)}</p>`;

    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <img src="https://your-cdn.com/logo.png" alt="Store Logo" style="height:40px;margin-bottom:20px;"/>
          ${body}
          ${footer}
        </body>
      </html>
    `;
  }
}
