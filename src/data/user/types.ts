import { Expiring } from "../expiring";
import { AuthenticationStateType } from "../authentication-state";


export interface ExternalUserType {
  externalType: AuthenticationStateType;
}

export interface UserData extends Expiring, Partial<ExternalUserType>, Record<string, unknown> {

}

export interface ExternalUserReferenceData extends ExternalUserType {
  externalId: string;
  externalType: AuthenticationStateType;
}

export interface UserIdHistoryItem {
  userId: string;
  replacedAt: string;
}

export interface ExternalUserReference extends Expiring, ExternalUserType {
  userId: string;
  userIdHistory?: UserIdHistoryItem[]
}

export interface User extends UserData {
  userId: string;
  createdAt: string;
  updatedAt: string;
}
