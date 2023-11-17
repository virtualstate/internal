
const statusEnum = [
    "active",
    "inactive"
];

export const membershipHistoryItem = {
    type: "object",
    properties: {
        status: {
            type: "string",
            nullable: true,
            enum: statusEnum
        },
        statusAt: {
            type: "string",
            nullable: true
        },
        updatedAt: {
            type: "string"
        }
    },
    required: ["updatedAt"]
}

export const membershipData = {
    type: "object",
    properties: {
        reference: {
            type: "string"
        },
        name: {
            type: "string",
            nullable: true
        },
        email: {
            type: "string",
            nullable: true
        },
        membershipId: {
            type: "string",
            nullable: true
        },
        createdAt: {
            type: "string",
            nullable: true
        },
        status: {
          type: "string",
          enum: statusEnum,
          nullable: true
        },
        history: {
            type: "array",
            items: membershipHistoryItem,
            nullable: true
        }
    },
    additionalProperties: true,
    required: [
        "reference"
    ]
}

export const membership = {
    type: "object",
    properties: {
        ...membershipData.properties,
        membershipId: {
            type: "string",
        },
        createdAt: {
            type: "string",
        },
        status: {
            type: "string",
            enum: statusEnum
        },
    },
    additionalProperties: true,
    required: [
        ...membershipData.required,
        "membershipId",
        "createdAt",
        "status"
    ]
}