import {stopRedis} from "./redis-client";

export async function stopData() {
    await stopRedis();
}