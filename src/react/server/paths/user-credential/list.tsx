import {useData, useInput} from "../../data";
import {getUser} from "../../../../authentication";
import {listUserCredentials, UserCredential} from "../../../../data";

export const path = "/user-credentials";

export interface UserCredentialsListInfo {
    userCredentials: UserCredential[]
}

export async function handler() {
    return {
        userCredentials: await listUserCredentials((await getUser()).userId)
    }
}

const LINK_CLASS = "text-blue-600 hover:bg-white underline hover:underline-offset-2";

export function ListCredentials() {
    const { userCredentials } = useInput<UserCredentialsListInfo>()
    const { isUnauthenticated, url } = useData();
    const { pathname } = new URL(url);
    return (
        <div className="flex flex-col">
            {/*<a href="/user-credential/create" className={LINK_CLASS}>Create Credential</a>*/}
            <div className="flex flex-col divide-y">
                {userCredentials.map(userCredential => (
                    <div key={userCredential.userCredentialId} className="flex flex-row justify-between">
                        <div className="flex flex-col">
                            <span>{userCredential.authenticatorType}</span>
                            <span className="text-sm text-gray-700">{userCredential.credentialId}</span>
                        </div>
                        <div>
                            <a href={`/api/version/1/users/${userCredential.userId}/credentials/${userCredential.userCredentialId}/delete?redirect=${pathname}`} className={LINK_CLASS}>
                                Delete
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const Component = ListCredentials;