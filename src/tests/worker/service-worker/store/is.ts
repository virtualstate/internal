export function isMaybeJSONContentType({ headers }: { headers: Headers }) {
    if (!headers.has("Content-Type")) return true;
    return headers.get("Content-Type") === "application/json";
}