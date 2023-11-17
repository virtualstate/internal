import {
  DEFAULT_USER_EXPIRES_IN_MS,
  getExternalReferenceKey,
  getExternalUserReferenceStore, getUserExpiresAt,
  getUserStore,
} from "./store";
import { AuthenticationStateType } from "../authentication-state";
import { ok } from "../../is";
import { getExpiresAt } from "../expiring-kv";
import { addExternalUser } from "./add-user";
import { User } from "./types";
import {resetUserExpiryWithType, setExternalReference, setUser} from "./set-user";

export function getUser(userId: string) {
  const store = getUserStore();
  return store.get(userId);
}

export async function getExternalReference(externalType: AuthenticationStateType, externalId: string) {
  const store = getExternalUserReferenceStore();
  const key = getExternalReferenceKey(externalType, externalId);
  return await store.get(key);
}

export async function getExternalUser(
  externalType: AuthenticationStateType,
  externalId: string,
  existingUser?: User
): Promise<User> {
  let reference = await getExternalReference(externalType, externalId);
  if (!reference) {
    // console.log(`Adding external user for ${externalType}`);
    return addExternalUser({
      externalId,
      externalType,
    }, existingUser);
  }
  ok(
    reference.externalType === externalType,
    "Expected external user type to match"
  );
  ok(reference.userId, "Expected external user id to be available");

  if (existingUser && reference.userId !== existingUser.userId) {
    reference = await setExternalReference({
      ...reference,
      // Allow restoring userId or data at a later date
      // Implementing applications may be able to provide this
      // functionality
      userIdHistory: [
          ...(reference.userIdHistory ?? []),
        {
          userId: reference.userId,
          replacedAt: new Date().toISOString()
        }
      ],
      // Must provide the externalId to be able to update
      externalId,
      userId: existingUser.userId
    });
  }

  let user = existingUser ?? await getUser(reference.userId);

  if (existingUser && user.externalType !== externalType && user.externalType === "anonymous") {
    user = await resetUserExpiryWithType(user, externalType);
  } else if (!user) {
    // User expired, reset
    return addExternalUser({
      externalId,
      externalType
    });
  }

  // If user is not expiring, persist the external user reference
  // If user is expiring, reset both to default expiring time
  //
  // This follows the same pattern as createCookieAuth
  if (user.expiresAt) {
    const defaultExpiresAt = getUserExpiresAt(user.externalType);

    // console.log(`Updating expires at of external user for ${externalType}, before ${reference.expiresAt}, after ${expiresAt}`);

    // This will give us the total time from when the user was created, till it will expire
    const defaultExpiresIn = new Date(defaultExpiresAt).getTime() - Date.now();

    // This is the time remaining until the user currently expires
    const expiresIn = new Date(user.expiresAt).getTime() - Date.now();

    // If there is less than half the time remaining, let's give the user more time
    const resetExpiry = expiresIn < (defaultExpiresIn / 2);

    if (resetExpiry) {
      user = await setUser({
        ...user,
        expiresAt: defaultExpiresAt,
      });
      await setExternalReference({
        ...reference,
        expiresAt: defaultExpiresAt,
        externalId
      });
    }
  }

  return user;
}
