import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReturnRequest } from './entities/return-request.entity';
import { CancellationRequest } from './entities/cancellation-request.entity';
import { Order } from './entities/order.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { OrderStateMachine } from './order-state-machine';
import { OrdersRepository } from './repositories/orders.repository';
import { CreateReturnRequestDto, ResolveReturnRequestDto } from './dto/return-request.dto';
import { CreateCancellationRequestDto, ResolveCancellationRequestDto } from './dto/cancellation-request.dto';
import { OrderStatus, RequestStatus } from '@common/enums';
import {
  ReturnRequestedEvent,
  ReturnApprovedEvent,
  CancellationRequestedEvent,
  OrderCancelledEvent,
} from './events/order.events';

@Injectable()
export class OrderRequestsService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(CancellationRequest)
    private readonly cancellationRepo: Repository<CancellationRequest>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private readonly historyRepo: Repository<OrderStatusHistory>,
  ) { }

  // ─── Return Requests ──────────────────────────────────────────────────────────

  async createReturnRequest(
    userId: string,
    orderId: string,
    dto: CreateReturnRequestDto,
  ): Promise<ReturnRequest> {
    const order = await this.ordersRepository.findByIdAndUser(orderId, userId);

    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    if (!OrderStateMachine.isReturnable(order.status)) {
      throw new BadRequestException(
        `Return can only be requested for delivered orders. Current status: ${order.status}`,
      );
    }

    // Prevent duplicate pending return request
    const existing = await this.returnRepo.findOne({
      where: {
        orderId,
        userId,
        status: RequestStatus.REQUESTED,
      },
    });

    if (existing) {
      throw new ConflictException('A return request for this order is already pending review');
    }

    const returnRequest = this.returnRepo.create({
      orderId,
      userId,
      reason: dto.reason,
      description: dto.description ?? null,
      evidenceUrls: dto.evidenceUrls ?? [],
      status: RequestStatus.REQUESTED,
    });

    const saved = await this.returnRepo.save(returnRequest);

    // Update order status to RETURNED (pending review)
    await this.orderRepo.update(orderId, { status: OrderStatus.RETURNED });

    await this.historyRepo.save(
      this.historyRepo.create({
        orderId,
        fromStatus: OrderStatus.DELIVERED,
        toStatus: OrderStatus.RETURNED,
        note: `Return requested: ${dto.reason}`,
        changedBy: userId,
      }),
    );

    const updatedOrder = await this.ordersRepository.findById(orderId);

    setImmediate(() => {
      this.eventEmitter.emit(
        ReturnRequestedEvent.EVENT_NAME,
        new ReturnRequestedEvent(updatedOrder!, saved.id, dto.reason),
      );
    });

    return saved;
  }

  async getReturnRequests(userId: string, orderId: string): Promise<ReturnRequest[]> {
    const order = await this.ordersRepository.findByIdAndUser(orderId, userId);
    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    return this.returnRepo.find({
      where: { orderId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllReturnRequests(
    status?: RequestStatus,
  ): Promise<ReturnRequest[]> {
    const where = status ? { status } : {};
    return this.returnRepo.find({
      where,
      relations: ['order', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolveReturnRequest(
    returnRequestId: string,
    dto: ResolveReturnRequestDto,
    adminId: string,
  ): Promise<ReturnRequest> {
    const returnRequest = await this.returnRepo.findOne({
      where: { id: returnRequestId },
      relations: ['order'],
    });

    if (!returnRequest) {
      throw new NotFoundException(`Return request '${returnRequestId}' not found`);
    }

    if (returnRequest.status !== RequestStatus.REQUESTED) {
      throw new BadRequestException(`Return request is already ${returnRequest.status}`);
    }

    if (dto.action === 'approved' && !dto.refundAmount) {
      throw new BadRequestException('refundAmount is required when approving a return');
    }

    const newStatus =
      dto.action === 'approved' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

    Object.assign(returnRequest, {
      status: newStatus,
      adminNote: dto.adminNote ?? null,
      refundAmount: dto.refundAmount ?? null,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });

    const saved = await this.returnRepo.save(returnRequest);

    if (dto.action === 'approved') {
      setImmediate(() => {
        this.eventEmitter.emit(
          ReturnApprovedEvent.EVENT_NAME,
          new ReturnApprovedEvent(
            returnRequest.order,
            returnRequestId,
            dto.refundAmount!,
          ),
        );
      });
    }

    return saved;
  }

  // ─── Cancellation Requests ────────────────────────────────────────────────────

  async createCancellationRequest(
    userId: string,
    orderId: string,
    dto: CreateCancellationRequestDto,
  ): Promise<CancellationRequest> {
    const order = await this.ordersRepository.findByIdAndUser(orderId, userId);

    if (!order) throw new NotFoundException(`Order '${orderId}' not found`);

    // Orders in PROCESSING or later that customer can't self-cancel go through this request flow
    if (OrderStateMachine.isCancellableByCustomer(order.status)) {
      throw new BadRequestException(
        `You can cancel this order directly. Use the cancel endpoint instead.`,
      );
    }

    if (OrderStateMachine.isTerminal(order.status)) {
      throw new BadRequestException(
        `Order is in a terminal state (${order.status}) and cannot be cancelled`,
      );
    }

    const existing = await this.cancellationRepo.findOne({
      where: { orderId, userId, status: RequestStatus.REQUESTED },
    });

    if (existing) {
      throw new ConflictException('A cancellation request for this order is already pending');
    }

    const request = this.cancellationRepo.create({
      orderId,
      userId,
      reason: dto.reason,
      status: RequestStatus.REQUESTED,
    });

    const saved = await this.cancellationRepo.save(request);

    setImmediate(() => {
      this.eventEmitter.emit(
        CancellationRequestedEvent.EVENT_NAME,
        new CancellationRequestedEvent(order, saved.id, dto.reason),
      );
    });

    return saved;
  }

  async getAllCancellationRequests(status?: RequestStatus): Promise<CancellationRequest[]> {
    const where = status ? { status } : {};
    return this.cancellationRepo.find({
      where,
      relations: ['order', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async resolveCancellationRequest(
    requestId: string,
    dto: ResolveCancellationRequestDto,
    adminId: string,
  ): Promise<CancellationRequest> {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(CancellationRequest, {
        where: { id: requestId },
        relations: ['order'],
      });

      if (!request) throw new NotFoundException(`Cancellation request '${requestId}' not found`);

      if (request.status !== RequestStatus.REQUESTED) {
        throw new BadRequestException(`Request is already ${request.status}`);
      }

      const newStatus =
        dto.action === 'approved' ? RequestStatus.APPROVED : RequestStatus.REJECTED;

      Object.assign(request, {
        status: newStatus,
        adminNote: dto.adminNote ?? null,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      });

      await manager.save(CancellationRequest, request);

      // If approved, cancel the order
      if (dto.action === 'approved') {
        const previousStatus = request.order.status;
        await manager.update(Order, request.orderId, { status: OrderStatus.CANCELLED });

        await manager.save(
          OrderStatusHistory,
          manager.create(OrderStatusHistory, {
            orderId: request.orderId,
            fromStatus: previousStatus,
            toStatus: OrderStatus.CANCELLED,
            note: `Cancellation approved by admin. ${dto.adminNote ?? ''}`.trim(),
            changedBy: adminId,
          }),
        );

        const updatedOrder = await this.ordersRepository.findById(request.orderId);

        setImmediate(() => {
          this.eventEmitter.emit(
            OrderCancelledEvent.EVENT_NAME,
            new OrderCancelledEvent(updatedOrder!, request.reason, adminId, false),
          );
        });
      }

      return request;
    });
  }
}
