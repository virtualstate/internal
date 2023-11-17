import {getUserAuthenticationRoleStore} from "./store";
import {User} from "../user";
import {setUserAuthenticationRole} from "./set-role";

export async function getUserAuthenticationRole(userId: string) {
    const store = getUserAuthenticationRoleStore();
    return await store.get(userId);
}

export async function getUserAuthenticationRoleForUser(user: User) {
    const role = await getUserAuthenticationRole(user.userId);
    if (!role) return role;
    // Update the expiry on access to allow retention
    //
    // No access, no user, data expires
    await setUserAuthenticationRole({
        ...role,
        expiresAt: user.expiresAt
    });
    return role;
}