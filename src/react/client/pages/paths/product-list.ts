import {ok} from "../../utils";

export async function productList() {

    const list = document.getElementById("product-list");
    ok(list);

    const knownAnchors = new WeakSet();

    setup();

    function setup() {
        const anchors = list.querySelectorAll("a[href^='/api']");
        // console.log(anchors.length);

        for (let i = 0; i < anchors.length; i += 1) {
            const anchor = anchors.item(i);
            setupAnchor(anchor);
        }

        function setupAnchor(anchor: Element) {
            if (knownAnchors.has(anchor)) return;
            knownAnchors.add(anchor);

            anchor.addEventListener("click", (event) => {
                event.preventDefault();
                ok<HTMLAnchorElement>(anchor);

                anchor.classList.add("loading");
                anchor.classList.remove("error");
                anchor.classList.remove("loaded");

                void run()
                    .then(() => {
                        anchor.classList.add("loaded");
                        anchor.classList.remove("error");
                    })
                    .catch((error) => {
                        console.error(`Error loading ${anchor.href}`);
                        console.error(error);
                        anchor.classList.add("error");
                    })
                    .finally(() => {
                        anchor.classList.remove("loading");
                    })
            });

            async function run() {
                ok<HTMLAnchorElement>(anchor);
                const { href } = anchor;
                const url = new URL(href);
                // Remove any redirect functionality
                url.searchParams.delete("redirect");
                const response = await fetch(url);
                ok(response.ok);
                // Let it be empty but resolved... ? idk
                await response.text();
                const parent = anchor.closest("[id]");
                if (!parent) return location.reload(); // Fallback
                await reload(
                    `#${parent.getAttribute("id")}`,
                    ".dynamic-sidebar-mobile nav",
                    ".dynamic-sidebar-desktop nav"
                );
            }
        }

        async function reload(...selectors: string[]) {
            const url = new URL(location.href);

            const response = await fetch(url);
            ok(response.ok);
            const text = await response.text();

            const template = document.createElement("template");

            template.innerHTML = text;

            for (const selector of selectors) {

                const elements = template.content.querySelectorAll(selector);

                if (!elements.length) {
                    console.log(`Expected ${selector} to be in returned`);
                    continue;
                }
                if (elements.length > 1) {
                    console.log(`Expected 1 instance of ${selector} to be in returned`);
                    continue;
                }

                const element = elements.item(0);

                const cloned = element.cloneNode(true);

                const target = document.querySelector(selector);

                if (!target) {
                    console.log(`Expected target for ${selector}`);
                    continue;
                }

                target.replaceWith(cloned);
            }

            setup();
        }
    }

}