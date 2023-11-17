import {FastifyInstance, FastifyReply, FastifyRequest} from "fastify";
import {
    getUserCredential,
    deleteUserCredential,
} from "../../data";
import { authenticate } from "../authentication";
import { getUser } from "../../authentication";
import {ok} from "../../is";

export async function deleteUserCredentialRoutes(fastify: FastifyInstance) {

    type Querystring = {
        redirect?: string;
    }

    try {

        type Params = {
            userId: string;
            userCredentialId: string;
        }

        type Schema = {
            Querystring: Querystring
            Params: Params
        };

        const params = {
            type: "object",
            properties: {
                userId: {
                    type: "string"
                },
                userCredentialId: {
                    type: "string"
                }
            },
            required: ["userId", "userCredentialId"]
        };

        const schema = {
            description: "Delete a user credential",
            tags: ["user credential"],
            summary: "",
            params,
            security: [
                {
                    apiKey: [] as string[],
                },
            ],
        };
        async function handler(request: FastifyRequest<Schema>, response: FastifyReply) {
            const { userCredentialId, userId } = request.params;
            const user = getUser();
            ok(user.userId === userId, "Expected userId to match");
            const userCredential = await getUserCredential({
                userCredentialId,
                userId,
            });
            if (!userCredential) {
                response.status(404);
                response.send();
                return;
            }
            await deleteUserCredential(userCredential);
            const { redirect } = request.query;
            if (redirect) {
                response.header("Location", redirect);
                response.status(302);
                response.send();
                return;
            }
            response.status(204);
            response.send();
        }

        fastify.delete<Schema>("/:userCredentialId", {
            schema,
            preHandler: authenticate(fastify),
            handler,
        });
        fastify.get<Schema>("/:userCredentialId/delete", {
            schema,
            preHandler: authenticate(fastify),
            handler,
        });
    } catch {}
}
