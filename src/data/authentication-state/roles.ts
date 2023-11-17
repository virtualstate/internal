import {isLike} from "../../is";
import {AuthenticationRole, SystemRole} from "../authentication-role";
import {getConfig} from "../../config";

export type NamedRolesConfig = Record<Exclude<AuthenticationRole, SystemRole>, string>;
export type AlternativeRoleNamesConfig = Partial<Record<AuthenticationRole, string[]>>;

export interface AuthenticationRoleConfig {
  namedRoles: NamedRolesConfig;
  alternativeRoleNames: AlternativeRoleNamesConfig;
  roles: AuthenticationRole[]
}

export const DEFAULT_NAMED_ROLES: NamedRolesConfig = {
  admin: "Admin",
  industry: "Industry",
  member: "Member",
  moderator: "Moderator",
  owner: "Owner",
  booster: "Discord Server Booster",
  developer: "Software Developer",
  coordinator: "Coordinator",
  partner: "Partner",
  anonymous: "Anonymous",
};

export const DEFAULT_ALTERNATIVE_ROLE_NAMES: AlternativeRoleNamesConfig = {
  member: ["Contributor", "Subscriber"],
  booster: ["Server Booster"],
  developer: ["Software Engineer", "Developer"],
  coordinator: [
    "Community Coordinator",
    "Community Organiser",
    "Community Organizer",
  ],
  industry: ["Verified Industry"],
};

export function getAuthenticationRoleConfig(): AuthenticationRoleConfig {
  const { namedRoles = DEFAULT_NAMED_ROLES, alternativeRoleNames = DEFAULT_ALTERNATIVE_ROLE_NAMES } = getConfig()
  return {
    namedRoles,
    alternativeRoleNames,
    roles: Object.keys(namedRoles).filter<AuthenticationRole>(isLike)
  }
}

export function isAuthenticationRole(key: string): key is AuthenticationRole {
  const stringRoles: string[] = getAuthenticationRoleConfig().roles;
  return stringRoles.includes(key);
}

export function getAuthenticationRole(
  name: string,
  config?: AuthenticationRoleConfig
): AuthenticationRole | undefined {
  const lowerName = name.toLowerCase();
  if (isAuthenticationRole(lowerName)) return lowerName;
  const {
    roles,
    namedRoles,
    alternativeRoleNames
  } = config ?? getAuthenticationRoleConfig();
  for (const key of roles) {
    if (key === "system") continue;
    if (name === key || lowerName === key) return key;
    for (const value of [
      namedRoles[key],
      ...(alternativeRoleNames[key] ?? []),
    ]) {
      if (name === value) return key;
      const lower = value.toLowerCase();
      if (lowerName === lower) return key;
    }
  }
  return undefined;
}

export function getAuthenticationRoles(names: string[]): AuthenticationRole[] {
  const config = getAuthenticationRoleConfig()
  const result = names
    .filter(Boolean)
    .map(name => getAuthenticationRole(name, config))
    .filter(Boolean);
  return [...new Set(result)];
}

