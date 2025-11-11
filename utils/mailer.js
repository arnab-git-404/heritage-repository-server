import nodemailer from 'nodemailer';

export function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const transporter = createTransport();
  if (!transporter) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html, text });
  return true;
}
