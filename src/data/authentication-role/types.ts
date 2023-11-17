import {Expiring} from "../expiring";

export type SystemRole = "system";

declare global {
    interface AuthenticationRoles extends Record<SystemRole, SystemRole> {

    }
}

export type AuthenticationRole =
  | "moderator"
  | "admin"
  | "owner"
  | "member"
  | "booster"
  | "industry"
  | "developer"
  | "coordinator"
  | "partner"
  | "anonymous"
  | SystemRole
  // Allows typing of authentication roles from the global scope.
  // keys from multiple interface definitions in global will merge together
  | keyof AuthenticationRoles;

export interface UserAuthenticationRoleData extends Expiring {
    userId: string;
    roles: AuthenticationRole[];
}

export interface UserAuthenticationRole extends UserAuthenticationRoleData {
    createdAt: string;
    updatedAt: string;
}

export type PartialUserAuthenticationRole = UserAuthenticationRoleData & Partial<UserAuthenticationRole>