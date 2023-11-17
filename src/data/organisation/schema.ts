export const organisationBaseData = {
  type: "object",
  properties: {
    countryCode: {
      type: "string",
      nullable: true,
    },
    location: {
      type: "string",
      nullable: true,
    },
    website: {
      type: "string",
      nullable: true,
    },
  },
  additionalProperties: true
};

export const organisationData = {
  type: "object",
  properties: {
    ...organisationBaseData.properties,
    organisationName: {
      type: "string",
    },
  },
  additionalProperties: true,
  required: ["organisationName"],
} as const;

export const organisation = {
  type: "object",
  properties: {
    organisationId: {
      type: "string",
    },
    ...organisationData.properties,
    accessToken: {
      type: "string",
      nullable: true,
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    approved: {
      type: "boolean",
      nullable: true,
    },
    approvedAt: {
      type: "string",
      nullable: true,
    },
    approvedByUserId: {
      type: "string",
      nullable: true,
    },
  },
  additionalProperties: true,
  required: [
    ...organisationData.required,
    "organisationId",
    "createdAt",
    "updatedAt",
  ],
} as const;
