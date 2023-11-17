import {attendeeSchema} from "../attendee";
import {Partner, partnerSchema} from "../partner";
import {Organisation, organisationSchema} from "../organisation";
import {HappeningTree} from "./types";

export const happeningTreeData = {
  type: "object",
  properties: {
    type: {
      type: "string",
      nullable: true,
    },
    attendees: {
      type: "array",
      items: attendeeSchema.attendeeData,
      nullable: true,
    },
    children: {
      type: "array",
      items: {},
      nullable: true,
    },
  },
};
happeningTreeData.properties.children.items = happeningTreeData;

export const happeningTreeNoKey = {
  type: "object",
  properties: {
    type: {
      type: "string"
    },
    parent: {},
    children: {},
    attendees: {
      type: "array",
      items: attendeeSchema.attendee
    },
    partnerId: {
      type: "string",
      nullable: true,
    },
    partner: {
      ...partnerSchema.partner,
      nullable: true
    },
    organisation: {
      ...organisationSchema.organisation,
      nullable: true
    },
    userId: {
      type: "string",
      nullable: true,
    },
  },
  required: [
      "type",
      "children",
      "attendees"
  ]
}

export const happeningTree = {
  type: "object",
  properties: {
    ...happeningTreeNoKey.properties,
    id: {
      type: "string",
    },
  },
  required: ["id", ...happeningTreeNoKey.required]
}

happeningTree.properties.children = {
  type: "array",
  items: happeningTree,
  nullable: true
};
happeningTree.properties.parent = {
  ...happeningTree,
  nullable: true
};
happeningTreeNoKey.properties.children = {
  type: "array",
  items: happeningTree,
  nullable: true
};
happeningTreeNoKey.properties.parent = {
  ...happeningTree,
  nullable: true
};

export const happeningOptionData = {
  type: "object",
  properties: {
    type: {
      type: "string",
      nullable: true,
    }
  },
  additionalProperties: true
}

export const happeningEventData = {
  type: "object",
  properties: {
    options: {
      type: "array",
      items: happeningOptionData,
      nullable: true,
    },
    startAt: {
      type: "string",
      nullable: true,
    },
    startedAt: {
      type: "string",
      nullable: true,
    },
    endAt: {
      type: "string",
      nullable: true,
    },
    endedAt: {
      type: "string",
      nullable: true,
    },
    createdAt: {
      type: "string",
      nullable: true,
    },
    url: {
      type: "string",
      nullable: true,
    },
    title: {
      type: "string",
      nullable: true,
    },
    description: {
      type: "string",
      nullable: true,
    },
    type: {
      type: "string",
      nullable: true,
    },
    reference: {
      type: "string",
      nullable: true,
    },
    timezone: {
      type: "string",
      nullable: true,
    },
  },
} as const;


export const happeningData = {
  type: "object",
  properties: {
    ...happeningEventData.properties,
    attendees: {
      type: "array",
      items: {
        type: "string"
      },
      nullable: true,
    }
  },
} as const;

export const happening = {
  type: "object",
  properties: {
    happeningId: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
    ...happeningData.properties,
  },
  required: ["happeningId", "createdAt", "updatedAt"],
} as const;
