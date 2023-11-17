import {getHappeningStore} from "./store";

export interface ListHappeningInput {
    type?: string | string[]
}

export async function listHappenings(options?: ListHappeningInput) {
    const types = Array.isArray(options.type) ? options.type : (options.type?.length ? [options.type] : []);
    const store = getHappeningStore();
    let values = await store.values();
    // TODO filter using indexes rather than filtering in memory
    if (types.length) {
        values = values.filter(happening => types.includes(happening.type));
    }
    return values;
}