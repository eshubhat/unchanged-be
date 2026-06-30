import {
  Entity,
  Column,
  Index,
  ManyToMany,
  OneToMany,
  OneToOne,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserRole } from '../../../common/enums';
import { Role } from './role.entity';
import { RefreshToken } from './refresh-token.entity';
import { Address } from '../../address/entities/address.entity';
import { Cart } from '../../cart/entities/cart.entity';
import { Wishlist } from '../../wishlist/entities/wishlist.entity';
import { Order } from '../../orders/entities/order.entity';
import { ProductReview } from '../../reviews/entities/product-review.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { CouponUsage } from '../../promotions/entities/coupon-usage.entity';

@Entity('users')
@Index(['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['phone'], { unique: true, where: '"deleted_at" IS NULL AND phone IS NOT NULL' })
@Index(['googleId'], { where: '"google_id" IS NOT NULL' })
export class User extends BaseEntity {
  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'google_id', type: 'varchar', nullable: true })
  googleId: string | null;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToMany(() => Role, (role) => role.users, { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  refreshTokens: RefreshToken[];

  @OneToMany(() => Address, (address) => address.user, { cascade: true })
  addresses: Address[];

  @OneToOne(() => Cart, (cart) => cart.user, { cascade: true })
  cart: Cart;

  @OneToOne(() => Wishlist, (wishlist) => wishlist.user, { cascade: true })
  wishlist: Wishlist;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => ProductReview, (review) => review.user)
  reviews: ProductReview[];

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];

  @OneToMany(() => CouponUsage, (usage) => usage.user)
  couponUsages: CouponUsage[];
}
