import { AuthenticationState, AuthenticationStateData } from "./types";
import {
  DEFAULT_AUTHENTICATION_STATE_EXPIRES_MS,
  getAuthenticationStateStore,
} from "./store";
import { getExpiresAt } from "../expiring-kv";
import {v4} from "uuid";
import {getMaybePartner, getMaybeUser} from "../../authentication";

export async function setAuthenticationState(
  data: AuthenticationStateData & Partial<AuthenticationState>
) {
  const stateId = data.stateId || v4();
  const stateKey = stateId;
  const createdAt = data.createdAt || new Date().toISOString();
  let createdBy: Partial<AuthenticationState> = {};
  if (!(data.createdAt || data.createdByUserId || data.createdByOrganisationId)) {
    createdBy = {
      createdByUserId: getMaybeUser()?.userId,
      createdByOrganisationId: getMaybePartner()?.organisationId
    }
  }
  const state: AuthenticationState = {
    createdAt,
    ...data,
    ...createdBy,
    stateId,
    stateKey,
    expiresAt: getExpiresAt(
      DEFAULT_AUTHENTICATION_STATE_EXPIRES_MS,
      data.expiresAt
    ),
  };
  const store = getAuthenticationStateStore();
  await store.set(stateId, state);
  return state;
}
