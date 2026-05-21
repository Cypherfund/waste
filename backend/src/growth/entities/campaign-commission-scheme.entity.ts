import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarketingCampaign } from './marketing-campaign.entity';
import { CommissionScheme } from './commission-scheme.entity';

@Entity('campaign_commission_schemes')
export class CampaignCommissionScheme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => MarketingCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: MarketingCampaign;

  @Index()
  @Column({ type: 'uuid', name: 'scheme_id' })
  schemeId: string;

  @ManyToOne(() => CommissionScheme)
  @JoinColumn({ name: 'scheme_id' })
  scheme: CommissionScheme;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;
}
