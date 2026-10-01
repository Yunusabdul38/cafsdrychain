import { Resend } from 'resend';
import { env } from '../env.js';

let client: Resend | null = null;

export function resend(): Resend {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  return (client ??= new Resend(env.RESEND_API_KEY));
}
