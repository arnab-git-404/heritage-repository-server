// import nodemailer from 'nodemailer';

// export function createTransport() {
//   const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
//   if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

//   const transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: Number(SMTP_PORT),
//     secure: Number(SMTP_PORT) === 465,
//     auth: { user: SMTP_USER, pass: SMTP_PASS },
//   });
//   return transporter;
// }

// export async function sendMail({ to, subject, html, text }) {
//   const transporter = createTransport();
//   if (!transporter) return false;

//   const from = process.env.SMTP_FROM || process.env.SMTP_USER;

//   await transporter.sendMail({ from, to, subject, html, text });
//   return true;
// }

import nodemailer from "nodemailer";

export function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.error("SMTP configuration missing");
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Additional settings to improve deliverability
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  try {
    const transporter = createTransport();
    if (!transporter) {
      console.error("Failed to create email transporter");
      return false;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const appName = "Heritage Repository";

    await transporter.sendMail({
      from: `${appName} <${from}>`,
      to,
      subject,
      html,
      text,
      // Headers to improve deliverability
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Nodemailer",
        Importance: "normal",
      },
    });

    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

// Email template for approved submission
export function getApprovalEmailTemplate(
  userName,
  submissionTitle,
  submissionId
) {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || "support@example.com";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #4CAF50; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Submission Approved!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Great news! Your submission has been reviewed and approved by our team.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #666666; font-size: 14px; font-weight: bold;">
                  Submission Title:
                </p>
                <p style="margin: 0; color: #333333; font-size: 16px; font-weight: 600;">
                  ${submissionTitle}
                </p>
              </div>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Your cultural content is now live and accessible to the community. Thank you for contributing to preserving and sharing cultural heritage.
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 4px; background-color: #4CAF50;">
                    <a href="${appUrl}/profile" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                      View Your Submissions
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                If you have any questions, please contact us at:
              </p>
              <p style="margin: 0; color: #4CAF50; font-size: 14px;">
                <a href="mailto:${supportEmail}" style="color: #4CAF50; text-decoration: none;">
                  ${supportEmail}
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                This email was sent to you because your submission was processed.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Cultural Heritage Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Hello ${userName},

Great news! Your submission has been reviewed and approved by our team.

Submission Title: ${submissionTitle}

Your cultural content is now live and accessible to the community. Thank you for contributing to preserving and sharing cultural heritage.

View your submissions: ${appUrl}/submissions

If you have any questions, please contact us at: ${supportEmail}

© ${new Date().getFullYear()} Cultural Heritage Platform. All rights reserved.
  `;

  return { html, text };
}

// Email template for rejected submission
export function getRejectionEmailTemplate(userName, submissionTitle, reason) {
  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const supportEmail =
    process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || "support@example.com";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Submission Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #FF9800; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Submission Update
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello ${userName},
              </p>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for your submission to our cultural heritage platform. After careful review, we are unable to approve your submission at this time.
              </p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #FF9800; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px; color: #666666; font-size: 14px; font-weight: bold;">
                  Submission Title:
                </p>
                <p style="margin: 0 0 16px; color: #333333; font-size: 16px; font-weight: 600;">
                  ${submissionTitle}
                </p>
                
                ${
                  reason
                    ? `
                <p style="margin: 0 0 8px; color: #666666; font-size: 14px; font-weight: bold;">
                  Reason:
                </p>
                <p style="margin: 0; color: #333333; font-size: 15px; line-height: 1.6;">
                  ${reason}
                </p>
                `
                    : ""
                }
              </div>
              
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                We encourage you to review our submission guidelines and consider resubmitting with the necessary adjustments. Our goal is to maintain high-quality cultural content that accurately represents and respects the communities involved.
              </p>
              
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td style="border-radius: 4px; background-color: #FF9800;">
                    <a href="${appUrl}/profile" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                      Submit Again
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                If you have any questions or need clarification, please don't hesitate to contact us:
              </p>
              <p style="margin: 0; color: #FF9800; font-size: 14px;">
                <a href="mailto:${supportEmail}" style="color: #FF9800; text-decoration: none;">
                  ${supportEmail}
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                This email was sent to you because your submission was processed.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Cultural Heritage Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
Hello ${userName},

Thank you for your submission to our cultural heritage platform. After careful review, we are unable to approve your submission at this time.

Submission Title: ${submissionTitle}

${reason ? `Reason: ${reason}` : ""}

We encourage you to review our submission guidelines and consider resubmitting with the necessary adjustments. Our goal is to maintain high-quality cultural content that accurately represents and respects the communities involved.

Submit again: ${appUrl}/submit

If you have any questions or need clarification, please contact us at: ${supportEmail}

© ${new Date().getFullYear()} Cultural Heritage Platform. All rights reserved.
  `;

  return { html, text };
}

// Helper function to send approval email
export async function sendApprovalEmail(
  userEmail,
  userName,
  submissionTitle,
  submissionId
) {
  const { html, text } = getApprovalEmailTemplate(
    userName,
    submissionTitle,
    submissionId
  );
  const appName = "Heritage Repository"

  return await sendMail({
    to: userEmail,
    subject: `${appName} - Submission Approved: ${submissionTitle}`,
    html,
    text,
  });
}

// Helper function to send rejection email
export async function sendRejectionEmail(
  userEmail,
  userName,
  submissionTitle,
  reason
) {
  const { html, text } = getRejectionEmailTemplate(
    userName,
    submissionTitle,
    reason
  );
  const appName = "Heritage Repository";

  return await sendMail({
    to: userEmail,
    subject: `${appName} - Submission Update: ${submissionTitle}`,
    html,
    text,
  });
}
