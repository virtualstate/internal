import {Happening, HappeningData, HappeningTree} from "./types";
import {getHappening} from "./get-happening";
import {ok} from "../../is";
import {Attendee, getAttendee} from "../attendee";
import {getPartner, Partner} from "../partner";
import {getOrganisation, Organisation} from "../organisation";
import {getConfig} from "../../config";

export interface HappeningTreeConfig {
    getHappeningTree?<T extends HappeningData = Happening, K extends keyof T = keyof T>(happeningId: string, context: GetHappeningTreeContext<T, K>): Promise<HappeningTree | undefined>
}

export interface GetHappeningTreeContext<T extends HappeningData = Happening, K extends keyof T = keyof T> {
    trees: Map<string, HappeningTree>;
    store?: Map<string, T>;
    attendees: Map<string, Attendee>;
    partners: Map<string, Partner>;
    organisations: Map<string, Organisation>;
    idKey: K;
    get?(key: string): Promise<T | undefined>;
}

export interface CreateGetHappeningTreeContextOptions<T extends HappeningData = Happening, K extends keyof T = keyof T> {
    idKey?: K
    happenings?: T[];
    attendees?: Attendee[]
    organisations?: Organisation[]
    partners?: Partner[]
    get?(key: string): Promise<T | undefined>;
}

export function createGetHappeningTreeContext<T extends HappeningData = Happening, K extends keyof T = keyof T>(options: CreateGetHappeningTreeContextOptions<T, K> = {}): GetHappeningTreeContext<T, K> {
    const {
        idKey = "happeningId",
        happenings,
        attendees,
        partners,
        organisations,
        get = getHappening
    } = options
    const context = {
        idKey,
        get,
        trees: new Map(),
        store: happenings ?
            new Map(happenings.filter(Boolean).map(value => [value[idKey], value])) :
            undefined,
        attendees: attendees ?
            new Map(attendees.filter(Boolean).map(value => [value.attendeeId, value])) :
            new Map(),
        partners: partners ?
            new Map(partners.filter(Boolean).map(value => [value.partnerId, value])) :
            new Map(),
        organisations: organisations ?
            new Map(organisations.filter(Boolean).map(value => [value.organisationId, value])) :
            new Map()
    };
    ok<GetHappeningTreeContext<T, K>>(context);
    return context;
}

export async function getTopHappeningTree(happeningId: string): Promise<HappeningTree> {
    const tree = await getHappeningTree(happeningId);
    const parent = getParent(tree);
    return getWithoutParent(parent);

    function getWithoutParent(tree: HappeningTree): HappeningTree {
        return {
            ...tree,
            parent: undefined,
            children: tree.children.map(getWithoutParent)
        }
    }

    function getParent(tree: HappeningTree): HappeningTree {
        const { parent } = tree;
        if (!parent) return tree;
        return getParent(parent)
    }
}

export async function getHappeningTree<T extends HappeningData = Happening, K extends keyof T = keyof T>(happeningId: string, context = createGetHappeningTreeContext<T, K>()): Promise<HappeningTree> {
    const config = getConfig();
    if (config.getHappeningTree) {
        const tree = await config.getHappeningTree(happeningId, context);
        ok(tree, `Expected happening ${happeningId} to exist`);
        return tree;
    }

    const existing = context.trees.get(happeningId);
    if (existing) return existing;

    const happening: HappeningData | undefined = await getCachedHappening(happeningId);
    ok(happening, `Expected happening ${happeningId} to exist`);

    const { attendees, parent, children, ...data } = happening;

    const instance: HappeningTree = {
        type: "happening",
        id: happeningId,
        ...data,
        children: [],
        attendees: []
    };

    instance.partner = instance.partner ?? await getCachedPartner(data.partnerId);
    instance.organisation = instance.organisation ?? await getCachedOrganisation(data.organisationId);

    // Put the instance in the memory cache so
    // it's object reference is used when
    context.trees.set(happeningId, instance);

    if (attendees?.length) {
        instance.attendees = (
            await Promise.all(
                attendees.map(
                    attendee => getCachedAttendee(attendee)
                )
            )
        )
            .filter(Boolean)
    }

    // When getting the children trees, they will reference the parent using the above
    if (children?.length) {
        instance.children = await Promise.all(
            children.map(
                child => getHappeningTree(child, context)
            )
        );
    }

    if (parent) {
        instance.parent = await getHappeningTree(parent, context)
    }

    return instance;

    async function getCachedHappening(happeningId: string): Promise<T | undefined> {
        const existing = context.store?.get(happeningId);
        if (existing) return existing;
        return context.get(happeningId);
    }

    async function getCachedAttendee(attendeeId?: string) {
        if (!attendeeId) return undefined;
        const existing = context.attendees.get(attendeeId);
        if (existing) return existing;
        const value = await getAttendee(attendeeId);
        if (!value) return undefined;
        context.attendees.set(attendeeId, value);
        return value;
    }

    async function getCachedPartner(partnerId?: string) {
        if (!partnerId) return undefined;
        const existing = context.partners.get(partnerId);
        if (existing) return existing;
        const value = await getPartner(partnerId);
        if (!value) return undefined;
        context.partners.set(partnerId, value);
        return value;
    }

    async function getCachedOrganisation(organisationId?: string) {
        if (!organisationId) return undefined;
        const existing = context.organisations.get(organisationId);
        if (existing) return existing;
        const value = await getOrganisation(organisationId);
        if (!value) return undefined;
        context.organisations.set(organisationId, value);
        return value;
    }
}