import {FastifyInstance} from "fastify";
import {logoutResponse} from "./logout";
import {addAnonymousCookieState, getAuthenticationState, getExchangeStateURL, getInviteURL} from "../../data";
import {setAuthenticationStateCookie} from "../authentication";
import {getOrigin} from "../config";

export async function anonymousRoutes(fastify: FastifyInstance) {

    const {
        ALLOW_ANONYMOUS_USER
    } = process.env;

    if (!ALLOW_ANONYMOUS_USER) return;

    type Querystring = {
        redirect?: string;
        state?: string;
    }
    type Schema = {
        Querystring: Querystring
    };

    fastify.get<Schema>("/anonymous", {
        async handler(request, response) {
            await logoutResponse(response);

            const state = await addAnonymousCookieState();
            setAuthenticationStateCookie(response, state);

            const { state: userState, redirect } = request.query;

            const exchange = await getExchangeStateURL(userState);
            const location = exchange || redirect || "/home";

            response.header("Location", location);
            response.status(302);
            response.send();

        }
    })
}