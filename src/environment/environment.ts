import { EventCallback, Event, EventTarget } from "../events/events"
import { EnvironmentEventTarget } from "./events"
import { error as traceError } from "../tracing/tracing"
import { EnvironmentEvents } from "../events/events"

export * from "./events"
export * from "./context"

export interface Environment extends EnvironmentEventTarget {
    name: string
    runInAsyncScope(fn: () => void | Promise<void>): Promise<void>
    configure?(): void | Promise<void>
    postConfigure?(): void | Promise<void>
    addEnvironment(environment: Environment): void
    addService(promise: Promise<unknown>): void
    waitForServices(): Promise<void>
    end(): Promise<void>
}

export class Environment extends EnvironmentEventTarget implements Environment {

    #services: Promise<unknown>[] = []
    #environments: Environment[] = []

    constructor(public name: string) {
        super()
    }

    async runInAsyncScope(fn: () => void | Promise<void>): Promise<void> {
        await fn()
    }

    addEnvironment(environment: Environment): void {
        if (!this.#environments.includes(environment)) {
            this.#environments.push(environment)
            const remove = () => this.#removeEnvironment(environment)
            environment.addEventListener("end", remove)
            this.addEventListener("end", remove)
        }
    }

    #removeEnvironment = (environment: Environment): void => {
        const index = this.#environments.indexOf(environment)
        if (index > -1) {
            this.#environments.splice(index, 1)
        }
    }

    addService(promise: Promise<unknown>): void {
        if (!this.#services.includes(promise)) {
            // Ensure we do not trigger an unhandled promise, we will handle it, it will be reported using a trace
            this.#services.push(promise.catch(error => {
               traceError(error)
            }))
            const remove = () => this.#removeService(promise)
            // Remove once we no longer need to wait for it
            // TODO decide if should be added to catch as well
            promise.then(remove, remove)
        }
    }

    #removeService = (promise: Promise<unknown>): void => {
        const index = this.#services.indexOf(promise)
        if (index > -1) {
            this.#services.splice(index, 1)
        }
    }

    async waitForServices(): Promise<void> {
        const services = this.#services.slice()
        const environments = this.#environments.slice()
        await Promise.all([
            ...services,
            ...environments.map(environment => environment.waitForServices())
        ])
    }

}

const defaultEventTarget = new EventTarget()

export function addEventListener<Type extends (keyof EnvironmentEvents & string)>(type: Type, callback: EventCallback<EnvironmentEvents[Type] & Event<Type>>): void
export function addEventListener(type: string, callback: EventCallback): void
export function addEventListener(type: string, callback: EventCallback<any>): void {
    defaultEventTarget.addEventListener(type, callback)
}

export function removeEventListener(type: string, callback: EventCallback) {
    defaultEventTarget.removeEventListener(type, callback)
}

export async function dispatchEvent<Type extends keyof EnvironmentEvents>(event: EnvironmentEvents[Type]): Promise<void>
export async function dispatchEvent(event: Event): Promise<void>
export async function dispatchEvent(event: Event): Promise<void> {
    await defaultEventTarget.dispatchEvent(event)
}

export async function hasEventListener(type: string) {
    return defaultEventTarget.hasEventListener(type)
}

let getEnvironmentFn: (() => Environment | undefined) | undefined
export function getEnvironment() {
    if (getEnvironmentFn) {
        return getEnvironmentFn()
    }
}

export function setEnvironment(fn: () => Environment | undefined) {
    getEnvironmentFn = fn
}
