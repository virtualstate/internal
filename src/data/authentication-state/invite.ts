import {AuthenticationState, UntypedAuthenticationStateData} from "./types";
import {setAuthenticationState} from "./set-authentication-state";
import {compare, hash} from "bcrypt";
import {isLike, isNumberString} from "../../is";
import {getOrigin} from "../../listen";
import {getAuthenticationState} from "./get-authentication-state";
import {getExpiresAt} from "../expiring-kv";
import {DEFAULT_INVITEE_STATE_EXPIRES_MS} from "./store";
import {nanoid} from "nanoid";
import {ChangeIdentifier} from "../change";

const {
    INVITEE_BCRYPT_SALT,
    INVITEE_BCRYPT_ROUNDS,
    INVITEE_URL,
    INVITEE_ORIGIN
} = process.env;

const DEFAULT_INVITEE_URL = "/invite/accept"
const DEFAULT_ROUNDS = 13;

function getSaltOrRounds() {
    if (isNumberString(INVITEE_BCRYPT_ROUNDS)) {
        return +INVITEE_BCRYPT_ROUNDS;
    } else if (INVITEE_BCRYPT_SALT) {
        return INVITEE_BCRYPT_SALT;
    }
    return DEFAULT_ROUNDS;
}

export function getInviteURL(url?: string) {
    return new URL(url || INVITEE_URL || DEFAULT_INVITEE_URL, INVITEE_ORIGIN || getOrigin());
}

export interface InviteeStateOptionsData {
    inviteUrl?: string;
    inviteAnonymous?: boolean;
    inviteRepeating?: boolean;
    inviteAutoAccept?: boolean;
    inviteRedirectUrl?: string;
    inviteChange?: ChangeIdentifier;
}

export interface InviteeStateData extends InviteeStateOptionsData {
    inviteSecretHashed: string;
    inviteUrl: string;
}

export interface InviteeStateOptions extends UntypedAuthenticationStateData, InviteeStateOptionsData {

}

export interface InviteeState extends AuthenticationState, InviteeStateData {

}

export async function addInviteeState(data: InviteeStateOptions): Promise<InviteeState> {
    // Use a custom state id for human viewing
    const stateId = nanoid();
    const inviteSecret = nanoid(8);
    const inviteSecretHashed = await hash(inviteSecret, getSaltOrRounds());
    const intendedUrl = getInviteURL(data.inviteUrl);
    const inviteeState: InviteeStateData = {
        inviteSecretHashed,
        inviteUrl: intendedUrl.toString(),
        inviteAnonymous: !!data.inviteAnonymous,
        inviteAutoAccept: !!data.inviteAutoAccept,
        inviteRepeating: !!data.inviteRepeating,
        inviteRedirectUrl: data.inviteRedirectUrl,
        inviteChange: data.inviteChange
    }
    const state = await setAuthenticationState({
        ...data,
        stateId,
        type: "invitee",
        ...inviteeState,
        expiresAt: getExpiresAt(DEFAULT_INVITEE_STATE_EXPIRES_MS, data.expiresAt)
    });
    const inviteUrl = new URL(intendedUrl);
    // Set the token AFTER storing the target url in the database
    inviteUrl.searchParams.set("token", inviteSecret);
    inviteUrl.searchParams.set("state", stateId);
    return {
        ...state,
        ...inviteeState,
        inviteUrl: inviteUrl.toString()
    };
}

export interface GetInviteeOptions {
    stateId: string;
    token: string;
}

export async function getInviteeState({ stateId, token }: GetInviteeOptions): Promise<InviteeState | undefined> {
    const state = await getAuthenticationState(stateId);
    if (!state) return undefined;
    if (!isInviteeState(state)) return undefined;
    const matched = await compare(token, state.inviteSecretHashed);
    if (!matched) return undefined;
    return state;
}

export function isInviteeState(state: AuthenticationState): state is InviteeState {
    if (!state.type) return false;
    return !!(
        isLike<InviteeState>(state) &&
        state.inviteUrl &&
        state.inviteSecretHashed
    );
}

export async function getExchangeStateURL(stateId?: string): Promise<string | undefined> {
    if (!stateId) return undefined;
    const authState = await getAuthenticationState(stateId);
    if (authState?.type !== "exchange") return undefined;
    const exchangeState = await getAuthenticationState(authState.userState);
    if (exchangeState?.type !== "invitee") return undefined;
    const url = getInviteURL();
    url.searchParams.set("state", stateId);
    return url.toString();
}