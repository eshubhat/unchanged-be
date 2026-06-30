import { Entity, Column, Index, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from './role.entity';

@Entity('permissions')
@Index(['action', 'resource'], { unique: true })
export class Permission extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  /**
   * Action: create | read | update | delete | manage
   */
  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  /**
   * Resource: products | orders | users | coupons …
   */
  @Column({ name: 'resource', type: 'varchar', length: 100 })
  resource: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
