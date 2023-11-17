

export const identifier = {
  type: "object",
  properties: {
    type: {
      type: "string",
    },
    identifier: {
      type: "string",
    },
    identifiedAt: {
      type: "string",
    }
  },
  required: ["type", "identifier", "identifiedAt"],
} as const;
