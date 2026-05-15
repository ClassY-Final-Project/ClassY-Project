import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Configured SMTP üzerinden e-posta gönderir.
 * SMTP yapılandırılmamışsa console'a düşer ve { sent: false } döner.
 */
export async function sendMail(opts: MailOptions): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transporter || !from) {
    console.warn(
      "[mailer] SMTP yapılandırılmamış. E-posta gönderilmedi. Konu:",
      opts.subject,
      "Alıcı:",
      opts.to,
    );
    return { sent: false, error: "SMTP yapılandırılmamış." };
  }

  try {
    await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Gönderim hatası:", err);
    return { sent: false, error: (err as Error).message };
  }
}

export function isMailConfigured(): boolean {
  return getTransporter() !== null;
}
