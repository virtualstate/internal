import {FetchStore} from "../fetch-store";

export const json = new FetchStore({
    type: "json",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify,
    fetch
});