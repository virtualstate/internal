import { HappeningTree } from "../../../../client";
import {HappeningAt} from "./at";
import { HappeningProvider} from "./context";

export interface HappeningProps {
    happening: HappeningTree
}

export function Happening(props: HappeningProps) {
    const { happening } = props;
    return (
        <HappeningProvider value={happening}>
            <div className="flex flex-col">
                <div>{happening.title}</div>
                <div>{happening.type}</div>
                <HappeningAt />
                <div>{happening.children?.length || 0} children</div>
            </div>
        </HappeningProvider>
    )
}