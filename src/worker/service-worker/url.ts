export function getURLSource(input: URL | RequestInfo) {
    if (input instanceof URL) {
        return input;
    }
    if (typeof input === "string") {
        return input;
    }
    return input.url;
}