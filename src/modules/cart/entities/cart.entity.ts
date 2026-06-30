import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
@Index(['userId'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['sessionId'], { where: '"session_id" IS NOT NULL' })
export class Cart extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /**
   * Allows guest carts — linked to user on login/registration.
   */
  @Column({ name: 'session_id', type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToOne(() => User, (user) => user.cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];
}
