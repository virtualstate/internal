import {AsyncLocalStorage} from "async_hooks";
import {ok} from "../is";

export type ContextKey = string;

export class Context<T = unknown, Z = Record<ContextKey, T>> {

    storage: AsyncLocalStorage<Record<ContextKey, T>>;
    defaultValues?: Z;

    constructor(defaultValues?: Z) {
        this.defaultValues = defaultValues;
        this.storage = new AsyncLocalStorage();
    }

    get value(): Z {
        const value: unknown = {
            ...this.storage.getStore()
        };
        ok<Z>(value);
        return value;
    }

    get<K extends keyof Z>(key: K): Z[K]
    get<TT>(key: ContextKey): TT | undefined
    get(key: ContextKey): T | undefined
    get(key: ContextKey): unknown {
        const store = this.storage.getStore();
        if (!store) return undefined;
        return store[key];
    }

    set<K extends keyof Z>(key: K, value: Z[K]): void
    set(key: ContextKey, value: T): void
    set(key: ContextKey, value: unknown): void
    set(key: ContextKey, value: unknown): void {
        let store = this.storage.getStore();
        if (!store) {
            const next = { ...this.defaultValues };
            ok<Record<ContextKey, T>>(next);
            store = next;
            this.storage.enterWith(store);
        }
        ok<T>(value)
        store[key] = value;
    }

    run<R>(values: Z, fn: () => R): R
    run<R>(values: Record<ContextKey, T>, fn: () => R): R
    run<R>(values: unknown, fn: () => R): R {
        ok<Record<ContextKey, T>>(values);
        return this.storage.run(values, fn);
    }

}

export function createContext<Z>(defaultValues?: Z) {
    return new Context<Z[keyof Z], Z>(defaultValues);
}