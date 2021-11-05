import {h, createFragment, VNode} from "@virtualstate/fringe";
import {addEventListener} from "../environment/environment";
import {fetch} from "../fetch/fetch";
import {Request} from "@opennetwork/http-representation";
import {v4} from "uuid";
import {getEvent} from "../events/event/dispatcher";
import {FetchEvent} from "../fetch/event";
import {RenderEvent} from "../render/render";
import {addRequestEventHandler} from "./event";

async function Layout({ title, script, class: mainClass, id }: Record<string, unknown>, child: VNode) {
    const response = await fetch("/data", {
        method: "GET"
    });
    const data = await response.text();
    return (
        <>
            <h1>{title ?? "Hello"}</h1>
            <main class={`${id}-main ${mainClass}`}>
                {child ?? (
                    <>
                        <p>Content loading</p>
                    </>
                )}
            </main>
            <footer>
                <a href="https://example.com" target="_blank">example.com</a>
            </footer>
            <script type="application/json" id="data">{data}</script>
            {script}
        </>
    )
}

function getId({ searchParams }: URL) {
    return /^[a-z0-9-_+]+$/.test(searchParams.get("id") ?? "") ? searchParams.get("id") : v4();
}

function addRenderEventListener(options: { method?: string | RegExp, pathname?: string | RegExp }, fn: ((event: RenderEvent & { url: URL }) => Promise<void> | void)): void {
    addRequestEventHandler("render", options, fn);
}

addRenderEventListener({ method: "GET", pathname: "/template" }, ({ render, url }) => {
    const id = getId(url);
    return render(
        <template id={`template-${id}`}>
            <Layout
                id={id}
                title={`In Template ${id}!`}
                class={`templated-${id}`}
                script={
                    <script type="module" src="/template-script">
                    </script>
                }
            >
                <p key="zee">Content loaded</p>
                <p attr={false} other={true} value={1} one="two">Content there</p>
            </Layout>
        </template>
    )
})

addRenderEventListener({ method: "GET" }, ({ render, url }) => {
    const id = getId(url);
    return render(
        <html>
            <head>
                <title>My Website</title>
            </head>
            <body>
            <Layout
                id={id}
                script={
                    <>
                        <script type="module">
                            {`
    window.data = JSON.parse(
        document.querySelector("script#data").textContent
    );
    `}
                        </script>
                        <script type="module">
                            {`
    const response = await fetch("/template?id=${id}");
    const templateHTML = await response.text();
    const templateRoot = document.createElement("div");
    templateRoot.innerHTML = templateHTML;
    const template = templateRoot.querySelector("template");
    if (template) {
        const imports = getImports(template.content);
        const existing = getImports(document);
        const remaining = imports.filter(src => !existing.includes(src));
        template.content.querySelectorAll("script[src]").forEach(element => element.remove());
        document.body.replaceChildren(...Array.from(template.content.children));
        await Promise.all(imports.map(src => import(src)));
    }
    
    function getImports(root) {
        const scripts = Array.from(root.querySelectorAll("script[type=module][src]"));
        return scripts.map(script => script.getAttribute("src"));
    }
                                    `.trim()}
                        </script>
                        <script type="module" src="/browser-script">
                        </script>
                    </>
                }
            />
            </body>
        </html>
    )
});
