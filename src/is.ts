/* c8 ignore start */

export function isLike<T>(value: unknown): value is T {
  return !!value;
}

export function isArray<T>(value: unknown): value is T[];
export function isArray(value: unknown): value is unknown[];
export function isArray(value: unknown): boolean {
  return Array.isArray(value);
}

function isObjectLike(
  node: unknown
): node is Record<string | symbol | number, unknown> {
  return !!node && (typeof node === "object" || typeof node === "function");
}

export function isPromise(input: unknown): input is Promise<unknown> {
  return isObjectLike(input) && typeof input.then === "function";
}

export function ok(value: unknown, message?: string): asserts value;
export function ok<T>(value: unknown, message?: string): asserts value is T;
export function ok(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message ?? "Expected value");
  }
}

export function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return !!(
      isLike<AsyncIterable<unknown>>(value) &&
      typeof value[Symbol.asyncIterator] === "function"
  );
}

export function isIterable<T>(value: unknown): value is Iterable<T> {
  return !!(
      isLike<Iterable<unknown>>(value) &&
      typeof value[Symbol.iterator] === "function"
  );
}

export function isNumberString(value?: unknown): value is `${number}` | number {
  return (
      (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)) ||
      typeof value === "number"
  );
}

export function isTrueString(value?: unknown): value is `${1 | true}` {
    return (
        value === 1 ||
        value === true ||
        value === "1" ||
        value === "true"
    );
}

export function isFalseString(value?: unknown): value is `${0 | false}` {
    return (
        value === 0 ||
        value === false ||
        value === "0" ||
        value === "false"
    );
}

export interface Signalled {
  signal: AbortSignal;
}

export function isSignalled(event: unknown): event is Signalled {
  return !!(
      isLike<Signalled>(event) &&
      event.signal &&
      typeof event.signal.aborted === "boolean"
  )
}

export function isMatchingObjects(a?: unknown, b?: unknown): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (typeof a !== "object" || typeof b !== "object") return false;
    const aEntries = Object.entries(a);
    const bMap = new Map(Object.entries(b));
    if (aEntries.length !== bMap.size) return false;
    return aEntries.every(([key, value]) => {
        const otherValue = bMap.get(key);
        if (typeof value === "object") {
            return isMatchingObjects(value, otherValue);
        }
        return value === otherValue;
    })
}