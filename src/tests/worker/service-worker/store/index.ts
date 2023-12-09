import { store } from "./register";
import { Chance } from "chance";
import {ok} from "../../../../is";

const chance  = new Chance();

console.log("Creating user");
const userUrl = await store.post("user", {
    name: chance.name()
});
console.log({ userUrl });

const user = await store.get(userUrl);
console.log({ user });

await store.put(userUrl, {
    ...user,
    someDate: chance.date().toISOString()
});

const updatedUser = await store.get(userUrl);
console.log({ updatedUser });

await store.patch(userUrl, {
    someOtherDate: chance.date().toISOString()
});

const patchedUser = await store.get(userUrl);
console.log({ patchedUser });

const secondUserUrl = await store.post("user", {
    name: chance.name()
})
const thirdUserUrl = await store.post("user", {
    name: chance.name()
});

const companyUrl = await store.post("company", {
    name: chance.company()
});

const allKeys = await store.get()
const userKeys = await store.get("user");
const companyKeys = await store.get("company");

console.log({
    allKeys,
    userKeys,
    companyKeys
})

const initialUserKeyAll = allKeys.find((key: { url: string }) => key.url === userUrl)
const secondUserKeyAll = allKeys.find((key: { url: string }) => key.url === secondUserUrl)
const thirdUserKeyAll = allKeys.find((key: { url: string }) => key.url === thirdUserUrl)
const companyKeyAll = allKeys.find((key: { url: string }) => key.url === companyUrl)

const initialUserKey = userKeys.find((key: { url: string }) => key.url === userUrl)
const secondUserKey = userKeys.find((key: { url: string }) => key.url === secondUserUrl)
const thirdUserKey = userKeys.find((key: { url: string }) => key.url === thirdUserUrl)
const companyKey = companyKeys.find((key: { url: string }) => key.url === companyUrl)
const userCompanyKey = companyKeys.find((key: { url: string }) => key.url === userUrl)

ok(initialUserKeyAll);
ok(secondUserKeyAll);
ok(thirdUserKeyAll);
ok(companyKeyAll);

ok(initialUserKey);
ok(secondUserKey);
ok(thirdUserKey);
ok(companyKey);
ok(!userCompanyKey);

const companyHead = await store.head(companyUrl);
companyHead.forEach((value, key) => {
    console.log("Company Header", key, value);
})