import {DEFAULT_CREDENTIAL_EXPIRES_IN_MS, getUserCredentialStore} from "./store";
import {UserCredential, SetUserCredential, UserCredentialIdentifiers} from "./types";
import {v4} from "uuid";
import {createHash} from "crypto";
import {getExpiresAt} from "../expiring-kv";

const {
  IS_LOCAL,
  IS_DEMO
} = process.env;

export async function deleteUserCredential(data: UserCredentialIdentifiers): Promise<void> {
  // Only local and demo can delete for now
  // until operation authz is implemented https://github.com/opennetwork/logistics/issues/39
  if (!(IS_LOCAL || IS_DEMO)) {
    return;
  }
  const store = await getUserCredentialStore(data.userId);
  await store.delete(data.userCredentialId);
}

export async function deleteUserCredentials(items: UserCredentialIdentifiers[]): Promise<void> {
  // Delete in serial... it's not needing to be fast right now
  for (const data of items) {
    await deleteUserCredential(data)
  }
}