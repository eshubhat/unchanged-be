import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('addresses')
@Index(['userId', 'isDefault'])
@Index(['userId'])
export class Address extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /**
   * e.g. "Home", "Work", "Other"
   */
  @Column({ name: 'label', type: 'varchar', length: 50, nullable: true })
  label: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName: string;

  @Column({ name: 'phone', type: 'varchar', length: 15 })
  phone: string;

  @Column({ name: 'address_line1', type: 'varchar', length: 255 })
  addressLine1: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2: string | null;

  @Column({ name: 'landmark', type: 'varchar', length: 255, nullable: true })
  landmark: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  city: string;

  @Column({ name: 'state', type: 'varchar', length: 100 })
  state: string;

  @Column({ name: 'pincode', type: 'varchar', length: 10 })
  pincode: string;

  @Column({ name: 'country', type: 'varchar', length: 100, default: 'India' })
  country: string;

  @Column({
    name: 'latitude',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude: number | null;

  @Column({
    name: 'longitude',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude: number | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  // ─── Relations ─────────────────────────────────────────────────────────────
  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
