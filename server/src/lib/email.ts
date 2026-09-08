import { resend } from './resend.js';
import { env } from '../env.js';
import { logger } from './logger.js';

export async function sendPasswordResetEmail(to: string, name: string, link: string) {
  if (!env.RESEND_API_KEY) {
    logger.warn({ to, link }, 'RESEND_API_KEY not set — password reset link (dev only)');
    return;
  }

  const logoUrl = `${env.APP_URL}/img/drychain-logo.png`;

  const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f9f8; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <!-- Header -->
        <tr style="background-color: #0c3227;">
          <td style="padding: 24px; text-align: left;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="${logoUrl}" alt="CAFS DryChain logo" width="40" height="40" style="border-radius: 50%; display: block; border: 2px solid #2ca873; object-fit: cover;" />
                </td>
                <td style="padding-left: 12px; vertical-align: middle;">
                  <span style="font-size: 10px; font-weight: bold; color: #2ca873; letter-spacing: 0.18em; text-transform: uppercase; display: block; line-height: 1;">CAFS</span>
                  <span style="font-size: 18px; font-weight: bold; color: #ffffff; display: block; line-height: 1.2;">DryChain</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px 24px; text-align: left;">
            <h2 style="margin-top: 0; color: #0c3227; font-size: 20px; font-weight: 600; line-height: 1.3;">Reset your password</h2>
            <p style="color: #4a5568; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
              Hi ${name},<br /><br />
              We received a request to reset the password for your CAFS DryChain account. Click the button below to set a new password.
            </p>
            
            <!-- Action Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
              <tr>
                <td align="left">
                  <a href="${link}" style="background-color: #2ca873; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(44,168,115,0.2);">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            
            <p style="color: #718096; font-size: 13px; line-height: 1.4; margin-top: 24px;">
              Note: This password reset link will expire in 1 hour. If you did not make this request, you can safely ignore this email; your account remains secure.
            </p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr style="background-color: #f7f9f8; border-top: 1px solid rgba(0,0,0,0.06);">
          <td style="padding: 24px; text-align: center; font-size: 12px; color: #718096; line-height: 1.5;">
            This is an automated system email from CAFS DryChain.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'cafsdrychain@cafsdrychain.com',
      to,
      subject: 'Reset your CAFS DryChain password',
      html: htmlContent,
    });
    if (error) {
      logger.error({ error, to }, 'Resend API returned error when sending password reset email');
    } else {
      logger.info({ id: data?.id, to }, 'Successfully sent password reset email via Resend');
    }
  } catch (err) {
    logger.error({ err, to }, 'Failed to send password reset email');
  }
}

export async function sendInviteEmail(to: string, name: string, link: string, role?: string) {
  if (!env.RESEND_API_KEY) {
    logger.warn({ to }, 'RESEND_API_KEY not set — skipping invite email');
    return;
  }

  const isNewAdmin = role?.toUpperCase() === 'ADMIN';
  const roleLabel = isNewAdmin ? 'Administrator' : 'Operator';
  const roleInfo = isNewAdmin
    ? 'As an Administrator, you have full oversight of the workspace. You are responsible for provisioning user accounts, managing hub locations, auditing system activities, and monitoring blockchain transaction status and reports.'
    : 'As an Operator, you are responsible for recording and updating batches of produce throughout the solar drying lifecycle. Your actions (e.g., registering batches, starting/ending drying, recording weight and moisture) will be verified and stored as immutable records on the blockchain.';

  const logoUrl = `${env.APP_URL}/img/drychain-logo.png`;

  const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f9f8; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 500px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
        <!-- Header -->
        <tr style="background-color: #0c3227;">
          <td style="padding: 24px; text-align: left;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="${logoUrl}" alt="CAFS DryChain logo" width="40" height="40" style="border-radius: 50%; display: block; border: 2px solid #2ca873; object-fit: cover;" />
                </td>
                <td style="padding-left: 12px; vertical-align: middle;">
                  <span style="font-size: 10px; font-weight: bold; color: #2ca873; letter-spacing: 0.18em; text-transform: uppercase; display: block; line-height: 1;">CAFS</span>
                  <span style="font-size: 18px; font-weight: bold; color: #ffffff; display: block; line-height: 1.2;">DryChain</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px 24px; text-align: left;">
            <h2 style="margin-top: 0; color: #0c3227; font-size: 20px; font-weight: 600; line-height: 1.3;">Welcome to CAFS DryChain, ${name}</h2>
            <p style="color: #4a5568; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
              An account has been created for you as an <strong>${roleLabel}</strong>. Set a password to get started.
            </p>
            
            <!-- Personalized Role Info -->
            <div style="background-color: #f7f9f8; border-radius: 12px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #2ca873;">
              <h3 style="margin-top: 0; margin-bottom: 8px; color: #0c3227; font-size: 14px; font-weight: 600;">Your Role & Responsibilities</h3>
              <p style="color: #4a5568; font-size: 13px; line-height: 1.5; margin: 0;">
                ${roleInfo}
              </p>
            </div>
            
            <!-- Sign in identity (no secret travels in this email) -->
            <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background-color: #f7f9f8; border-radius: 12px; margin-bottom: 28px;">
              <tr>
                <td style="font-size: 14px; color: #4a5568; line-height: 1.6;">
                  <strong>You will sign in with:</strong>
                  <span style="font-family: monospace; color: #0c3227; font-size: 14px;">${to}</span>
                  <p style="color: #4a5568; font-size: 13px; margin-top: 8px; margin-bottom: 0; line-height: 1.5;">
                    Choose your own password using the button below. The link can
                    be used once and expires in 72 hours.
                  </p>
                </td>
              </tr>
            </table>
            
            <!-- Action Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="left">
                  <a href="${link}" style="background-color: #2ca873; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(44,168,115,0.2);">
                    Set your password
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr style="background-color: #f7f9f8; border-top: 1px solid rgba(0,0,0,0.06);">
          <td style="padding: 24px; text-align: center; font-size: 12px; color: #718096; line-height: 1.5;">
            This invitation was sent by your workspace administrator.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'cafsdrychain@cafsdrychain.com',
      to,
      subject: 'Set up your CAFS DryChain account',
      html: htmlContent,
    });
    if (error) {
      logger.error({ error, to }, 'Resend API returned error when sending invite email');
    } else {
      logger.info({ id: data?.id, to }, 'Successfully sent invite email via Resend');
    }
  } catch (err) {
    logger.error({ err, to }, 'Failed to send invite email');
  }
}


/**
 * Deliver a public enquiry from the marketing site.
 *
 * With no CONTACT_EMAIL configured the message is logged rather than dropped,
 * the same fallback the password reset link uses, so a misconfiguration is
 * visible instead of silently losing what someone wrote.
 */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  organization?: string;
  message: string;
}) {
  const to = env.CONTACT_EMAIL;

  if (!to || !env.RESEND_API_KEY) {
    logger.warn(
      { input, reason: !to ? 'CONTACT_EMAIL not set' : 'RESEND_API_KEY not set' },
      'Contact form message could not be emailed — logged instead'
    );
    return;
  }

  const escape = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    const { data, error } = await resend.emails.send({
      from: 'cafsdrychain@cafsdrychain.com',
      to,
      reply_to: input.email,
      subject: `Website enquiry from ${input.name}`,
      html: `
        <h2 style="font-family:sans-serif;color:#0c3227;">New enquiry</h2>
        <p style="font-family:sans-serif;color:#4a5568;">
          <strong>Name:</strong> ${escape(input.name)}<br />
          <strong>Email:</strong> ${escape(input.email)}<br />
          <strong>Organization:</strong> ${escape(input.organization ?? 'Not given')}
        </p>
        <p style="font-family:sans-serif;color:#0c3227;white-space:pre-wrap;">${escape(
          input.message
        )}</p>
      `,
    });
    if (error) {
      logger.error({ error, input }, 'Resend rejected the contact message');
      return;
    }
    logger.info({ id: data?.id, to }, 'Contact message sent');
  } catch (err) {
    logger.error({ err, input }, 'Failed to send contact message');
  }
}
