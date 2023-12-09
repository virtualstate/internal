import {register} from "./registration";

const { a } = await register();

const responseA = await a.fetch("/", {
    method: "POST",
    body: JSON.stringify({
        limit: 3 + Math.round(Math.random() * 6)
    })
});

const final = await responseA.json();
console.log(final);

