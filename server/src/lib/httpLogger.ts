import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp, startTime } from 'pino-http';
import { logger } from './logger.js';

/** Anything slower than this is logged even when it succeeds. */
const SLOW_MS = 3000;

/** Polled every few seconds by every open tab; logging them buries everything else. */
const POLLING = new Set(['/api/auth/heartbeat', '/health']);

/** When pino-http started timing this response. */
const startedAt = (res: ServerResponse) =>
  (res as ServerResponse & { [startTime]?: number })[startTime];

/** Express runs over these same objects, so res.locals is there at runtime. */
type WithLocals = ServerResponse & { locals?: { logReason?: string } };

/** `POST /api/users/x/invite 502 10527ms — The invitation email could not be sent…` */
function line(req: IncomingMessage, res: ServerResponse, responseTime: number): string {
  const reason = (res as WithLocals).locals?.logReason;
  const base = `${req.method} ${req.url} ${res.statusCode} ${Math.round(responseTime)}ms`;
  return reason ? `${base} — ${reason}` : base;
}

/**
 * One line per request worth reading — route, status, duration and, for a
 * refusal, the reason — and nothing for the rest. No headers.
 *
 *   5xx         error   something broke on our side
 *   4xx         warn    a request we refused, with the reason
 *   slow 2xx    warn    it worked, but took over SLOW_MS
 *   401, 2xx    debug   routine: expired-token renewal and normal traffic
 *                       (a 401 from /api/auth — a failed login — stays warn)
 *
 * Set LOG_LEVEL=debug to see the routine traffic too.
 */
export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.method === 'OPTIONS' || POLLING.has((req.url ?? '').split('?')[0]),
  },
  customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (err || res.statusCode >= 500) return 'error';
    // Outside /api/auth a 401 is an access token expiring, which the client renews.
    if (res.statusCode === 401 && !(req.url ?? '').startsWith('/api/auth/')) return 'debug';
    if (res.statusCode >= 400) return 'warn';
    const began = startedAt(res);
    if (began !== undefined && Date.now() - began > SLOW_MS) return 'warn';
    return 'debug';
  },
  customSuccessMessage: (req, res, responseTime) => line(req, res, responseTime),
  // Typed without the response time pino-http passes at runtime, so it is
  // derived from the same start stamp the level check uses.
  customErrorMessage: (req, res) => line(req, res, Date.now() - (startedAt(res) ?? Date.now())),
  // Everything is in the message. A server error's details are logged by
  // errorHandler, and pino-http would otherwise attach the full request.
  customSuccessObject: () => ({}),
  customErrorObject: () => ({}),
  serializers: { req: () => undefined, res: () => undefined },
});
