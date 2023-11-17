import {FastifyInstance} from "fastify";
import {getBrandingPalette} from "../../branding";

export async function paletteRoutes(fastify: FastifyInstance) {
    try {
        fastify.get("/palette", {
            async handler(request, response) {
                const palette = await getBrandingPalette();
                response.send(palette);
            }
        })
    } catch {}

}