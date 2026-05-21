import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarketingCampaign } from './marketing-campaign.entity';
import { MarketerProfile } from './marketer-profile.entity';
import { User } from '../../users/entities/user.entity';

@Entity('campaign_marketer_assignments')
@Index(['campaignId', 'isActive'], { where: 'is_active = true' })
export class CampaignMarketerAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => MarketingCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: MarketingCampaign;

  @Index()
  @Column({ type: 'uuid', name: 'marketer_profile_id' })
  marketerProfileId: string;

  @ManyToOne(() => MarketerProfile)
  @JoinColumn({ name: 'marketer_profile_id' })
  marketerProfile: MarketerProfile;

  @CreateDateColumn({ type: 'timestamptz', name: 'assigned_at' })
  assignedAt: Date;

  @Column({ type: 'uuid', name: 'assigned_by' })
  assignedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;
}
