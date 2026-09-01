/**
 * The two things a relay failure can be.
 *
 * Provider adapters throw `RelayFailure` so the runner never has to know what
 * a Printful error code means. Anything else that escapes an adapter is
 * treated as transient — retrying a hopeless order wastes a few requests,
 * while giving up on a recoverable one loses a paid customer their goods.
 */

import type { FailureKind } from '$lib/server/db/fulfillment-relays';

export class RelayFailure extends Error {
  readonly kind: FailureKind;
  /** Raw provider response, shown to the operator on the admin screen. */
  readonly response: string | null;

  constructor(kind: FailureKind, message: string, response: string | null = null, cause?: unknown) {
    super(message);
    this.name = 'RelayFailure';
    this.kind = kind;
    this.response = response;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }

  /** The provider could not answer. Try again later. */
  static transient(message: string, response: string | null = null, cause?: unknown): RelayFailure {
    return new RelayFailure('transient', message, response, cause);
  }

  /** The provider answered, and the answer is no. Only a human changes this. */
  static permanent(message: string, response: string | null = null, cause?: unknown): RelayFailure {
    return new RelayFailure('permanent', message, response, cause);
  }
}

/**
 * Normalise anything thrown by an adapter into a RelayFailure.
 */
export function toRelayFailure(error: unknown): RelayFailure {
  if (error instanceof RelayFailure) return error;
  if (error instanceof Error) return RelayFailure.transient(error.message, null, error);
  return RelayFailure.transient(String(error));
}
