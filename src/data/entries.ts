import {ok} from "../is";

export type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];

export function entries<T>(value: T): Entries<T> {
    const result = Object.entries(value);
    ok<Entries<T>>(result);
    return result;
}