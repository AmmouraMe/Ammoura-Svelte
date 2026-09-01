/**
 * Structured Printful API errors.
 *
 * The relay has to decide whether a failure is worth retrying, and "worth
 * retrying" is a property of the HTTP status and the Printful error code, not
 * of an error message. A bare `Error('HTTP 500')` throws that away, so every
 * failed request carries the status, Printful's own code and the raw response
 * body instead — the last of which is what the admin screen shows an operator
 * who has to work out why an order never shipped.
 */

export interface PrintfulApiErrorInit {
  /** HTTP status, or null when the request never got a response. */
  status?: number | null;
  /** Printful's own `code` field from the response envelope. */
  printfulCode?: number | null;
  /** Raw response body, when one could be read. */
  body?: string | null;
  cause?: unknown;
}

export class PrintfulApiError extends Error {
  readonly status: number | null;
  readonly printfulCode: number | null;
  readonly body: string | null;

  constructor(message: string, init: PrintfulApiErrorInit = {}) {
    super(message);
    this.name = 'PrintfulApiError';
    this.status = init.status ?? null;
    this.printfulCode = init.printfulCode ?? null;
    this.body = init.body ?? null;
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
  }
}

/**
 * Statuses that mean "Printful could not answer right now", as opposed to
 * "Printful understood and refused".
 *
 * 429 is in this list on purpose: rate limiting is the most common transient
 * failure a burst of orders produces, and backing off is exactly the right
 * response to it.
 */
const TRANSIENT_STATUSES = new Set([408, 409, 423, 425, 429, 500, 502, 503, 504, 507, 522, 524]);

/**
 * Decide whether a Printful failure should be retried.
 *
 * Permanent means no number of retries fixes it: a malformed order, an
 * unavailable variant, a revoked API key. Those go straight to the dead-letter
 * path so a human sees them, instead of burning six attempts first.
 *
 * Anything unrecognised is treated as transient. Retrying a permanent failure
 * costs a few pointless requests; giving up on a transient one costs a
 * customer their order.
 */
export function isTransientPrintfulFailure(error: unknown): boolean {
  if (error instanceof PrintfulApiError) {
    // No status at all means the request itself failed — DNS, TLS, timeout,
    // a dropped connection. Always worth another go.
    if (error.status === null) return true;
    if (TRANSIENT_STATUSES.has(error.status)) return true;
    // Every other 4xx is Printful telling us the request is wrong.
    if (error.status >= 400 && error.status < 500) return false;
    return error.status >= 500;
  }

  // A raw TypeError is what fetch throws when the network fails.
  if (error instanceof TypeError) return true;

  return true;
}
