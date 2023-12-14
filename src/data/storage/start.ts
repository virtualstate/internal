import {stopRedis} from "./redis-client";
import {stopKVConnect} from "./kv-connect";

export async function stopData() {
    await stopRedis();
    stopKVConnect();
}