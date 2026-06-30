import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../../../common/enums';
import { User } from '../../auth/entities/user.entity';

/**
 * Immutable append-only audit trail.
 * Never update or soft-delete rows.
 */
@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['entityType', 'entityId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'action', type: 'enum', enum: AuditAction })
  action: AuditAction;

  /**
   * e.g. "Product", "Order", "User"
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType: string | null;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  /**
   * The state of the entity BEFORE the change.
   */
  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, any> | null;

  /**
   * The state of the entity AFTER the change.
   */
  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Extra context: route, query params, etc.
   */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => User, (user) => user.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;
}
