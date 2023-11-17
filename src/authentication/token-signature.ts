// See https://github.com/upstash/sdk-qstash-ts/blob/main/pkg/receiver.ts
// This is a version that doesn't rely on deno
import type {JwtPayload} from "jsonwebtoken";
import {ok} from "../is";
import {subtle} from "crypto";
import JsonWebToken from "jsonwebtoken";

export interface VerifyWithKeyOptions {
    token: string;
    url?: string;
    keys: string[];
    body?: unknown;
    clockTolerance?: number;
    issuer?: string | string[];
    subject?: string;
}

export async function verifyTokenWithKeys(req: VerifyWithKeyOptions) {
    const { keys } = req;
    for (const key of keys) {
        if (await verifyTokenWithKey(req, key)) {
            return true;
        }
    }
    return false;
}


export async function verifyTokenWithKey(req: VerifyWithKeyOptions, key: string) {
    try {
        const verified = JsonWebToken.verify(req.token, key, {
            issuer: req.issuer,
            subject: req.subject
        });

        ok(isPayloadStringRecordLike(verified));

        const { body } = verified;

        if (typeof body === "string") {
            ok(typeof req.body === "string");
            const expectedHash = Buffer.from(body, "base64url");
            const bodyHash = Buffer.from(
                await subtle.digest(
                    "SHA-256",
                    Buffer.from(req.body)
                )
            );
            ok(expectedHash.equals(bodyHash))
        }

        return true;
    } catch {
        return false;
    }
}

export interface JwtPayloadLike extends JwtPayload, Record<string, unknown> {

}

function isPayloadStringRecordLike(value: JwtPayload | string): value is JwtPayloadLike {
    return !!(typeof value !== "string" && value);
}