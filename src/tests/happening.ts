import {
    addHappening,
    addHappeningTree,
    deleteHappeningTree,
    getHappening,
    getHappeningTree,
    getTopHappeningTree, Happening, HappeningType, setAttendee
} from "../data";
import {ok} from "../is";
import {v4} from "uuid";
import {Chance} from "chance";
import {DAY_MS} from "../data/expiring-kv";

const chance = new Chance();

{

    const a1 = v4();
    const a2 = v4();
    const a3 = v4();

    const tree = await addHappeningTree({
        attendees: [a1],
        children: [
            {},
            {},
            {
                children: [
                    {},
                    {
                        attendees: [
                            { reference: a2 },
                            { reference: a3 }
                        ]
                    }
                ]
            }
        ]
    });

    ok(tree.id);
    ok(tree.children.length === 3);
    ok(tree.children[0].children.length === 0);
    ok(tree.children[1].children.length === 0);
    ok(tree.children[2].children.length === 2);

    {
        const other = await getHappeningTree(tree.id);
        ok(other.children.length === 3);
        ok(other.children[0].children.length === 0);
        ok(other.children[1].children.length === 0);
        ok(other.children[2].children.length === 2);
    }

    {
        const top = await getTopHappeningTree(tree.children[2].children[0].id);
        ok(top.id === tree.id);
        ok(top.children.length === 3);
        ok(top.children[0].children.length === 0);
        ok(top.children[1].children.length === 0);
        ok(top.children[2].children.length === 2);
    }

    console.log(tree);

    ok(await getHappening(tree.id));
    ok(await getHappening(tree.children[2].children[0].id));

    await deleteHappeningTree(tree.id);

    console.log(await getHappening(tree.id));
    ok(!await getHappening(tree.id));
    ok(!await getHappening(tree.children[2].children[0].id));

}

function group(...happenings: Happening[]): Pick<Happening, "attendees" | "children"> & { type?: string } {
    return {
        type: happenings[0]?.type,
        attendees: [...new Set(happenings.flatMap(report => report.attendees ?? []))].filter(Boolean),
        children: happenings.map(report => report.happeningId)
    };
}

{

    const { attendeeId: person1 } = await setAttendee({ reference: v4() });
    const { attendeeId: person2 } = await setAttendee({ reference: v4() });
    const { attendeeId: person3 } = await setAttendee({ reference: v4() });

    const report1 = await addHappening({
        type: "report",
        attendees: [person1],
        inRange: true
    });
    const report2 = await addHappening({
        type: "report",
        attendees: [person2],
        inRange: true
    });
    const report3 = await addHappening({
        type: "report",
        attendees: [person3],
        inRange: false
    });

    const reportInRange = await addHappening({
        ...group(
            report1,
            report2
        ),
        type: "report",
        onlyInRange: true
    });

    const reportAll = await addHappening({
        ...group(
            report1,
            report2,
            report3
        ),
        type: "report",
        onlyInRange: false
    });

    const inRangeTree = await getTopHappeningTree(reportInRange.happeningId);
    const allTree = await getTopHappeningTree(reportAll.happeningId);

    ok(inRangeTree.children.length === 2);
    ok(allTree.children.length === 3);

    const event = await addHappening({
        ...group(reportInRange, reportAll),
        type: "event"
    })

    console.log(JSON.stringify(await getTopHappeningTree(event.happeningId), undefined, "  "));

}

{
    const { attendeeId: person1 } = await setAttendee({ reference: v4() });
    const { attendeeId: person2 } = await setAttendee({ reference: v4() });
    const { attendeeId: person3 } = await setAttendee({ reference: v4() });

    const startAt = Date.now() + chance.integer({ min: 0.5 * DAY_MS, max: 30 * DAY_MS });

    const concert = await addHappening({
        type: "event",
        title: "Concert 1",
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(startAt + (0.25 * DAY_MS)).toISOString()
    });

    const ticketIntent1 = await addHappening({
        type: "intent",
        attendees: [person1],
        children: [concert.happeningId]
    });

    const ticketIntent2 = await addHappening({
        type: "intent",
        attendees: [person2],
        children: [concert.happeningId]
    });

    // Not paid for, no entry
    const ticketIntent3 = await addHappening({
        type: "intent",
        attendees: [person3],
        children: [concert.happeningId]
    });

    const ticketSharedPayment = await addHappening({
        ...group(ticketIntent1, ticketIntent2),
        type: "payment"
    });

    const ticket1 = await addHappening({
        ...group(ticketIntent1, ticketSharedPayment),
        type: "ticket"
    });

    const ticket2 = await addHappening({
        ...group(ticketIntent2, ticketSharedPayment),
        type: "ticket"
    });

    const list = await addHappening({
        ...group(concert, ticket1, ticket2),
        type: "event"
    });

    console.log(JSON.stringify(await getTopHappeningTree(list.happeningId), undefined, "  "));

}

{

    const { attendeeId: person1 } = await setAttendee({ reference: v4() });
    const { attendeeId: person2 } = await setAttendee({ reference: v4() });

    const startAt = Date.now() + chance.integer({ min: 0.5 * DAY_MS, max: 30 * DAY_MS });

    const person1StartAt = 1000;

    // Person 1 has an appointment at a specific time
    const person1Appointment = await addHappening({
        type: "appointment",
        attendees: [person1],
        startAt: new Date(startAt + person1StartAt).toISOString(),
    });

    // Person 2 indicates that they are available with a period of time for a happening
    const person2Availability = await addHappening({
        type: "availability",
        startAt: new Date(startAt + (person1StartAt - DAY_MS)).toISOString(),
        endAt: new Date(startAt + (person1StartAt + DAY_MS)).toISOString(),
        attendees: [person2]
    });

    // Person 1 indicates an intention to swap their happening
    const person1Intention = await addHappening({
        ...group(person1Appointment),
        type: "intent"
    });

    // The system identifies a happening that matches an intent
    // After a swap, person 2 will be able to create their happening with the
    // happening that person 1 intended to swap
    const swap = await addHappening({
        ...group(person2Availability, person1Intention),
        type: "swap",
    });

    // Person 2 receives an appointment for the time person 1 indicated
    const replacement = await addHappening({
        type: "appointment",
        attendees: [person2],
        startAt: person1Appointment.startAt,
    });

    // Person 1 indicates they are available for an appointment
    const newAvailability = await addHappening({
        type: "availability",
        startAt: new Date(startAt + (person1StartAt - DAY_MS)).toISOString(),
        endAt: new Date(startAt + (person1StartAt + DAY_MS)).toISOString(),
        attendees: [person1]
    });

    const event = await addHappening(group(
            person1Appointment,
            person2Availability,
            swap,
            replacement,
            newAvailability
    ));

    console.log(JSON.stringify(await getTopHappeningTree(event.happeningId), undefined, "  "));



}