import {useData, useError, useInput, useMaybeBody, useMaybeResult, useSubmitted, useTimezone} from "../../data";
import {HappeningFormMetaData} from "../create-happening";
import {
    isUnauthenticated,
    getUser,
    getMaybeAuthenticationState,
    setAuthenticationState as setAuthenticatedAuthenticationState, getMaybeUser
} from "../../../../authentication";
import {FastifyReply, FastifyRequest} from "fastify";
import {
    addAnonymousUser,
    addAuthenticationState, addCookieState, AuthenticationRole,
    AuthenticationState, change, DEFAULT_INVITEE_EXCHANGE_STATE_EXPIRES_MS,
    deleteAuthenticationState,
    getAuthenticationState,
    getExpiresAt, getExternalUser,
    getInviteeState,
    getUserAuthenticationRoleForUser,
    InviteeState,
    isInviteeState,
    MINUTE_MS,
    setAuthenticationState,
    setUserAuthenticationRole, User,
    UserAuthenticationRole,
} from "../../../../data";
import {ok} from "../../../../is";
import {path as DEFAULT_LOGIN_URL} from "../login";
import {getOrigin} from "../../../../listen/config";
import {setAuthenticationStateCookie} from "../../../../listen";

const {
    LOGIN_URL
} = process.env

export const path = "/invite/accept";
export const anonymous = true;

interface Body {
    stateKey: string;
    token: string;
    submit?: "login" | string;
}

type Schema = {
    Body: Body
}

type Result = {
    role: UserAuthenticationRole
    user: User
    changed?: boolean
}

type InputSchema = {
    Querystring?: Partial<Body> & { state?: string, login?: string }
    Body?: Body
}

const INVALID_INVITE = "Invalid or expired invite";

interface Input {
    stateId: string;
    state: InviteeState;
    deletableStates: AuthenticationState[]
}

export async function handler(request: FastifyRequest<InputSchema>, response: FastifyReply): Promise<Input> {
    const stateId = request.body?.stateKey || request.query.stateKey || request.query.state;
    const token = request.body?.token || request.query.token;

    ok(stateId, INVALID_INVITE);

    let state: InviteeState;

    const deletableStates = [];

    if (!token) {
        const exchangeState = await getAuthenticationState(stateId);
        deletableStates.push(exchangeState);
        ok(exchangeState, INVALID_INVITE);
        ok(exchangeState.type === "exchange", INVALID_INVITE);
        ok(exchangeState.userState, INVALID_INVITE);
        const foundState = await getAuthenticationState(exchangeState.userState);
        ok(isInviteeState(foundState), INVALID_INVITE);
        state = foundState;
        if (!state.inviteRepeating) {
            deletableStates.push(state);
        }
    } else {
        state = await getInviteeState({
            stateId,
            token
        })
        if (!state.inviteRepeating) {
            deletableStates.push(state);
        }
    }

    ok(state, INVALID_INVITE);

    const input: Input = {
        state,
        deletableStates,
        stateId
    }

    if (state.inviteAutoAccept) {
        const existingUser = getMaybeUser();
        if (existingUser) {
            ok(existingUser.userId !== state.createdByUserId, "Creating user cannot accept invite");
        }
        if (state.inviteAnonymous || existingUser) {
            const result = await accept(input);
            await addAcceptCookieState(state, response, result);

            const redirect = new URL(
                state.inviteRedirectUrl || "/",
                getOrigin()
            );
            response.header("Location", redirect.toString());
            response.status(302);
            response.send();
        }
        // Else default
    }

    return input;
}

async function addAcceptCookieState(from: InviteeState, response: FastifyReply, { user, role }: Result) {
    const cookieState = await addCookieState({
        userId: user.userId,
        roles: role.roles,
        from: {
            type: "invitee",
            createdAt: from.createdAt,
            data: from.data,
            from: from.from
        },
        data: from.data
    });
    setAuthenticationStateCookie(response, cookieState);
}

async function accept(input: Input): Promise<Result> {
    const {
        state,
        deletableStates
    } = input;
    const user = await getInviteeUser();
    const existingRole = await getUserAuthenticationRoleForUser(user);

    const role = await setUserAuthenticationRole({
        ...existingRole,
        userId: user.userId,
        expiresAt: user.expiresAt,
        roles: [...new Set<AuthenticationRole>([
            "member",
            ...(existingRole?.roles || []),
            ...(state.roles || [])
        ])]
    });

    for (const state of deletableStates) {
        await deleteAuthenticationState(state.stateId);
    }

    const maybe = getMaybeAuthenticationState();

    if (maybe?.stateId) {
        const updatedState = await setAuthenticationState({
            ...maybe,
            roles: [...new Set([
                ...maybe.roles,
                ...role.roles
            ])]
        });
        setAuthenticatedAuthenticationState(updatedState);
    }

    let changed;
    if (state.inviteChange) {
        changed = await change(state.inviteChange)
    }

    return {
        role,
        user,
        changed
    };

    async function getInviteeUser() {
        const maybe = getMaybeUser();
        if (state.externalId) {
            return getExternalUser("invitee", state.externalId, maybe);
        }
        if (maybe) return maybe;
        ok(state.inviteAnonymous, "Expected authenticated user to accept invite");
        return addAnonymousUser();
    }
}

export async function submit(request: FastifyRequest<InputSchema>, response: FastifyReply, input: Input) {
    const {
        stateId,
        state
    } = input;

    if (isUnauthenticated() && (!input.state.inviteAnonymous || request.body.submit === "login")) {
        let expiresAt = getExpiresAt(DEFAULT_INVITEE_EXCHANGE_STATE_EXPIRES_MS);
        // Ensure it can't be used longer than the base invite
        if (new Date(expiresAt).getTime() > new Date(state.expiresAt).getTime()) {
            expiresAt = state.expiresAt;
        }

        const url = new URL(LOGIN_URL || DEFAULT_LOGIN_URL, getOrigin());

        // The exchange state is not the same as the base invitee state with a token
        // A base invitee state MUST have a token, which this does not
        // So they cannot be interchanged, the types are also different...
        const exchangeState = await addAuthenticationState({
            type: "exchange",
            exchange: true,
            // Reference the original stateKey
            userState: stateId,
            // Shorter lived
            expiresAt,
            redirectUrl: url.toString(),
        });

        url.searchParams.set("state", exchangeState.stateId);

        response.status(302);
        response.header("Location", url.toString());
        response.send("Redirecting...");
        return;
    }

    const result = await accept(input);
    await addAcceptCookieState(state, response, result);

    if (state.inviteRedirectUrl) {
        const redirect = new URL(
            state.inviteRedirectUrl,
            getOrigin()
        );
        response.header("Location", redirect.toString());
        response.status(302);
        response.send();
    }

    return result;
}

export function AcceptInvite() {

    const { state } = useInput<Input>();
    const body = useMaybeBody<Body>();
    const error = useError();
    const { url, isUnauthenticated } = useData();
    const { searchParams } = new URL(url);
    const result = useMaybeResult<Result>();

    console.error(error);

    return <Body body={body} />

    function Body({ body }: { body?: Body }) {

        let submit = (
            <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
            >
                Accept Invite
            </button>
        )

        if (!result) {
            const loginUrl = new URL(url);
            loginUrl.searchParams.set("login", "true");
            if (state.inviteAnonymous) {
                if (isUnauthenticated) {
                    submit = (
                        <>
                            {submit}
                            <button
                                type="submit"
                                formAction={loginUrl.toString()}
                                className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                            >
                                Login & Accept Invite
                            </button>
                        </>
                    )
                }
            } else if (isUnauthenticated) {
                submit = (
                    <button
                        type="submit"
                        formAction={loginUrl.toString()}
                        className="bg-sky-500 hover:bg-sky-700 px-4 py-2.5 text-sm leading-5 rounded-md font-semibold text-white"
                    >
                        Login & Accept Invite
                    </button>
                )
            }
        }

        return (
            <form name="accept-invite" action={`${url.toString()}#action-section`} method="post">
                {!result ? (
                    <>
                        <input name="stateKey" value={body?.stateKey ?? searchParams.get("state") ?? searchParams.get("stateKey")} type="hidden" />
                        <input name="token" value={body?.token ?? searchParams.get("token")} type="hidden" />
                        <div id="action-section">
                            {submit}
                        </div>
                    </>
                ) : undefined}
                {error ? (
                    <>
                        <hr className="my-8" />
                        <div className="pointer-events-auto flex items-center justify-between gap-x-6 bg-red-400 px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
                            <p className="text-sm leading-6 text-white">
                                {error instanceof Error ? error.message : String(error)}
                            </p>
                        </div>
                        <hr className="my-8" />
                    </>
                ) : undefined}
                {
                    result ? (
                        <div>
                            <br />
                            <br />
                            <p>
                                Assigned role{result.role.roles.length > 1 ? "s" : ""}: {result.role.roles.map(value => `"${value}"`).join(", ")}
                            </p>
                        </div>
                    ) : undefined
                }
            </form>
        )
    }

}

export const Component = AcceptInvite;