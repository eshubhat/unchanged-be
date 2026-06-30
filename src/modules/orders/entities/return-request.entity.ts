import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RequestStatus } from '../../../common/enums';
import { Order } from './order.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('return_requests')
@Index(['orderId'])
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class ReturnRequest extends BaseEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'reason', type: 'text' })
  reason: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  /**
   * Comma-separated image URLs uploaded by the user as proof.
   */
  @Column({ name: 'evidence_urls', type: 'varchar', array: true, default: '{}' })
  evidenceUrls: string[];

  @Column({
    name: 'status',
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.REQUESTED,
  })
  status: RequestStatus;

  @Column({ name: 'refund_amount', type: 'numeric', precision: 10, scale: 2, nullable: true })
  refundAmount: number | null;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedByUser: User | null;
}
