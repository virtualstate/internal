import {PartialUserAuthenticationRole, UserAuthenticationRole, UserAuthenticationRoleData} from "./types";
import {getUserAuthenticationRoleStore} from "./store";
import {v4} from "uuid";

export async function setUserAuthenticationRole(data: PartialUserAuthenticationRole) {
    const store = getUserAuthenticationRoleStore();
    const updatedAt = new Date().toISOString()
    const role: UserAuthenticationRole = {
        ...data,
        createdAt: data.createdAt || updatedAt,
        updatedAt
    };
    await store.set(role.userId, role);
    return role;
}