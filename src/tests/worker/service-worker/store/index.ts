import {arrayBuffer, blob, formData, json, text} from "./register";
import { Chance } from "chance";
import {ok} from "../../../../is";

const chance  = new Chance();

console.log("Creating user");
const userUrl = await json.post("user", {
    name: chance.name()
});
console.log({ userUrl });

const user = await json.get(userUrl);
console.log({ user });

await json.put(userUrl, {
    ...user,
    someDate: chance.date().toISOString()
});

const updatedUser = await json.get(userUrl);
console.log({ updatedUser });

await json.patch(userUrl, {
    someOtherDate: chance.date().toISOString()
});

const patchedUser = await json.get(userUrl);
console.log({ patchedUser });

const secondUserUrl = await json.post("user", {
    name: chance.name()
})
const thirdUserUrl = await json.post("user", {
    name: chance.name()
});

const companyUrl = await json.post("company", {
    name: chance.company()
});

const allKeys = await json.get()
const userKeys = await json.get("user");
const companyKeys = await json.get("company");

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

const companyHead = await json.head(companyUrl);
companyHead.forEach((value, key) => {
    console.log("Company Header", key, value);
})


const noteUrl = await text.post("note", "Initial text note");

await text.put(noteUrl, "Updated note text");

console.log(await text.head(noteUrl));
console.log(await text.get(noteUrl));

const encoder = new TextEncoder();

const data = new FormData();
data.append("name", chance.name());
data.append("blob", new Blob([], { type: "text/csv" }));
data.append("file", new File([encoder.encode(JSON.stringify("hello"))], "file.json"));
data.append("message", chance.paragraph());

const submittedUrl = await formData.post("feedback", data);

const submittedData = await formData.get(submittedUrl);
console.log(submittedData);

const submittedBlobUrl = await blob.post("file", new Blob([
    encoder.encode(JSON.stringify("hello"))
], { type: "application/json" }));
const submittedBlob = await blob.get(submittedBlobUrl);
console.log(submittedBlob);

const submittedArrayBufferUrl = await arrayBuffer.post("file", encoder.encode(JSON.stringify("hello")).buffer);
const submittedArrayBuffer = await arrayBuffer.get(submittedArrayBufferUrl);
console.log(submittedArrayBuffer);