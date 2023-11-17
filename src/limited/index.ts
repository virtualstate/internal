import {isNumberString} from "../is";
import Bottleneck from "bottleneck";

export interface AsyncLikeFn<T = void | unknown> {
    (): Promise<T> | T
}

export async function limited<T = void | unknown>(fns: AsyncLikeFn<T>[]): Promise<T[]> {
    const {
        LIMITED_SERIAL,
        LIMITED_BOTTLENECK,
        LIMITED_BOTTLENECK_MAX_CONCURRENT,
        LIMITED_BOTTLENECK_MIN_TIME,
        LIMITED_BOTTLENECK_RESERVOIR,
        LIMITED_BOTTLENECK_RESERVOIR_INCREASE_AMOUNT,
        LIMITED_BOTTLENECK_RESERVOIR_INCREASE_INTERVAL,
        LIMITED_BOTTLENECK_RESERVOIR_INCREASE_MAXIMUM,
    } = process.env;

    if (!fns.length) {
        return [];
    }

    if (LIMITED_SERIAL) {
        const values: T[] = [];
        for (const fn of fns) {
            values.push(await fn());
        }
        return values;
    }

    if (!LIMITED_BOTTLENECK) {
        return await Promise.all<T>(
            fns.map(async fn => {
                return fn();
            })
        );
    }

    const maxConcurrent = isNumberString(LIMITED_BOTTLENECK_MAX_CONCURRENT) ?
        +LIMITED_BOTTLENECK_MAX_CONCURRENT : 1;
    const minTime = isNumberString(LIMITED_BOTTLENECK_MIN_TIME) ?
        +LIMITED_BOTTLENECK_MIN_TIME : 1000;
    const reservoir = isNumberString(LIMITED_BOTTLENECK_RESERVOIR) ?
        +LIMITED_BOTTLENECK_RESERVOIR : undefined;
    const reservoirIncreaseAmount = isNumberString(LIMITED_BOTTLENECK_RESERVOIR_INCREASE_AMOUNT) ?
        +LIMITED_BOTTLENECK_RESERVOIR_INCREASE_AMOUNT : undefined;
    const reservoirIncreaseInterval = isNumberString(LIMITED_BOTTLENECK_RESERVOIR_INCREASE_INTERVAL) ?
        +LIMITED_BOTTLENECK_RESERVOIR_INCREASE_INTERVAL : undefined;
    const reservoirIncreaseMaximum = isNumberString(LIMITED_BOTTLENECK_RESERVOIR_INCREASE_MAXIMUM) ?
        +LIMITED_BOTTLENECK_RESERVOIR_INCREASE_MAXIMUM : undefined;

    const bottleneck = new Bottleneck({
        maxConcurrent,
        minTime,
        reservoir,
        reservoirIncreaseAmount,
        reservoirIncreaseInterval,
        reservoirIncreaseMaximum
    });

    return await Promise.all<T>(
        fns.map(fn => bottleneck.schedule<T>(async () => {
            return fn()
        }))
    );
}