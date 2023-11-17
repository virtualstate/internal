export type MembershipStatus = "active" | "inactive";

export interface MembershipHistoryItem {
    status: MembershipStatus;
    statusAt?: string;
    updatedAt: string;
}

export interface MembershipData extends Record<string, unknown> {
    status?: MembershipStatus;
    reference?: string;
    name?: string;
    email?: string;
    timezone?: string;
    history?: MembershipHistoryItem[];
}

export interface Membership extends MembershipData {
    status: MembershipStatus;
    reference: string;
    membershipId: string;
    createdAt: string;
    createdByPartnerId?: string;
    createdByUserId?: string;
    updatedAt: string;
}

export type PartialMembership = MembershipData & Partial<Membership>;