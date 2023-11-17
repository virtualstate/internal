import {MembershipStatus} from "./types";
import {getConfig} from "../../config";

export const DEFAULT_MEMBERSHIP_STATUS: MembershipStatus = "active";

export interface MembershipStatusConfig {
    DEFAULT_MEMBERSHIP_STATUS?: MembershipStatus;
}

export function getDefaultMembershipStatus() {
    const config = getConfig();
    return config.DEFAULT_MEMBERSHIP_STATUS || DEFAULT_MEMBERSHIP_STATUS;
}