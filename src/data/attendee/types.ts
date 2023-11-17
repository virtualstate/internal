export interface AttendeeData extends Record<string, unknown> {
    reference: string;
    name?: string;
    email?: string;
}

export interface Attendee extends AttendeeData {
    attendeeId: string;
    createdAt: string;
    createdByPartnerId?: string;
    createdByUserId?: string;
}

export type PartialAttendee = AttendeeData & Partial<Attendee>;