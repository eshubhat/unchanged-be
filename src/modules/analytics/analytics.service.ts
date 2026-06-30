import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * AnalyticsService provides admin dashboard data.
 *
 * All queries use raw SQL via DataSource for performance on large datasets.
 * For scale beyond 1M orders, move these to a read replica connection.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  // ─── Revenue ──────────────────────────────────────────────────────────────

  async getRevenueSummary(from: Date, to: Date) {
    const [result] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int                           AS total_orders,
         SUM(total_amount)                       AS total_revenue,
         AVG(total_amount)::numeric(10,2)        AS avg_order_value,
         SUM(discount_amount)                    AS total_discounts,
         SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) AS confirmed_revenue
       FROM orders
       WHERE created_at BETWEEN $1 AND $2
         AND payment_status = 'paid'`,
      [from, to],
    );

    return result;
  }

  async getRevenueTrend(
    from: Date,
    to: Date,
    granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    const trunc = { day: 'day', week: 'week', month: 'month' }[granularity];

    return this.dataSource.query(
      `SELECT
         DATE_TRUNC('${trunc}', created_at) AS period,
         COUNT(*)::int                       AS orders,
         SUM(total_amount)                   AS revenue
       FROM orders
       WHERE created_at BETWEEN $1 AND $2
         AND payment_status = 'paid'
       GROUP BY 1
       ORDER BY 1`,
      [from, to],
    );
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrderStatusBreakdown(from: Date, to: Date) {
    return this.dataSource.query(
      `SELECT status, COUNT(*)::int AS count
       FROM orders
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY status
       ORDER BY count DESC`,
      [from, to],
    );
  }

  // ─── Top Products ────────────────────────────────────────────────────────

  async getTopProducts(from: Date, to: Date, limit = 10) {
    return this.dataSource.query(
      `SELECT
         oi.product_snapshot->>'productId'   AS product_id,
         oi.product_snapshot->>'productName' AS product_name,
         SUM(oi.quantity)::int               AS units_sold,
         SUM(oi.total_price)                 AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.created_at BETWEEN $1 AND $2
         AND o.payment_status = 'paid'
       GROUP BY 1, 2
       ORDER BY units_sold DESC
       LIMIT $3`,
      [from, to, limit],
    );
  }

  // ─── Top Categories ───────────────────────────────────────────────────────

  async getTopCategories(from: Date, to: Date, limit = 10) {
    return this.dataSource.query(
      `SELECT
         c.name               AS category,
         COUNT(DISTINCT o.id) AS orders,
         SUM(oi.total_price)  AS revenue
       FROM order_items oi
       JOIN orders o     ON o.id = oi.order_id
       JOIN product_variants pv ON pv.id = oi.variant_id
       JOIN products p   ON p.id = pv.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE o.created_at BETWEEN $1 AND $2
         AND o.payment_status = 'paid'
       GROUP BY c.name
       ORDER BY revenue DESC
       LIMIT $3`,
      [from, to, limit],
    );
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  async getUserGrowth(from: Date, to: Date) {
    return this.dataSource.query(
      `SELECT
         DATE_TRUNC('day', created_at) AS date,
         COUNT(*)::int AS new_users
       FROM users
       WHERE created_at BETWEEN $1 AND $2
         AND deleted_at IS NULL
       GROUP BY 1
       ORDER BY 1`,
      [from, to],
    );
  }

  async getUserSummary() {
    const [result] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int                                           AS total_users,
         COUNT(*) FILTER (WHERE is_email_verified = true)::int  AS verified_users,
         COUNT(*) FILTER (WHERE is_active = false)::int         AS deactivated_users,
         COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::int AS active_30d
       FROM users
       WHERE deleted_at IS NULL`,
    );
    return result;
  }

  // ─── Inventory Alerts ────────────────────────────────────────────────────

  async getLowStockAlerts(threshold = 10) {
    return this.dataSource.query(
      `SELECT
         pv.sku,
         p.name AS product_name,
         inv.quantity,
         inv.reserved_quantity,
         (inv.quantity - inv.reserved_quantity) AS available,
         inv.low_stock_threshold
       FROM inventory inv
       JOIN product_variants pv ON pv.id = inv.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE (inv.quantity - inv.reserved_quantity) <= $1
         AND p.is_active = true
         AND pv.is_active = true
       ORDER BY available ASC
       LIMIT 100`,
      [threshold],
    );
  }

  // ─── Dashboard KPIs ───────────────────────────────────────────────────────

  async getDashboardKPIs() {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [[todayStats], [monthStats], [userStats], lowStock] = await Promise.all([
      this.dataSource.query(
        `SELECT COUNT(*)::int AS orders, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE created_at >= $1 AND payment_status = 'paid'`,
        [startOfToday],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS orders, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE created_at >= $1 AND payment_status = 'paid'`,
        [startOfMonth],
      ),
      this.dataSource.query(
        `SELECT COUNT(*)::int AS total FROM users WHERE deleted_at IS NULL`,
      ),
      this.getLowStockAlerts(5),
    ]);

    return {
      today: { orders: todayStats.orders, revenue: todayStats.revenue },
      thisMonth: { orders: monthStats.orders, revenue: monthStats.revenue },
      totalUsers: userStats.total,
      lowStockCount: lowStock.length,
    };
  }
}
