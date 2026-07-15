import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Razorpay = require('razorpay');
import * as crypto from 'crypto';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentStatus, OrderStatus } from '../../common/enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderRefundedEvent } from '../orders/events/order.events';
import { RazorpayPaymentStatus } from '../../common/enums';

export interface CreateRazorpayOrderResult {
  razorpayOrderId: string;
  amount: number;         // in paise
  currency: string;
  key: string;            // public key for frontend
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: typeof Razorpay;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {
    this.razorpay = new Razorpay({
      key_id: configService.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });

    this.webhookSecret = configService.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');
  }

  // ─── Initiate Payment ─────────────────────────────────────────────────────

  /**
   * Creates a Razorpay order and stores a pending Payment record.
   * The frontend uses razorpayOrderId + key to open the Razorpay checkout modal.
   */
  async initiatePayment(
    orderId: string,
    userId: string,
  ): Promise<CreateRazorpayOrderResult> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId },
    });

    if (!order) throw new BadRequestException('Order not found');

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const amountInPaise = Math.round(order.totalAmount * 100);

    let razorpayOrder: any;
    try {
      razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          userId,
        },
      });
    } catch (err) {
      this.logger.error(`Razorpay order creation failed: ${err.message}`);
      throw new InternalServerErrorException('Payment gateway error. Please try again.');
    }

    // Upsert payment record
    const existing = await this.paymentRepo.findOne({ where: { orderId } });

    const payment = existing ?? this.paymentRepo.create({ orderId });
    payment.razorpayOrderId = razorpayOrder.id;
    payment.amount = order.totalAmount;
    payment.currency = 'INR';
    payment.status = RazorpayPaymentStatus.CREATED;

    await this.paymentRepo.save(payment);

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      key: this.configService.getOrThrow<string>('RAZORPAY_KEY_ID'),
    };
  }

  // ─── Verify Payment ───────────────────────────────────────────────────────

  /**
   * Verifies Razorpay signature after checkout success.
   * Called by frontend after the checkout modal closes.
   */
  async verifyPayment(
    orderId: string,
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<Payment> {
    // 1. Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'))
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      this.logger.warn(
        `Payment signature mismatch for order ${orderId} — possible tampering`,
      );
      throw new BadRequestException('Payment verification failed: invalid signature');
    }

    // 2. Mark payment as paid
    const payment = await this.paymentRepo.findOne({
      where: { orderId, razorpayOrderId },
    });

    if (!payment) throw new BadRequestException('Payment record not found');

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = RazorpayPaymentStatus.PAID;
    payment.capturedAt = new Date();

    await this.paymentRepo.save(payment);

    // 3. Update order payment status
    await this.orderRepo.update(orderId, {
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.CONFIRMED,
    });

    this.logger.log(`Payment verified for order ${orderId}: ${razorpayPaymentId}`);

    return payment;
  }

  // ─── Webhook Handler ──────────────────────────────────────────────────────

  /**
   * Handles Razorpay webhooks.
   * Verify signature with the raw request body + webhook secret.
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string,
    event: string,
    payload: any,
  ): Promise<void> {
    // Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Razorpay webhook received: ${event}`);

    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;

      case 'refund.created':
        await this.handleRefundCreated(payload);
        break;

      default:
        this.logger.log(`Unhandled Razorpay event: ${event}`);
    }
  }

  // ─── Refund ───────────────────────────────────────────────────────────────

  async initiateRefund(paymentId: string, amount: number): Promise<void> {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100), // paise
        speed: 'optimum',
      });

      this.logger.log(`Refund initiated: ${refund.id} for payment ${paymentId}`);
    } catch (err) {
      this.logger.error(`Refund failed for payment ${paymentId}: ${err.message}`);
      throw new InternalServerErrorException('Refund initiation failed');
    }
  }

  // ─── Private Webhook Handlers ─────────────────────────────────────────────

  private async handlePaymentCaptured(payload: any): Promise<void> {
    const paymentId = payload.payment?.entity?.id;
    const orderId = payload.payment?.entity?.notes?.orderId;

    if (!orderId) return;

    await this.orderRepo.update(
      { id: orderId },
      { paymentStatus: PaymentStatus.PAID, status: OrderStatus.CONFIRMED },
    );

    await this.paymentRepo.update(
      { razorpayPaymentId: paymentId },
      { status: RazorpayPaymentStatus.PAID, capturedAt: new Date() },
    );
  }

  private async handlePaymentFailed(payload: any): Promise<void> {
    const orderId = payload.payment?.entity?.notes?.orderId;
    if (!orderId) return;

    await this.orderRepo.update(
      { id: orderId },
      { paymentStatus: PaymentStatus.FAILED },
    );
  }

  private async handleRefundCreated(payload: any): Promise<void> {
    const refundId = payload.refund?.entity?.id;
    const amount = (payload.refund?.entity?.amount ?? 0) / 100;

    this.logger.log(`Refund created by Razorpay: ${refundId}, ₹${amount}`);
    // TODO: update Refund entity, emit OrderRefundedEvent
  }
}
