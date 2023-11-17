import {appointmentSchema} from "../appointment";

export const appointmentAvailabilityData = {
  type: "object",
  properties: {
    ...appointmentSchema.appointmentData.properties,

  }
} as const;

export const appointment = {
  type: "object",
  properties: {
    ...appointmentAvailabilityData.properties,
    appointmentId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
  },
  required: ["appointmentId", "createdAt", "updatedAt"],
} as const;
