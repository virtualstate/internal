import {ExternalUserReference, ExternalUserReferenceData, User, UserData} from "./types";
import { v4 } from "uuid";
import { getExpiresAt } from "../expiring-kv";
import {
  DEFAULT_USER_EXPIRES_IN_MS,
  getExternalReferenceKey,
  getExternalUserReferenceStore,
  getUserStore
} from "./store";
import {AuthenticationStateType} from "../authentication-state";

export async function setUser(data: UserData & Partial<User>) {
  const store = getUserStore();
  const userId = data.userId || v4();
  const createdAt = data.createdAt || new Date().toISOString();
  const user: User = {
    ...data,
    userId,
    createdAt,
    updatedAt: createdAt,
    expiresAt: getExpiresAt(DEFAULT_USER_EXPIRES_IN_MS, data.expiresAt),
  };
  await store.set(userId, user);
  return user;
}

export async function setExternalReference(data: ExternalUserReference & ExternalUserReferenceData) {
  const { externalId, externalType, ...rest } = data;
  const key = getExternalReferenceKey(externalType, externalId);
  const reference: ExternalUserReference = {
    ...rest,
    externalType,
  };
  const store = getExternalUserReferenceStore();
  await store.set(key, reference);
  return reference;
}

/**
 * Used in the case where a user was anonymous, and is being converted to a specific user type
 * @param user
 * @param externalType
 */
export async function resetUserExpiryWithType(user: User, externalType: AuthenticationStateType) {
  return await setUser({
    ...user,
    // No longer anonymous
    externalType: externalType,
    // Reset expiry to default
    expiresAt: getExpiresAt(DEFAULT_USER_EXPIRES_IN_MS),
  });
}