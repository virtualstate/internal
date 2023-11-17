export const attendeeData = {
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
        attendeeId: {
            type: "string",
            nullable: true
        },
        createdAt: {
            type: "string",
            nullable: true
        },
    },
    additionalProperties: true,
    required: [
        "reference"
    ]
}

export const attendee = {
    type: "object",
    properties: {
        ...attendeeData.properties,
        attendeeId: {
            type: "string",
        },
        createdAt: {
            type: "string",
        },
    },
    additionalProperties: true,
    required: [
        ...attendeeData.required,
        "attendeeId",
        "createdAt"
    ]
}