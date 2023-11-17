import { DAY_MS, getExpiringStore, MINUTE_MS } from "../expiring-kv";
import { AuthenticationState } from "./types";

const STORE_NAME = "authenticationState";

export const DEFAULT_AUTHENTICATION_STATE_EXPIRES_MS = 5 * MINUTE_MS;
export const DEFAULT_COOKIE_STATE_EXPIRES_MS = 14 * DAY_MS;
// Magic email link lasts 10 minutes
export const DEFAULT_AUTHSIGNAL_STATE_EXPIRES_MS = 12 * MINUTE_MS;

export const DEFAULT_INVITEE_STATE_EXPIRES_MS = 3 * DAY_MS;
export const DEFAULT_INVITEE_EXCHANGE_STATE_EXPIRES_MS = 3 * DEFAULT_AUTHENTICATION_STATE_EXPIRES_MS;

export const EXTERNAL_STATE_ID_SEPARATOR = "::";

export function getAuthenticationStateStore() {
  return getExpiringStore<AuthenticationState>(STORE_NAME, {
    counter: false,
  });
}
