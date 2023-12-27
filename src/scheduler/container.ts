export interface SchedulerFn {
    (): void | Promise<void>
}

export type SchedulerTaskPriority = "user-blocking" | "user-visible" | "background";

// TODO
export interface TaskSignal extends AbortSignal {
    priority: SchedulerTaskPriority
}

export interface SchedulerTaskOptions {
    priority?: SchedulerTaskPriority | string;
    signal?: AbortSignal | TaskSignal;
    delay?: number;
}

export class Scheduler {

    async postTask(callback: SchedulerFn, options?: SchedulerTaskOptions) {
        if (options?.delay) {
            await this.wait(options.delay)
        }
        if (options?.signal?.aborted) {
            throw new Error("Aborted");
        }
        return callback();
    }

    async wait(delay: number | string) {
        if (typeof delay === "string") {
            // TODO wait for event
        } else {
            return new Promise<void>(resolve => setTimeout(resolve, delay));
        }
    }

}
