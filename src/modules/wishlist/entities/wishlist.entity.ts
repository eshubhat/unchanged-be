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
import { WishlistItem } from './wishlist-item.entity';

@Entity('wishlists')
@Index(['userId'], { unique: true, where: '"deleted_at" IS NULL' })
export class Wishlist extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @OneToOne(() => User, (user) => user.wishlist, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => WishlistItem, (item) => item.wishlist, { cascade: true })
  items: WishlistItem[];
}
