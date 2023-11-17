import {getExpiringStore} from "../expiring-kv";
import {UserAuthenticationRole} from "./types";

const STORE_NAME = "userRole";

export function getUserAuthenticationRoleStore() {
    return getExpiringStore<UserAuthenticationRole>(STORE_NAME, {
        counter: false
    })
}