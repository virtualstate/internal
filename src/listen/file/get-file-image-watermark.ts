import {FastifyInstance} from "fastify";
import {join} from "node:path";
import {root} from "../../package";
import {readFile} from "node:fs/promises";
import {DOMParser, XMLSerializer} from "xmldom";

export async function getFileImageWatermarkRoutes(fastify: FastifyInstance) {

    {
        type Schema = {
            Querystring: {
                name: string
                community?: string
                foreground?: string;
                background?: string;
            }
        }
        const querystring = {
            type: "object",
            properties: {
                name: {
                    type: "string"
                },
                community: {
                    type: "string",
                    nullable: true
                },
                foreground: {
                    type: "string",
                    nullable: true
                },
                background: {
                    type: "string",
                    nullable: true
                }
            },
            required: ["name"]
        };

        const schema = {
            description: "Get a file image watermark with a name",
            tags: ["product"],
            summary: "",
            querystring,
            security: [
                {
                    apiKey: [] as string[],
                },
            ],
        };

        async function getSvg(query: Schema["Querystring"]) {
            const watermarkPath = join(root, "./public/named-watermark.svg");
            const watermarkFile = await readFile(watermarkPath, "utf-8");
            const doc = new DOMParser().parseFromString(watermarkFile, "image/svg+xml");

            const author = doc.getElementById("author");
            const authorRect = doc.getElementById("author-rect");
            const community = doc.getElementById("community");
            const communityRect = doc.getElementById("community-rect");

            author.textContent = query.name.substring(0, author.textContent.length);

            if (query.community) {
                community.textContent = query.community;
            } else {
                community.parentNode.removeChild(community);
                communityRect.parentNode.removeChild(communityRect);
            }

            if (query.foreground) {
                author.setAttribute("stroke", query.foreground);
                author.setAttribute("fill", query.foreground);
                community.setAttribute("stroke", query.foreground);
                community.setAttribute("fill", query.foreground);
            }

            if (query.background) {
                authorRect.setAttribute("stroke", query.background);
                authorRect.setAttribute("fill", query.background);
                communityRect.setAttribute("stroke", query.background);
                communityRect.setAttribute("fill", query.background);
            }

            return new XMLSerializer().serializeToString(doc);
        }

        try {
            fastify.get<Schema>("/watermark/named.svg", {
                schema,
                async handler(request, response) {
                    const svg = await getSvg(request.query);
                    response.header("Content-Type", "image/svg+xml");
                    response.send(svg);
                }
            })
        } catch {}

        try {
            fastify.get<Schema>("/watermark/named.png", {
                schema,
                async handler(request, response) {
                    const svg = await getSvg(request.query);
                    const { default: sharp } = await import("sharp");
                    const output = await sharp(Buffer.from(svg))
                        .png()
                        .toBuffer();
                    response.header("Content-Type", "image/png");
                    response.send(output);
                }
            })
        } catch {}
    }
}