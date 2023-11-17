import {AuthorisationNotificationData} from "../authorisation-notification";

export type AttendeeAuthorisationType = "attendee";
export type HappeningAuthorisationType = "happening";

export type AuthorisationType = AttendeeAuthorisationType | HappeningAuthorisationType;

export interface AuthorisationData {
    type: AuthorisationType;
    attendeeId?: string;
    happeningId?: string;
    notifications?: AuthorisationNotificationData[];
}

export interface Authorisation extends AuthorisationData {
    authorisationId: string;
    createdAt: string;
    updatedAt: string;
    notifiedAt?: string;
    declinedAt?: string;
    authorisedAt?: string;
}