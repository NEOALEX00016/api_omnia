import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryColumn({ name: 'currency_code', length: 10 })
  currencyCode: string;

  @Column({ name: 'rate_to_usd', type: 'decimal', precision: 12, scale: 6 })
  rateToUsd: number;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;
}