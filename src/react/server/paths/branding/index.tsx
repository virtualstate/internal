import {getR2URLFileData, getSigned, getSignedUrl, R2SignedURL} from "../../../../data";
import {useInput} from "../../data";

export const path = "/settings/branding";
export const trusted = true;

interface Input {

}

export async function handler(): Promise<Input> {

    return {

    } as const
}

export function Component() {
    const {  } = useInput<Input>()
    return (
        <div></div>
    )
}