import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { nanoid } from 'nanoid';
import { OrdersRepository } from './repositories/orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrderStateMachine } from './order-state-machine';
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  OrderCancelledEvent,
  OrderDeliveredEvent,
  OrderShippedEvent,
} from './events/order.events';
import { OrderStatus, PaymentStatus } from '../../common/enums';
import { User } from '../auth/entities/user.entity';
import { Address } from '../address/entities/address.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Coupon } from '../promotions/entities/coupon.entity';
import { CouponUsage } from '../promotions/entities/coupon-usage.entity';
import { CouponType } from '../../common/enums';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private readonly statusHistoryRepo: Repository<OrderStatusHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage)
    private readonly couponUsageRepo: Repository<CouponUsage>,
  ) {}

  // ─── Place Order ─────────────────────────────────────────────────────────────

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {

      // 1. Load user
      const user = await manager.findOneOrFail(User, { where: { id: userId } });

      // 2. Validate delivery address belongs to this user
      const address = await manager.findOne(Address, {
        where: { id: dto.addressId, userId },
      });
      if (!address) {
        throw new NotFoundException('Address not found or does not belong to you');
      }

      // 3. Resolve order items (cart or buy-now)
      const lineItems = dto.items?.length
        ? await this.resolveDirectItems(manager, dto.items)
        : await this.resolveCartItems(manager, userId);

      if (!lineItems.length) {
        throw new BadRequestException('No items to order. Add items to your cart first.');
      }

      // 4. Reserve inventory (optimistic lock)
      await this.reserveInventory(manager, lineItems);

      // 5. Build address snapshot
      const shippingAddressSnapshot = this.buildAddressSnapshot(address);

      // 6. Calculate subtotal
      const subtotal = lineItems.reduce(
        (sum: number, item: any) => sum + item.unitPrice * item.quantity,
        0,
      );

      // 7. Validate and apply coupon
      let discountAmount = 0;
      let appliedCouponId: string | null = null;
      let appliedCouponCode: string | null = null;

      if (dto.couponCode) {
        const couponResult = await this.applyCoupon(
          manager,
          dto.couponCode,
          userId,
          subtotal,
        );
        discountAmount = couponResult.discountAmount;
        appliedCouponId = couponResult.couponId;
        appliedCouponCode = couponResult.couponCode;
      }

      const shippingCharge = subtotal >= 499 ? 0 : 49;   // free shipping above ₹499
      const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
      const totalAmount = Math.max(0, subtotal + shippingCharge + taxAmount - discountAmount);

      // 8. Generate order number
      const orderNumber = this.generateOrderNumber();

      // 9. Persist order
      const order = manager.create(Order, {
        orderNumber,
        userId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        shippingAddress: shippingAddressSnapshot,
        billingAddress: shippingAddressSnapshot,
        subtotal,
        shippingCharge,
        discountAmount,
        taxAmount,
        totalAmount,
        couponId: appliedCouponId,
        couponCode: appliedCouponCode,
        notes: dto.notes ?? null,
      });

      const savedOrder = await manager.save(Order, order);

      // 10. Persist order items
      const orderItems = lineItems.map((item: any) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          variantId: item.variantId,
          productSnapshot: item.productSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          discountAmount: 0,
        }),
      );
      await manager.save(OrderItem, orderItems);

      // 11. Persist initial status history
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          orderId: savedOrder.id,
          fromStatus: null,
          toStatus: OrderStatus.PENDING,
          note: 'Order placed successfully',
          changedBy: userId,
        }),
      );

      // 12. Record coupon usage
      if (appliedCouponId) {
        await manager.save(
          CouponUsage,
          manager.create(CouponUsage, {
            couponId: appliedCouponId,
            userId,
            orderId: savedOrder.id,
            discountAmount,
          }),
        );

        // Increment used_count atomically
        await manager.increment(Coupon, { id: appliedCouponId }, 'usedCount', 1);
      }

      // 13. Clear cart (only if order came from cart)
      if (!dto.items?.length) {
        await manager.delete(CartItem, { cart: { userId } });
      }

      // 14. Load full order for response
      const fullOrder = await this.ordersRepository.findById(savedOrder.id);

      // 15. Emit domain event (non-blocking — outside transaction)
      setImmediate(() => {
        this.eventEmitter.emit(
          OrderCreatedEvent.EVENT_NAME,
          new OrderCreatedEvent(fullOrder!, user.email, user.firstName),
        );
      });

      return fullOrder!;
    });
  }

  // ─── Find Orders ──────────────────────────────────────────────────────────────

  async findMyOrders(userId: string, filter: OrderFilterDto) {
    return this.ordersRepository.findWithFilters(filter, userId);
  }

  async findMyOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.ordersRepository.findByIdAndUser(orderId, userId);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }

  async findAllOrders(filter: OrderFilterDto) {
    return this.ordersRepository.findWithFilters(filter);
  }

  async findOrderById(orderId: string): Promise<Order> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }

  // ─── Get Tracking ─────────────────────────────────────────────────────────────

  async getTracking(userId: string, orderId: string) {
    const order = await this.findMyOrder(userId, orderId);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber ?? null,
      trackingUrl: order.trackingUrl ?? null,
      estimatedDelivery: order.estimatedDelivery ?? null,
      deliveredAt: order.deliveredAt ?? null,
      timeline: order.statusHistory?.map((h) => ({
        status: h.toStatus,
        note: h.note,
        timestamp: h.createdAt,
        updatedBy: h.changedByUser
          ? `${h.changedByUser.firstName} ${h.changedByUser.lastName ?? ''}`
          : 'System',
      })) ?? [],
    };
  }

  // ─── Admin: Update Status ─────────────────────────────────────────────────────

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminId: string,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['statusHistory'],
      });

      if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

      // Validate transition
      OrderStateMachine.assertTransition(order.status, dto.status);

      // Shipping-specific validation
      if (dto.status === OrderStatus.SHIPPED && !dto.trackingNumber) {
        throw new BadRequestException('trackingNumber is required when marking order as Shipped');
      }

      const previousStatus = order.status;

      // Update order
      order.status = dto.status;

      if (dto.trackingNumber) order.trackingNumber = dto.trackingNumber;
      if (dto.trackingUrl)   order.trackingUrl = dto.trackingUrl;
      if (dto.estimatedDelivery) {
        order.estimatedDelivery = new Date(dto.estimatedDelivery);
      }
      if (dto.status === OrderStatus.DELIVERED) {
        order.deliveredAt = new Date();
        order.paymentStatus = PaymentStatus.PAID;
      }

      await manager.save(Order, order);

      // Append to status history
      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          orderId,
          fromStatus: previousStatus,
          toStatus: dto.status,
          note: dto.note ?? null,
          changedBy: adminId,
        }),
      );

      const updatedOrder = await this.ordersRepository.findById(orderId);

      // Emit specific events
      setImmediate(() => {
        this.eventEmitter.emit(
          OrderStatusChangedEvent.EVENT_NAME,
          new OrderStatusChangedEvent(updatedOrder!, previousStatus, dto.status, adminId, dto.note),
        );

        if (dto.status === OrderStatus.SHIPPED) {
          this.eventEmitter.emit(
            OrderShippedEvent.EVENT_NAME,
            new OrderShippedEvent(
              updatedOrder!,
              dto.trackingNumber!,
              dto.trackingUrl ?? null,
              dto.estimatedDelivery ? new Date(dto.estimatedDelivery) : null,
            ),
          );
        }

        if (dto.status === OrderStatus.DELIVERED) {
          this.eventEmitter.emit(
            OrderDeliveredEvent.EVENT_NAME,
            new OrderDeliveredEvent(updatedOrder!, '', ''),
          );
        }

        if (dto.status === OrderStatus.CANCELLED) {
          this.eventEmitter.emit(
            OrderCancelledEvent.EVENT_NAME,
            new OrderCancelledEvent(updatedOrder!, dto.note ?? 'Cancelled by admin', adminId, false),
          );
        }
      });

      return updatedOrder!;
    });
  }

  // ─── Customer: Cancel Order ───────────────────────────────────────────────────

  async requestCancellation(userId: string, orderId: string, reason: string): Promise<Order> {
    const order = await this.ordersRepository.findByIdAndUser(orderId, userId);

    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    if (!OrderStateMachine.isCancellableByCustomer(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled at this stage (${order.status}). ` +
          `Please raise a return request instead.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const previousStatus = order.status;
      order.status = OrderStatus.CANCELLED;

      await manager.save(Order, order);

      await manager.save(
        OrderStatusHistory,
        manager.create(OrderStatusHistory, {
          orderId,
          fromStatus: previousStatus,
          toStatus: OrderStatus.CANCELLED,
          note: `Cancelled by customer. Reason: ${reason}`,
          changedBy: userId,
        }),
      );

      // Release reserved inventory
      await this.releaseInventory(manager, orderId);

      const updatedOrder = await this.ordersRepository.findById(orderId);

      setImmediate(() => {
        this.eventEmitter.emit(
          OrderCancelledEvent.EVENT_NAME,
          new OrderCancelledEvent(updatedOrder!, reason, userId, true),
        );
      });

      return updatedOrder!;
    });
  }

  // ─── Revenue Analytics ─────────────────────────────────────────────────────────

  async getRevenueSummary(from: Date, to: Date) {
    return this.ordersRepository.getRevenueSummary(from, to);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async resolveCartItems(manager: any, userId: string) {
    const cart = await manager.findOne(Cart, {
      where: { userId },
      relations: ['items', 'items.variant', 'items.variant.inventory', 'items.variant.product'],
    });

    if (!cart?.items?.length) {
      throw new BadRequestException('Your cart is empty');
    }

    return cart.items.map((cartItem: CartItem) => ({
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      unitPrice: cartItem.variant.priceOverride ?? (cartItem.variant as any).product?.sellingPrice ?? 0,
      productSnapshot: this.buildProductSnapshot(cartItem.variant),
    }));
  }

  private async resolveDirectItems(
    manager: any,
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    const resolved = [];
    for (const item of items) {
      const variant = await manager.findOne(ProductVariant, {
        where: { id: item.variantId, isActive: true },
        relations: ['product', 'inventory'],
      });
      if (!variant) throw new NotFoundException(`Variant '${item.variantId}' not found`);

      resolved.push({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: variant.priceOverride ?? (variant as any).product?.sellingPrice ?? 0,
        productSnapshot: this.buildProductSnapshot(variant),
      });
    }
    return resolved;
  }

  private async reserveInventory(
    manager: any,
    lineItems: Array<{ variantId: string; quantity: number }>,
  ) {
    for (const item of lineItems) {
      const inventory = await manager.findOne(Inventory, {
        where: { variantId: item.variantId },
        lock: { mode: 'optimistic', version: undefined },
      });

      if (!inventory) {
        throw new NotFoundException(`Inventory not found for variant '${item.variantId}'`);
      }

      const available = inventory.quantity - inventory.reservedQuantity;
      if (available < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for variant '${item.variantId}'. Available: ${available}`,
        );
      }

      inventory.reservedQuantity += item.quantity;
      await manager.save(Inventory, inventory);
    }
  }

  private async releaseInventory(manager: any, orderId: string) {
    const items = await this.orderItemRepo.find({ where: { orderId } });

    for (const item of items) {
      if (!item.variantId) continue;

      await manager.decrement(
        Inventory,
        { variantId: item.variantId },
        'reservedQuantity',
        item.quantity,
      );
    }
  }

  private async applyCoupon(
    manager: any,
    code: string,
    userId: string,
    subtotal: number,
  ): Promise<{ discountAmount: number; couponId: string; couponCode: string }> {
    const coupon = await manager.findOne(Coupon, {
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!coupon) throw new BadRequestException(`Coupon '${code}' is invalid or expired`);

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException(`Coupon '${code}' is not yet active`);
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException(`Coupon '${code}' has expired`);
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException(`Coupon '${code}' has reached its usage limit`);
    }
    if (subtotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Minimum order value for coupon '${code}' is ₹${coupon.minOrderValue}`,
      );
    }

    // Per-user limit check
    const userUsageCount = await manager.count(CouponUsage, {
      where: { couponId: coupon.id, userId },
    });
    if (userUsageCount >= coupon.perUserLimit) {
      throw new BadRequestException(`You have already used this coupon the maximum number of times`);
    }

    let discountAmount = 0;
    if (coupon.type === CouponType.FLAT) {
      discountAmount = coupon.value;
    } else if (coupon.type === CouponType.PERCENT) {
      discountAmount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    }
    discountAmount = Math.round(discountAmount * 100) / 100;

    return { discountAmount, couponId: coupon.id, couponCode: coupon.code };
  }

  private buildProductSnapshot(variant: ProductVariant): Record<string, any> {
    const product = (variant as any).product;
    return {
      productId: product?.id,
      productName: product?.name,
      sku: variant.sku,
      size: variant.size ?? null,
      color: variant.color ?? null,
      colorHex: variant.colorHex ?? null,
      primaryImageUrl: product?.images?.[0]?.url ?? null,
      brandName: product?.brand?.name ?? null,
    };
  }

  private buildAddressSnapshot(address: Address): Record<string, any> {
    return {
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
    };
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const unique = nanoid(6).toUpperCase();
    return `ORD-${dateStr}-${unique}`;
  }
}
