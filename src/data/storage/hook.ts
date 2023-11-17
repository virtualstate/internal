import {KeyValueStore, KeyValueStoreOptions} from "./types";
import {isPromise, ok, isLike} from "../../is";
import {getKeyValueStore} from "./kv";

export type UnknownFn = (...args: unknown[]) => unknown;

export const STORAGE_HOOK_ON_FUNCTION: StorageHookOnFunction[] = [
    "clear",
    "delete",
    "get",
    "has",
    "increment",
    "keys",
    "set",
    "values"
];
const STRING_FUNCTIONS: string[] = STORAGE_HOOK_ON_FUNCTION;

export function isStorageHookOnFunction(key: unknown): key is StorageHookOnFunction {
    return typeof key === "string" && STRING_FUNCTIONS.includes(key);
}

// export const STORAGE_HOOK_ON: StorageHookOn[] = [
//     STORAGE_CONSTRUCT,
//     ...STORAGE_HOOK_ON_FUNCTION,
// ];

export type StorageHookOn = (
    | StorageHookOnFunction
);

export type StorageHookOnFunction = (
    | "clear"
    | "delete"
    | "get"
    | "has"
    | "increment"
    | "keys"
    | "set"
    | "values"
);

export const STORAGE_HOOK_BEFORE = "before" as const;
export const STORAGE_HOOK_AFTER = "after" as const;
export const STORAGE_HOOK_DEFAULT = STORAGE_HOOK_AFTER;

export type StorageHookStage = (
    | typeof STORAGE_HOOK_BEFORE
    | typeof STORAGE_HOOK_AFTER
);

export type StorageHookValue<T, O extends StorageHookOnFunction, R = ReturnType<KeyValueStore<T>[O]>> = (R extends Promise<infer Z> ? Z : R) | undefined;
export type StorageHookReturnValue<T, O extends StorageHookOnFunction> =  StorageHookValue<T, O> | Promise<StorageHookValue<T, O>>;

export interface StorageHook<T = unknown, O extends StorageHookOn = StorageHookOn> {
    on: O;
    stage?: StorageHookStage;
    handler: StorageHookFn<T, O>;
}

export type StorageHookFn<T = unknown, O extends StorageHookOnFunction = StorageHookOnFunction> = (...args: [...Parameters<KeyValueStore<T>[O]>, StorageHookValue<T, O>]) => StorageHookReturnValue<T, O> | void

// export interface StorageHookFn<T = unknown, O extends StorageHookOnFunction = StorageHookOnFunction> {
//     (...args: Parameters<KeyValueStore<T>[O]>): StorageHookReturnValue<T, O> | void
//     (...args: ([...Parameters<KeyValueStore<T>[O]>, StorageHookValue<T, O>])): StorageHookReturnValue<T, O> | void
//     (...args: unknown[]): StorageHookReturnValue<T, O> | void
//     (): StorageHookReturnValue<T, O> | void
// }

export interface StorageHookConstructFn<T = unknown> {
    (store: KeyValueStore<T>): KeyValueStore<T> | undefined | void;
}

export type StorageHooks<T = unknown> = {
    [O in StorageHookOn]: StorageHook<T, O>[]
}

export interface Builder<T = unknown, ST extends KeyValueStore<T> = KeyValueStore<T>> {
    <O extends StorageHookOnFunction>(on: O, fn: StorageHookFn<T, O>, options?: Omit<StorageHook<T, O>, "handler" | "on">): Builder<T, ST>;
    <O extends StorageHookOn>(hook: StorageHook<T, O>): Builder<T, ST>;
    hooks: StorageHooks<T>;
    build<SST extends ST>(store: SST): SST;
    build(name: string, options?: KeyValueStoreOptions): ST;
    use: Builder<T, ST>
}

export interface BuilderKeyValueStore<T> extends KeyValueStore<T> {
    builder: Builder<T>;
}

function createHooks<T>(): StorageHooks<T> {
    return {
        clear: [],
        delete: [],
        get: [],
        has: [],
        increment: [],
        keys: [],
        set: [],
        values: []
    };
}

export function builder<T>(hooks = createHooks<T>()) {
    const fn: unknown = builderFn;
    ok<Partial<Builder>>(fn);
    fn.hooks = hooks;
    fn.build = build;
    ok<Builder<T>>(fn);
    fn.use = fn;
    const builder: Builder<T> = fn;
    return fn;

    function build(...args: unknown[]): KeyValueStore<T> {
        const coreStore = getStore();
        let store: KeyValueStore<T> = coreStore;
        ok(store);
        for (const on of STORAGE_HOOK_ON_FUNCTION) {
            store = buildOn(store, on);
            ok(store);
        }
        return store;

        function getStore(): KeyValueStore<T> {
            if (args.length === 1) {
                const [store] = args;
                if (typeof store !== "string") {
                    ok<KeyValueStore<T>>(store);
                    ok(store.get);
                    ok(store.set);
                    return store;
                }
            }
            const [name, options] = args;
            ok(typeof name === "string");
            return getKeyValueStore<T>(name, isLike<KeyValueStoreOptions>(options) ? options : undefined);
        }
        
        function buildOn<O extends StorageHookOn>(store: KeyValueStore<T>, on: O): KeyValueStore<T> {

            if (!isStorageHookOnFunction(on)) {
                return store;
            }

            const onHooks: StorageHook<T, O>[] = hooks[on];
            if (!onHooks.length) {
                return store;
            }

            const before = onHooks.filter(hook => isStage(hook, STORAGE_HOOK_BEFORE));
            const after = onHooks.filter(hook => isStage(hook, STORAGE_HOOK_AFTER));

            let fn: UnknownFn = store[on];
            for (const { handler } of before) {
                ok<UnknownFn>(handler);
                fn = createBeforeFn(fn, handler);
            }
            for (const { handler } of after) {
                ok<UnknownFn>(handler);
                fn = createAfterFn(fn, handler);
            }

            let assigning = store;
            if (assigning === coreStore) {
                // Make a clone the first time we assign
                assigning = {
                    ...assigning
                };
            }

            return Object.assign(assigning, { [on]: fn });

            function createAfterFn(fn: UnknownFn, handler: UnknownFn): UnknownFn {
                const name = `after${on}Hook` as const;
                const namedFn = {
                    // Maybe this will actually show up as the name for the call... idk
                    async [name](...args: unknown[]) {
                        const returnedValue = await fn.call(store, ...args);
                        return handler.call(store, ...args, returnedValue) ?? returnedValue;
                    }
                } as const;
                return namedFn[name];
            }

            function createBeforeFn(fn: UnknownFn, handler: UnknownFn): UnknownFn {
                const name = `before${on}Hook` as const;
                const namedFn = {
                    async [name](...args: unknown[]) {
                        const returnedValue = handler.call(store, ...args);
                        if (isPromise(returnedValue)) {
                            // Ignore the returned value
                            // The handler can directly modify arguments if super needed
                            await returnedValue;
                        }
                        return fn.call(store, ...args);
                    }
                } as const;
                return namedFn[name];
            }

            function isStage(hook: StorageHook, stage: StorageHookStage) {
                if (!hook.stage) {
                    return stage === STORAGE_HOOK_DEFAULT;
                }
                return hook.stage === stage;
            }
        }
    }

    function builderFn(...args: unknown[]): Builder<T> {
        const hook = get();
        push(hooks[hook.on], hook);
        return builder;
        function push<O extends StorageHookOn>(hooks: StorageHook<T, O>[], hook: StorageHook<T>) {
            ok(hooks);
            const was: unknown = hook;
            assertHook(was);
            hooks.push(was);

            function assertHook(hook: unknown): asserts hook is StorageHook<T, O> {
                ok<StorageHook<T, O>>(hook);
                if (hooks.length >= 1) {
                    ok(hook.on === hooks[0].on);
                }
            }
        }

        function get(): StorageHook<T> {
            if (args.length === 1) {
                const hook = args[0];
                ok<StorageHook<T>>(hook);
                ok(hook.on);
                ok(hook.handler);
                return hook;
            }
            ok(args.length >= 2);
            const [on, handler, options] = args;
            ok(typeof on === "string");
            ok<StorageHookOn>(on);
            ok<StorageHookFn<T>>(handler);
            const hook: StorageHook<T> = {
                on,
                handler,
                stage: STORAGE_HOOK_DEFAULT
            };
            if (!options) return hook;
            ok<Partial<StorageHook<T>>>(options);
            return {
                ...hook,
                ...options
            };
        }
    }
}