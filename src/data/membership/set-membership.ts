import {getMembershipIdentifierCounterStore, getMembershipStore} from "./store";
import {Membership, PartialMembership} from "./types";
import {getMaybePartner, getMaybeUser} from "../../authentication";
import {v4} from "uuid";
import {isNumberString} from "../../is";
import {getConfig} from "../../config";
import {getDefaultMembershipStatus} from "./membership-status";

export interface SetMembershipConfig {
    createMembershipId?(data: PartialMembership): string;
    createMembershipReference?(data: PartialMembership): string | Promise<string>;
}

const {
    MEMBERSHIP_IDENTIFIER_COUNTER = "counter",
    MEMBERSHIP_REFERENCE_PREFIX = "",
    MEMBERSHIP_REFERENCE_LENGTH
} = process.env;

const DEFAULT_MEMBERSHIP_REFERENCE_LENGTH = 6;

export async function setMembership(data: PartialMembership) {
    const config = getConfig();
    const store = getMembershipStore();
    let reference = data.reference
    if (!reference) {
        reference = await createMembershipReference();
    }
    const membershipId = data.membershipId || v4();
    const createdAt = data.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();
    const createdByPartnerId = getMaybePartner()?.partnerId;
    const createdByUserId = getMaybeUser()?.userId;
    const status = data.status || getDefaultMembershipStatus();
    const membership: Membership = {
        ...data,
        history: data.history || [
            {
                status,
                statusAt: updatedAt,
                updatedAt
            }
        ],
        status,
        reference,
        membershipId,
        createdAt,
        createdByPartnerId,
        createdByUserId,
        updatedAt
    };
    await store.set(membershipId, membership);
    return membership;

    async function createMembershipReference() {
        if (config.createMembershipReference) {
            return config.createMembershipReference(data);
        }
        const counter = await incrementMembershipIdentifier();
        const length = isNumberString(MEMBERSHIP_REFERENCE_LENGTH) ? +MEMBERSHIP_REFERENCE_LENGTH : DEFAULT_MEMBERSHIP_REFERENCE_LENGTH;
        return `${MEMBERSHIP_REFERENCE_PREFIX}${counter.toString().padStart(length, "0")}`;
    }
}

export async function addMembership(data: PartialMembership) {
    return setMembership(data);
}

export async function incrementMembershipIdentifier() {
    const store = await getMembershipIdentifierCounterStore();
    return await store.increment(MEMBERSHIP_IDENTIFIER_COUNTER);
}