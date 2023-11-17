import {FastifyInstance, FastifyRequest} from "fastify";
import { ok } from "../../is";
import { getOrigin } from "../config";
import {
  addCookieState,
  setAuthenticationState,
  getAuthenticationState,
  DEFAULT_AUTHSIGNAL_STATE_EXPIRES_MS,
  deleteAuthenticationState,
  getExternalUser,
  getInviteURL,
  getUserAuthenticationRoleForUser,
  AuthenticationRole, getExternalReference, getExchangeStateURL,
} from "../../data";
import {
  authsignal,
  AUTHSIGNAL_REDIRECT_URL,
  AUTHSIGNAL_TENANT,
} from "../../authentication/authsignal";
import { createHash } from "crypto";
import { getClientIp } from "request-ip";
import {v4, validate} from "uuid";
import jsonwebtoken from "jsonwebtoken";
import { getExpiresAt } from "../../data/expiring-kv";
import "@fastify/cookie";
import {setUserCredential} from "../../data/user-credential";
import {getMaybeAuthenticationState, getMaybeUser} from "../../authentication";
import {authenticate, setAuthenticationStateCookie} from "../authentication";

ok(jsonwebtoken.decode);

export async function authsignalAuthenticationRoutes(fastify: FastifyInstance) {

  if (!AUTHSIGNAL_TENANT) return;

  {
    const querystring = {
      type: "object",
      properties: {
        token: {
          type: "string",
        },
        credentialId: {
          type: "string",
          nullable: true
        },
        deviceId: {
          type: "string",
          nullable: true
        },
        name: {
          type: "string",
          nullable: true
        },
        verifiedAt: {
          type: "string",
          nullable: true
        }
      },
      required: ["token"],
    };
    type Schema = {
      Querystring: {
        token: string;
        credentialId?: string;
        deviceId?: string;
        name?: string;
        verifiedAt?: string;
      };
    };
    const schema = {
      querystring,
      tags: ["system"],
    };
    fastify.get<Schema>("/authsignal/callback", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request, response) {
        const { token, credentialId } = request.query;

        const decoded = jsonwebtoken.decode(token, {
          json: true,
        });

        ok(decoded, "Expected JWT token response");

        const {
          sub,
          other: { idempotencyKey, tenantId },
        } = decoded;

        ok(tenantId === AUTHSIGNAL_TENANT, "Expected tenantId to match");

        const state = await getAuthenticationState(idempotencyKey);

        ok(state, "Expected to find authentication state");

        const { type, userId, userState, authenticatorUserId, authenticatorType } = state;

        ok(type === "authsignal", "Expected type to be authsignal");
        ok(userId === sub, "Expected token subject to match our given userId");

        const { success } = await authsignal.validateChallenge({
          token,
        });

        console.log({ userState, success });

        await deleteAuthenticationState(state.stateId);

        if (!success) {
          const { origin } = new URL(state.redirectUrl || getOrigin());
          const url = new URL("/login", origin);
          const error = "Failed to authenticate";
          url.searchParams.set("error", error);
          if (userState) {
            url.searchParams.set("state", userState);
          }
          response.header("Location", url.toString());
          response.status(302);
          response.send(error);
          return;
        }

        const existingUser = getMaybeUser();
        const user = await getExternalUser("authsignal", userId, existingUser);

        let userCredential;
        if (credentialId) {
          const { deviceId, name, verifiedAt } = request.query;
          userCredential = await setUserCredential({
            userId: user.userId,
            credentialId,
            deviceId,
            name,
            verifiedAt,
            authenticatorUserId: (
                typeof authenticatorUserId === "string" ?
                    authenticatorUserId :
                    undefined
            ),
            authenticatorType: (
                typeof authenticatorType === "string" ?
                    authenticatorType :
                    undefined
            ),
          });
        }

        if (!existingUser) {
          const userRoles = await getUserAuthenticationRoleForUser(user);

          const cookieState = await addCookieState({
            userId: user.userId,
            roles: [...new Set<AuthenticationRole>([
              // We have no additional roles with this authentication method
              // Just give member, no trusted roles
              "member",
              ...(userRoles?.roles ?? [])
            ])],
            from: {
              type: "authsignal",
              createdAt: state.createdAt,
              data: state.data,
              from: state.from
            },
            userCredentialId: userCredential?.userCredentialId,
            data: state.data
          });

          setAuthenticationStateCookie(response, cookieState);
        }

        const exchange = await getExchangeStateURL(userState);
        const location = exchange || "/home";

        response.header("Location", location);
        response.status(302);
        response.send();

      },
    });
  }

  {
    const querystring = {
      type: "object",
      properties: {
        state: {
          type: "string",
          nullable: true,
        },
      }
    }
    const body = {
      type: "object",
      properties: {
        email: {
          type: "string",
          nullable: true,
        },
        deviceId: {
          type: "string",
          nullable: true,
        },
        state: {
          type: "string",
          nullable: true,
        },
        actionCode: {
          type: "string",
          nullable: true,
        },
        authenticatorUserId: {
          type: "string",
          nullable: true
        },
        authenticatorType: {
          type: "string",
          nullable: true
        },
        register: {
          type: "boolean",
          nullable: true
        }
      }
    };
    type Schema = {
      Body: {
        email?: string;
        actionCode?: string;
        deviceId?: string;
        state?: string;
        authenticatorUserId?: string;
        authenticatorType?: string;
        register?: boolean;
      };
      Querystring: {
        state?: string
      }
    };

    async function getAuthsignalState(request: FastifyRequest<Schema>) {
      const { email, deviceId, state: userStateBody, actionCode: givenActionCode, authenticatorUserId: givenAuthenticatorUserId, authenticatorType, register } = request.body;
      const { state: userStateQuery } = request.query;
      const userState = userStateBody || userStateQuery;

      const hash = createHash("sha256");
      hash.update(AUTHSIGNAL_TENANT);
      let authenticatorUserId = givenAuthenticatorUserId;
      if (email) {
        hash.update(email);
      } else {
        authenticatorUserId = (authenticatorUserId && validate(authenticatorUserId)) ? authenticatorUserId : v4();
        hash.update(authenticatorUserId);
      }
      const userId = hash.digest().toString("hex");

      const externalUser = await getExternalReference("authsignal", userId);
      const existingUser = getMaybeUser();

      if (externalUser && existingUser && externalUser.userId !== existingUser.userId) {
        throw new Error("Expected user to be logged in");
      }

      const { isEnrolled, enrolledVerificationMethods = [] } = await authsignal.getUser({
        userId,
      });

      const redirectUrl =
          AUTHSIGNAL_REDIRECT_URL ||
          `${getOrigin()}${fastify.prefix}/authsignal/callback`;

      const actionCode = register ?
          "enroll" :
          (
              isEnrolled ?
                  (givenActionCode || "authenticate") :
                  "enroll"
          );
      const ipAddress = getClientIp(request.raw);

      const stateId = v4();
      const idempotencyKey = stateId;

      const {
        state,
        url,
        idempotencyKey: returnedIdempotencyKey,
        token
      } = await authsignal.track({
        action: actionCode,
        userId,
        email,
        idempotencyKey,
        deviceId: deviceId || undefined,
        userAgent: request.headers["user-agent"],
        ipAddress: ipAddress || undefined,
        redirectUrl,
        scope: register ? "enroll" : undefined
      });

      const currentState = getMaybeAuthenticationState();

      const authenticationState = await setAuthenticationState({
        type: "authsignal",
        stateId,
        userId,
        externalKey: idempotencyKey,
        redirectUrl,
        authsignalState: state,
        authsignalActionCode: actionCode,
        authsignalEnrolledVerificationMethods: enrolledVerificationMethods,
        expiresAt: getExpiresAt(DEFAULT_AUTHSIGNAL_STATE_EXPIRES_MS),
        userState,
        authenticatorUserId,
        authenticatorType: authenticatorType ?? "user",
        from: currentState ? {
          type: currentState.type,
          stateId: currentState.stateId,
          createdAt: currentState.createdAt,
          from: currentState.from
        } : undefined
      });

      return {
        authenticationState,
        enrolledVerificationMethods,
        url,
        token,
        returnedIdempotencyKey
      } as const;
    }

    const schema = {
      body,
      querystring,
      tags: ["system"],
    };

    fastify.post<Schema>("/authsignal/redirect", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request, response) {
        const {
          url,
          authenticationState
        } = await getAuthsignalState(request);

        response.header("Location", url);
        if (authenticationState.expiresAt) {
          response.header("X-Expires-At", authenticationState.expiresAt);
        }

        response.status(302);
        response.send("Redirecting");
      },
    });

    fastify.post<Schema>("/authsignal/track", {
      schema,
      preHandler: authenticate(fastify, { anonymous: true }),
      async handler(request, response) {
        const {
          token,
          url,
          enrolledVerificationMethods,
          authenticationState
        } = await getAuthsignalState(request);

        response.send({
          url,
          token,
          enrolledVerificationMethods,
          redirectUrl: authenticationState.redirectUrl
        });
      },
    });


  }
}
