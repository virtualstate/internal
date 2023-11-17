export const locationData = {
  type: "object",
  properties: {
    locationName: {
      type: "string"
    },
    address: {
      type: "array",
      items: {
        type: "string"
      },
      nullable: true
    },
    countryCode: {
      type: "string",
      nullable: true
    }
  },
  required: ["locationName"],
} as const;

export const location = {
  type: "object",
  properties: {
    locationId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...locationData.properties,
  },
  required: ["locationId", "createdAt", "updatedAt", ...locationData.required],
} as const;
