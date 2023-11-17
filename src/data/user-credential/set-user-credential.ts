import {DEFAULT_CREDENTIAL_EXPIRES_IN_MS, getUserCredentialStore} from "./store";
import {UserCredential, SetUserCredential} from "./types";
import {v4} from "uuid";
import {createHash} from "crypto";
import {getExpiresAt} from "../expiring-kv";

function getUserCredentialId(data: Pick<SetUserCredential, "credentialId" | "userId">): string {
  const hash = createHash("sha256");
  hash.update(data.userId);
  if (data.credentialId) {
    hash.update(data.credentialId);
  } else {
    hash.update(v4());
  }
  return hash.digest().toString("hex");
}

export async function setUserCredential(data: SetUserCredential): Promise<UserCredential> {
  const store = await getUserCredentialStore(data.userId);
  const updatedAt = new Date().toISOString();
  const userCredentialId = data.userCredentialId || getUserCredentialId(data);
  const document: UserCredential = {
    createdAt: data.createdAt || updatedAt,
    ...data,
    updatedAt,
    userCredentialId,
    // Ignore provided expiry and reset on use
    expiresAt: getExpiresAt(DEFAULT_CREDENTIAL_EXPIRES_IN_MS)
  };
  await store.set(userCredentialId, document);
  return document;
}

export async function setUserCredentials(items: SetUserCredential[]): Promise<UserCredential[]> {
  const result: UserCredential[] = [];
  // Add in serial... it's not needing to be fast right now
  for (const data of items) {
    result.push(await setUserCredential(data));
  }
  return result;
}