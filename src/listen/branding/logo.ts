import {FastifyInstance} from "fastify";
import {getBrandingLogo} from "../../branding";

export async function logoRoutes(fastify: FastifyInstance) {
    try {
        fastify.get("/logo", {
            async handler(request, response) {
                const { buffer, contentType, url } = await getBrandingLogo();
                if (!buffer) {
                    response.header("Location", url);
                    response.status(302);
                    response.send();
                } else {
                    response.header("Content-Type", contentType);
                    response.send(buffer);
                }
            }
        })
    } catch {}

}