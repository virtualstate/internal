import {HappeningData, HappeningEventData} from "../happening";

export type AppointmentType =
    | "appointment"
    | string

export type AppointmentStatus =
    | "pending"
    | "confirmed"
    | "scheduled"
    | "deferred"
    | "cancelled"
    | "completed"
    | string

export interface AppointmentHistoryItem extends HappeningEventData {
  status: AppointmentStatus;
  statusAt?: string;
  updatedAt: string;
}

export interface AppointmentData extends HappeningData {
  type: AppointmentType
  organisationId?: string;
  attendees: string[];
  attended?: boolean;
  attendedAt?: string;
  status?: AppointmentStatus;
  history?: AppointmentHistoryItem[];
  locationId?: string;
}

export interface Appointment extends AppointmentData {
  appointmentId: string;
  createdAt: string;
  updatedAt: string;
  status: AppointmentStatus;
  statusAt: string;
  history: AppointmentHistoryItem[];
}
