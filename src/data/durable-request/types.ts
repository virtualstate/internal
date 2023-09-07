import {Expiring} from "../expiring";

export interface DurableRequestData extends Pick<Request, "url" | "method">, Expiring {
    headers?: Record<string, string>
    body?: string | DurableBody;
    response?: DurableResponseData;
}

export interface DurableResponseCache {
    name: string;
}

export interface DurableBody {
    type: "file" | "base64";
    value: string;
}

export interface DurableResponseData extends Pick<Response, "url" | "status" | "statusText"> {
    headers?: Record<string, string>
    body?: string | DurableBody;
}

export interface DurableRequest extends DurableRequestData {
    durableRequestId: string;
    createdAt: string;
    updatedAt: string;
}

export interface RequestQueryInfo extends DurableRequestData {

}

export type RequestQuery = RequestQueryInfo | RequestInfo | URL

export type PartialDurableRequest = DurableRequestData & Partial<DurableRequest>;