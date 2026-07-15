import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

class InitiatePaymentDto {
  @ApiProperty({ description: 'Order UUID to initiate payment for' })
  @IsUUID()
  orderId: string;
}

class VerifyPaymentDto {
  @ApiProperty({ description: 'Internal order UUID' }) @IsUUID() orderId: string;
  @ApiProperty() @IsString() @IsNotEmpty() razorpayOrderId: string;
  @ApiProperty() @IsString() @IsNotEmpty() razorpayPaymentId: string;
  @ApiProperty() @IsString() @IsNotEmpty() razorpaySignature: string;
}

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/payments/initiate
   * Customer initiates payment for an existing order.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Razorpay order for checkout' })
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiatePayment(dto.orderId, userId);
  }

  /**
   * POST /api/v1/payments/verify
   * Frontend calls after Razorpay checkout success.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.verifyPayment(
      dto.orderId,
      userId,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
  }

  /**
   * POST /api/v1/payments/webhook
   * Razorpay calls this endpoint on payment events.
   * IMPORTANT: This route must receive the RAW request body for signature verification.
   * Configure in NestJS bootstrap: app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }))
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint (internal)' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    const event = body?.event;

    await this.paymentsService.handleWebhook(rawBody, signature, event, body?.payload);

    return { status: 'ok' };
  }
}
