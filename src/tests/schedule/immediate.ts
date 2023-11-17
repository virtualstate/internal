import {v4} from "uuid";
import {spy} from "sinon";
import {dispatchEvent, on} from "../../events/schedule";
import {ok} from "../../is";
import {getDurableEvent} from "../../data";
import {withConfig} from "../../config";

{

    const type = v4();
    const eventId = v4();
    const fn = spy();

    const remove = on(type, fn);

    const value = v4();

    const initial = {
        type,
        eventId,
        value,
        schedule: {
            immediate: true
        }
    };

    ok(!await getDurableEvent(initial));

    await dispatchEvent(initial);

    ok(fn.called);

    // Should be already resolved
    ok(!await getDurableEvent(initial));

    remove();

}

{

    const type = v4();
    const eventId = v4();
    const fn = spy();

    const value = v4();

    const initial = {
        type,
        eventId,
        value,
        schedule: {
            immediate: true
        }
    };

    ok(!await getDurableEvent(initial));

    await withConfig(
        {
            functions: [
                {
                    on: type,
                    handler: fn
                }
            ]
        },
        async () => {
            await dispatchEvent(initial);
        }
    );

    ok(fn.called);

    // Should be already resolved
    ok(!await getDurableEvent(initial));

}