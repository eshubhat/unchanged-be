import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AddressModule } from './modules/address/address.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { dataSourceOptions } from './database/data-source';

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Database ────────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        ...dataSourceOptions,
        autoLoadEntities: true,
      }),
    }),

    // ─── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 60),
          },
        ],
      }),
    }),

    // ─── Event Emitter (Domain Events) ───────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),

    // ─── Feature Modules ──────────────────────────────────────────────────────────
    AuthModule,
    CatalogModule,
    OrdersModule,
    UploadsModule,
    AddressModule,
    PaymentsModule,
  ],
})
export class AppModule {}
