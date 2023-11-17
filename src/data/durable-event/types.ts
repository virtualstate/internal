import {Expiring} from "../expiring";

export interface DurableEventSchedule {
    timezone?: string;
    // For cases where we want an event triggered after a specific time
    after?: string;
    // For cases where we want an event triggered before a specific time
    before?: string;
    immediate?: boolean;
    cron?: string;
    delay?: number | string;
    // Once delay has completed, repeat
    repeat?: boolean;
}

export interface UnknownEvent {
    type: unknown;
}

export interface DurableEventTypeData extends UnknownEvent {
    type: string;
}

export interface DurableEventData extends Record<string, unknown>, DurableEventTypeData, Expiring {
    timeStamp?: number;
    durableEventId?: string;
    schedule?: DurableEventSchedule;
    retain?: boolean;
    virtual?: boolean;
    serviceWorkerId?: string;
    createdAt?: string;
}

export interface DurableEvent extends DurableEventData {
    durableEventId: string
}