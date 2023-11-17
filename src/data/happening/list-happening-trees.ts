import {
    createGetHappeningTreeContext,
    GetHappeningTreeContext,
    getHappeningTree
} from "./get-happening-tree";
import {ListHappeningInput, listHappenings} from "./list-happenings";
import {getAttendee} from "../attendee";
import {Happening, HappeningData} from "./types";
import {ok} from "../../is";

export interface ListHappeningTreesInput<T extends HappeningData = Happening, K extends keyof T = keyof T> extends ListHappeningInput {
    context?: GetHappeningTreeContext<T, K>
}

export async function listHappeningTrees(options?: ListHappeningTreesInput<Happening, "happeningId">) {
    return listHappeningTreesWithContext(
        await getListHappeningTreesContext(options)
    )
}

export async function listHappeningTreesWithContext<T extends HappeningData = Happening, K extends keyof T = keyof T>(context: GetHappeningTreeContext<T, K>) {
    const nonUniqueTrees = await Promise.all(
        map(context.store.values(), (value) => {
            const happeningId = value[context.idKey];
            ok(typeof happeningId === "string");
            return getHappeningTree<T, K>(happeningId, context)
        })
    );

    // These trees without parents will contain all trees in nonUniqueTrees
    return nonUniqueTrees.filter(
        tree => !tree.parent
    );
}

function map<I, Z>(iterable: Iterable<I>, fn: (value: I) => Z): Z[] {
    const returnValues: Z[] = [];
    for (const value of iterable) {
        returnValues.push(fn(value))
    }
    return returnValues;
}

async function getListHappeningTreesContext(options?: ListHappeningTreesInput<Happening, "happeningId">) {
    const happenings = await listHappenings(options);
    const attendeeIds = [...new Set(happenings.flatMap(happening => happening.attendees))];
    const attendees = await Promise.all(attendeeIds.map(getAttendee));
    return createGetHappeningTreeContext<Happening, "happeningId">({happenings, attendees});
}