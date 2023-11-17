import { getKeyValueStore } from "../kv";
import { UserCredential } from "./types";
import {DEFAULT_USER_EXPIRES_IN_MS} from "../user";

export const DEFAULT_CREDENTIAL_EXPIRES_IN_MS = DEFAULT_USER_EXPIRES_IN_MS;

const STORE_NAME = "userCredential" as const;

export function getUserCredentialStore(userId: string) {
  return getKeyValueStore<UserCredential>(STORE_NAME, {
    counter: false,
    // Partition by userId
    prefix: `userId::${userId}::`
  });
}