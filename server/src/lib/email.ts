import { resend } from './resend.js';
import { env } from '../env.js';
import { logger } from './logger.js';

export async function sendInviteEmail(to: string, name: string, tempPassword: string) {
  if (!env.RESEND_API_KEY) {
    logger.warn({ to }, 'RESEND_API_KEY not set — skipping invite email');
    return;
  }
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject: 'Your CAFS DryChain account',
      html: `
        <div style="font-family:sans-serif;max-width:480px">
          <h2>Welcome to CAFS DryChain, ${name}</h2>
          <p>An account has been created for you. Sign in and set a new password.</p>
          <p><strong>Email:</strong> ${to}<br/>
             <strong>Temporary password:</strong> <code>${tempPassword}</code></p>
          <p><a href="${env.APP_URL}/login">Sign in</a></p>
        </div>`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send invite email');
  }
}
