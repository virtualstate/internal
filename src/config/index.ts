import {name, root, version} from "../package";
import {createContext} from "../hooks/context";
import {Config} from "./types";

export * from "./env";

export { Config } from "./types";

const ConfigContext = createContext<Config>({
    name,
    version,
    root
});

export function getConfig(overrides?: Partial<Config>): Config {
    if (!overrides) return ConfigContext.value;
    return {
        ...ConfigContext.value,
        ...overrides
    };
}

export function withConfig<R>(config: Partial<Config>, fn: () => R): R {
    return ConfigContext.run({ ...getConfig(), ...config }, fn);
}

export function setConfig(config: Config) {
    for (const [key, value] of Object.entries(config)) {
        ConfigContext.set(key, value);
    }
}