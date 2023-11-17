import {Expiring} from "../expiring";
import {AuthenticatorTransportFuture} from "@simplewebauthn/typescript-types";

export interface UserCredentialData extends Expiring, Record<string, unknown> {
  userId: string;
  credentialId: string;
  credentialPublicKey?: string;
  credentialCounter?: number;
  deviceId?: string;
  name?: string;
  verifiedAt?: string;
  authenticatorUserId?: string;
  authenticatorType?: "credential" | "payment" | string;
  authenticatorTransports?: AuthenticatorTransportFuture[];
}

export interface UserCredential extends UserCredentialData {
  userCredentialId: string;
  createdAt: string;
  updatedAt: string;
}

export type SetUserCredential = UserCredentialData & Pick<UserCredential, "userId"> & Partial<UserCredential>;

export type UserCredentialIdentifiers = Pick<UserCredential, "userCredentialId" | "userId">