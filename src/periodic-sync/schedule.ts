import type {DurableEventSchedule} from "../data";
import type {DurablePeriodicSyncManager} from "./manager";
import {DURABLE_EVENTS_INTERNAL_SCHEDULE_DEFAULT_DELAY, getConfig} from "../config";
import {getPeriodicSyncTagRegistration} from "./manager";
import {DAY_MS, HOUR_MS, MINUTE_MS, MONTH_MS} from "../data";
import {isNumberString} from "../is";

export interface PeriodicSyncSchedule {
    tag: string;
    schedule: DurableEventSchedule
}

export interface GetPeriodicSyncScheduleFn {
    (manager: DurablePeriodicSyncManager): Promise<PeriodicSyncSchedule[]>
}

export interface PeriodicSyncScheduleConfig {
    getPeriodicSyncSchedule?: GetPeriodicSyncScheduleFn;
    getCronExpressionFromInterval?(interval: number): string | undefined;
}

export async function getPeriodicSyncSchedule(manager?: DurablePeriodicSyncManager) {
    if (!manager) {
        const { periodicSync } = await import("./manager");
        return getPeriodicSyncSchedule(periodicSync);
    }
    const config = getConfig();
    const fn: GetPeriodicSyncScheduleFn = config.getPeriodicSyncSchedule ?? getDefaultPeriodicSyncSchedule;
    return fn(manager);
}

function getCronExpressionFromInterval(interval: number) {
    const config = getConfig();
    if (config.getCronExpressionFromInterval) {
        return config.getCronExpressionFromInterval(interval);
    }
    if (interval < HOUR_MS) {
        return "0,15,30,45 * * * *";
    }
    if (interval <= DAY_MS) {
        return "0 0 * * *";
    }
    if (interval <= MONTH_MS) {
        return "0 0 1 * *";
    }
    return undefined;
}

export async function getDefaultDurableEventScheduleForPeriodicSyncTag(tag: string): Promise<DurableEventSchedule> {
    const { minInterval, createdAt } = await getPeriodicSyncTagRegistration(tag);
    if (!minInterval) {
        // Default Periodic Sync
        let delay = 60000;
        if (isNumberString(DURABLE_EVENTS_INTERNAL_SCHEDULE_DEFAULT_DELAY)) {
            delay = +DURABLE_EVENTS_INTERNAL_SCHEDULE_DEFAULT_DELAY;
        }
        return {
            delay,
            repeat: true
        };
    }
    const cron = getCronExpressionFromInterval(minInterval);
    if (cron) {
        return {
            cron
        }
    }
    return {
        delay: minInterval,
        repeat: true
    };
}

export async function getDefaultPeriodicSyncSchedule(manager: DurablePeriodicSyncManager): Promise<PeriodicSyncSchedule[]> {
    const tags = await manager.getTags();
    return await Promise.all(
        tags.map(
            async (tag): Promise<PeriodicSyncSchedule> => {
                return {
                    tag,
                    schedule: await getDefaultDurableEventScheduleForPeriodicSyncTag(tag),
                }
            }
        )
    )
}