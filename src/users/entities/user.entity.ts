import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { UserConfig } from './user-config.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  name: string;

  @Column({ default: false })
  is_pro: boolean;

  @Column({ name: 'email_verified', default: false })
  email_verified: boolean;

  @Column({ name: 'email_verification_otp_hash', nullable: true })
  email_verification_otp_hash: string | null;

  @Column({ name: 'email_verification_otp_expires_at', type: 'timestamp', nullable: true })
  email_verification_otp_expires_at: Date | null;

  @Column({ name: 'password_reset_otp_hash', nullable: true })
  password_reset_otp_hash: string | null;

  @Column({ name: 'password_reset_otp_expires_at', type: 'timestamp', nullable: true })
  password_reset_otp_expires_at: Date | null;

  @Column({ name: 'last_email_otp_sent_at', type: 'timestamp', nullable: true })
  last_email_otp_sent_at: Date | null;

  @Column({ name: 'last_password_reset_otp_sent_at', type: 'timestamp', nullable: true })
  last_password_reset_otp_sent_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToOne(() => UserConfig, config => config.user)
  config: UserConfig;
}
