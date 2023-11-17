import {AppointmentData} from "../appointment";

export interface AppointmentAvailabilityData extends AppointmentData {

}

export interface AppointmentAvailability extends AppointmentAvailabilityData {
  appointmentAvailabilityId: string;
  createdAt: string;
  updatedAt: string;
}
