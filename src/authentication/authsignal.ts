import { Authsignal } from "@authsignal/node";

export const {
  AUTHSIGNAL_TENANT,
  AUTHSIGNAL_KEY,
  AUTHSIGNAL_SECRET,
  AUTHSIGNAL_REDIRECT_URL,
  AUTHSIGNAL_WEBAUTHN
} = process.env;

export const AUTHSIGNAL_BASE_URL = process.env.AUTHSIGNAL_API_URL || "https://au.signal.authsignal.com/v1";
export const AUTHSIGNAL_CHALLENGE_API_URL = process.env.AUTHSIGNAL_CHALLENGE_API_URL || "https://au.api.authsignal.com/v1";

export const authsignal = new Authsignal({
  secret: process.env.AUTHSIGNAL_SECRET,
  apiBaseUrl: AUTHSIGNAL_BASE_URL,
});