export const changeOptionData = {
  type: "object",
  properties: {
    type: {
      type: "string",
      nullable: true,
    }
  },
  additionalProperties: true
}

export const changeTarget = {
  type: "object",
  properties: {
    type: {
      type: "string"
    },
    id: {
      type: "string"
    }
  },
  required: ["type", "id"]
};

export const changeData = {
  type: "object",
  properties: {
    options: {
      type: "array",
      items: changeOptionData,
      nullable: true,
    },
    data: {
      type: "object",
      properties: {},
      additionalProperties: true
    }
  }
};

export const change = {
  type: "object",
  properties: {
    type: {
      type: "string"
    },
    target: changeTarget,
    changeId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...changeData.properties
  },
  required: ["changeId", "createdAt", "updatedAt", "type", "target"],
} as const;
