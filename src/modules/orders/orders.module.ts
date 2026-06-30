import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { CancellationRequest } from './entities/cancellation-request.entity';

// Cross-module entities
import { User } from '../auth/entities/user.entity';
import { Address } from '../address/entities/address.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Coupon } from '../promotions/entities/coupon.entity';
import { CouponUsage } from '../promotions/entities/coupon-usage.entity';

// Controllers
import { OrdersController, AdminOrdersController } from './orders.controller';

// Services
import { OrdersService } from './orders.service';
import { OrderRequestsService } from './order-requests.service';

// Repository
import { OrdersRepository } from './repositories/orders.repository';

// Listeners
import { OrderEventsListener } from './listeners/order-events.listener';

@Module({
  imports: [
    /**
     * EventEmitterModule is registered globally in AppModule.
     * Listed here for clarity — no duplicate registration needed.
     */
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      ReturnRequest,
      CancellationRequest,
      User,
      Address,
      Cart,
      CartItem,
      ProductVariant,
      Inventory,
      Coupon,
      CouponUsage,
    ]),
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    OrdersService,
    OrderRequestsService,
    OrdersRepository,
    OrderEventsListener,
  ],
  exports: [OrdersService, OrderRequestsService, OrdersRepository],
})
export class OrdersModule {}
