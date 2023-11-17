import {HappeningTree} from "../../../../client";
import {createContext, useContext} from "react";
import {ok} from "../../../../is";

export const TimezoneContext = createContext<string>("Pacific/Auckland");
export const TimezoneProvider = TimezoneContext.Provider;

export const HappeningContext = createContext<HappeningTree | undefined>(undefined);
export const HappeningProvider = HappeningContext.Provider;

export function useHappening(): HappeningTree {
    const context = useContext(HappeningContext);
    ok(context);
    return context;
}

export function useTimezone(): string {
    return useContext(TimezoneContext);
}