import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private createTransporter() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number.parseInt(process.env.SMTP_PORT?.trim() || '587', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!host || !user || !pass || Number.isNaN(port)) {
      throw new ServiceUnavailableException('SMTP no configurado');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private getFromAddress() {
    return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'no-reply@omnia.app';
  }

  async sendWelcomeVerificationEmail(email: string, name: string, otp: string) {
    const transporter = this.createTransporter();
    await this.sendMailOrThrow(transporter, {
      from: this.getFromAddress(),
      to: email,
      subject: 'Bienvenido a Omnia',
      text: `Hola ${name},\n\nBienvenido a Omnia. Tu codigo de verificacion es: ${otp}\n\nEste codigo vence en 15 minutos.\n\nSi no creaste esta cuenta, ignora este correo.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
          <h2>Bienvenido a Omnia</h2>
          <p>Hola ${this.escapeHtml(name)},</p>
          <p>Gracias por registrarte. Usa este codigo para verificar tu correo:</p>
          <div style="font-size: 30px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</div>
          <p>Este codigo vence en 15 minutos.</p>
          <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, otp: string) {
    const transporter = this.createTransporter();
    await this.sendMailOrThrow(transporter, {
      from: this.getFromAddress(),
      to: email,
      subject: 'Recupera tu acceso a Omnia',
      text: `Hola ${name},\n\nTu codigo para recuperar el acceso a Omnia es: ${otp}\n\nEste codigo vence en 15 minutos.\n\nSi no solicitaste este cambio, ignora este correo.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
          <h2>Recupera tu acceso a Omnia</h2>
          <p>Hola ${this.escapeHtml(name)},</p>
          <p>Usa este codigo para restablecer tu contrasena:</p>
          <div style="font-size: 30px; font-weight: 700; letter-spacing: 6px; margin: 20px 0;">${otp}</div>
          <p>Este codigo vence en 15 minutos.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    });
  }

  private async sendMailOrThrow(
    transporter: nodemailer.Transporter,
    payload: nodemailer.SendMailOptions,
  ) {
    try {
      await transporter.sendMail(payload);
    } catch {
      throw new ServiceUnavailableException('No se pudo enviar el correo. Revisa la configuracion SMTP.');
    }
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
