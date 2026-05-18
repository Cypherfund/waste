import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MarketerProfile } from './marketer-profile.entity';
import { CommissionScheme } from './commission-scheme.entity';
import { User } from '../../users/entities/user.entity';

@Entity('marketer_scheme_assignments')
@Unique(['marketerProfileId', 'schemeId'])
export class MarketerSchemeAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'marketer_profile_id' })
  marketerProfileId: string;

  @ManyToOne(() => MarketerProfile)
  @JoinColumn({ name: 'marketer_profile_id' })
  marketerProfile: MarketerProfile;

  @Column({ type: 'uuid', name: 'scheme_id' })
  schemeId: string;

  @ManyToOne(() => CommissionScheme)
  @JoinColumn({ name: 'scheme_id' })
  scheme: CommissionScheme;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'assigned_at' })
  assignedAt: Date;

  @Column({ type: 'uuid', name: 'assigned_by' })
  assignedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;
}
