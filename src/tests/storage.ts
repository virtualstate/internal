import {
    addHappening,
    addHappeningTree,
    deleteHappeningTree,
    getHappening,
    getHappeningTree, getKeyValueStore,
    getTopHappeningTree, Happening, HappeningType, setAttendee
} from "../data";
import {ok} from "../is";
import {v4} from "uuid";
import {Chance} from "chance";
import {DAY_MS} from "../data/expiring-kv";
import {builder} from "../data/storage/hook";
import sinon from "sinon";
import exp from "constants";

const chance = new Chance();



{

    const store = builder<"value">()
        .use("set", (key, value) => {
            return undefined;
        })
        .use("get", (key, value) => {

        }, { stage: "after" })
        .use("has", (key, value) => {

        }, { stage: "after" })
        .build("storeName")


}

{
    type Value = { value: string };
    const base = getKeyValueStore<Value>("storeName");

    const expectedValue = {
        value: v4()
    };

    const before = sinon.spy(async function (key: string, value: Value) {
        ok(value.value === expectedValue.value);
        const found = await base.get(key);
        ok(found?.value !== expectedValue.value);
    });

    const after = sinon.spy(async function (key: string, value: Value) {
        ok(value.value === expectedValue.value);
        const found = await base.get(key);
        ok(found.value === expectedValue.value);
    });

    const hooked = builder()
        .use({
            on: "set",
            stage: "before",
            handler: before,
        })
        .use({
            on: "set",
            stage: "after",
            handler: after,
        })
        .build(base);

    ok(!before.called);
    ok(!after.called);
    await hooked.set("key", expectedValue);

    ok(before.called);
    ok(before.calledWith("key", expectedValue))
    ok(after.called);
    ok(after.calledWith("key", expectedValue));
    ok(before.calledBefore(after));

}