export const serviceData = {
  type: "object",
  properties: {
    serviceName: {
      type: "string",
    },
    organisationText: {
      type: "string",
      nullable: true
    },
    organisationName: {
      type: "string",
      nullable: true
    },
    organisationId: {
      type: "string",
      nullable: true
    },
    generic: {
      type: "boolean",
      nullable: true,
    },
    public: {
      type: "boolean",
      nullable: true,
    },
  },
  required: ["serviceName"],
} as const;

export const service = {
  type: "object",
  properties: {
    serviceId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...serviceData.properties,
  },
  required: ["serviceId", "createdAt", "updatedAt", ...serviceData.required],
} as const;
