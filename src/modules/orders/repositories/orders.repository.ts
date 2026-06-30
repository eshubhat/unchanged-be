import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderFilterDto } from '../dto/order-filter.dto';

export interface PaginatedOrders {
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

@Injectable()
export class OrdersRepository {
  private readonly repo: Repository<Order>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = this.dataSource.getRepository(Order);
  }

  // ─── Finders ─────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Order | null> {
    return this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('order.statusHistory', 'history')
      .leftJoinAndSelect('order.payment', 'payment')
      .leftJoinAndSelect('order.coupon', 'coupon')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('history.changedByUser', 'changedBy')
      .where('order.id = :id', { id })
      .orderBy('history.createdAt', 'ASC')
      .getOne();
  }

  async findByIdAndUser(id: string, userId: string): Promise<Order | null> {
    return this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('order.statusHistory', 'history')
      .leftJoinAndSelect('order.payment', 'payment')
      .where('order.id = :id AND order.userId = :userId', { id, userId })
      .orderBy('history.createdAt', 'ASC')
      .getOne();
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.repo.findOne({
      where: { orderNumber },
      relations: ['items', 'statusHistory', 'payment'],
    });
  }

  async findWithFilters(
    filter: OrderFilterDto,
    scopedUserId?: string,
  ): Promise<PaginatedOrders> {
    const { page = 1, limit = 20 } = filter;

    const qb = this.buildFilterQuery(filter, scopedUserId);

    const [data, total] = await qb
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.payment', 'payment')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ─── Query Builder ────────────────────────────────────────────────────────────

  private buildFilterQuery(
    filter: OrderFilterDto,
    scopedUserId?: string,
  ): SelectQueryBuilder<Order> {
    const qb = this.repo.createQueryBuilder('order');

    // Scope to a single customer if provided (customer-facing routes)
    if (scopedUserId) {
      qb.andWhere('order.userId = :scopedUserId', { scopedUserId });
    } else if (filter.userId) {
      // Admin filtering by specific user
      qb.andWhere('order.userId = :userId', { userId: filter.userId });
    }

    if (filter.status) {
      qb.andWhere('order.status = :status', { status: filter.status });
    }

    if (filter.paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: filter.paymentStatus,
      });
    }

    if (filter.orderNumber) {
      qb.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: `%${filter.orderNumber}%`,
      });
    }

    if (filter.fromDate) {
      qb.andWhere('order.createdAt >= :fromDate', { fromDate: new Date(filter.fromDate) });
    }

    if (filter.toDate) {
      qb.andWhere('order.createdAt <= :toDate', { toDate: new Date(filter.toDate) });
    }

    // Sorting
    switch (filter.sortBy ?? 'newest') {
      case 'oldest':
        qb.orderBy('order.createdAt', 'ASC');
        break;
      case 'total_asc':
        qb.orderBy('order.totalAmount', 'ASC');
        break;
      case 'total_desc':
        qb.orderBy('order.totalAmount', 'DESC');
        break;
      default:
        qb.orderBy('order.createdAt', 'DESC');
    }

    return qb;
  }

  // ─── Mutations ────────────────────────────────────────────────────────────────

  async save(order: Partial<Order>): Promise<Order> {
    return this.repo.save(order as Order);
  }

  async countByUser(userId: string): Promise<number> {
    return this.repo.count({ where: { userId } });
  }

  /**
   * Admin stats helper — revenue by date range.
   */
  async getRevenueSummary(
    from: Date,
    to: Date,
  ): Promise<{ totalRevenue: number; totalOrders: number }> {
    const result = await this.repo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalRevenue')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .where('order.createdAt BETWEEN :from AND :to', { from, to })
      .andWhere("order.paymentStatus = 'paid'")
      .getRawOne();

    return {
      totalRevenue: parseFloat(result?.totalRevenue ?? '0'),
      totalOrders: parseInt(result?.totalOrders ?? '0'),
    };
  }
}
