import {setMembership} from "./set-membership";
import {Membership, MembershipData} from "./types";

export async function createMembershipReferences(input: (string | MembershipData)[]): Promise<Membership[]> {
    const membershipInput = parseMembershipReferences(input);
    return membershipInput.length ? await Promise.all(
        membershipInput.map(setMembership)
    ) : [];
}

export function getMembershipReferenceMap(memberships: Membership[]) {
    return new Map(
        memberships.map(membership => [membership.reference, membership])
    );
}

export function parseMembershipReferences(memberships: (MembershipData | string)[]): MembershipData[] {
    return [
        ...(memberships ?? []).map(membership => {
            if (typeof membership === "string") {
                return { reference: membership }
            }
            return membership;
        })
    ]
        .filter(
            (value, index, array) => {
                const before = array.slice(0, index);
                return !before.find(other => other.reference === value.reference);
            }
        )
}