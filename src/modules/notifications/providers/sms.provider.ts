import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendSmsOptions {
  to: string;         // E.164 format: +919876543210
  message: string;
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = configService.get<string>('MSG91_API_KEY', '');
    this.senderId = configService.get<string>('MSG91_SENDER_ID', 'ECMRCE');
  }

  async send(options: SendSmsOptions): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn(`[DEV] SMS to ${options.to}: ${options.message}`);
      return;
    }

    try {
      await axios.post('https://api.msg91.com/api/v5/flow/', {
        template_id: 'your-otp-template-id',
        short_url: '0',
        mobiles: options.to.replace('+', ''),
        VAR1: options.message,
      }, {
        headers: {
          authkey: this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`SMS sent to ${options.to}`);
    } catch (err) {
      this.logger.error(`SMS delivery failed to ${options.to}: ${err.message}`);
    }
  }
}
