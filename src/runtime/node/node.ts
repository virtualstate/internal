import { Environment as EnvironmentTemplate } from "../../environment/environment"
import { AsyncLocalStorage } from "async_hooks"
import { start as startFetchService } from "./fetch-service"
import { createLocalStorage } from "../../local-storage";

const localStorage = createLocalStorage<Environment>()

export class Environment extends EnvironmentTemplate {

    constructor(name: string = "node") {
        super(name);
    }

    async runInAsyncScope(fn: () => void | Promise<void>) {
        return localStorage.run(this, fn)
    }

    static getEnvironment(): Environment | undefined {
        return localStorage.getStore()
    }

    async configure() {
        this.addService(startFetchService())
    }



}
