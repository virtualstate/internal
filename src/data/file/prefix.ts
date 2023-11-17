import {getAuthenticatedContext} from "../../authentication";
import {
    MEDIA_PARTNER_PREFIX,
    MEDIA_PARTNER_PREFIX_TEMPLATE,
    MEDIA_USER_PREFIX,
    MEDIA_USER_PREFIX_TEMPLATE
} from "../../config";
import {join} from "node:path";

export function joinMediaPrefix(key: string) {
    const prefix = getMediaPrefix();
    if (!prefix) {
        return key;
    }
    return join(prefix, key);
}

export function getMediaPrefix() {
    const {
        partner,
        user,
        partnerId,
        userId,
        organisationId
    } = getAuthenticatedContext();
    if (partner) {
        return getWithTemplate(
            partnerId,
            MEDIA_PARTNER_PREFIX_TEMPLATE,
            MEDIA_PARTNER_PREFIX || "partner"
        );
    }
    if (user) {
        return getWithTemplate(
            userId,
            MEDIA_USER_PREFIX_TEMPLATE,
            MEDIA_USER_PREFIX || "user"
        );
    }
    throw new Error("User type required for media prefix");

    function getWithTemplate(id: string, template?: string, prefix?: string) {
        if (template) {
            return template
                .replaceAll(":partnerId", partnerId)
                .replaceAll(":userId", userId)
                .replaceAll(":organisationId", organisationId)
                .replaceAll(":id", id);
        }
        return join(prefix, id);
    }
}