import {getMaybePartner, getMaybeUser} from "../../../../authentication";
import {ok} from "../../../../is";
import {PaymentMethodOwnerIdentifiers} from "../../../../data";

export function getUserIdentifiers(): PaymentMethodOwnerIdentifiers {
    const userId = getMaybeUser()?.userId;
    const organisationId = getMaybePartner()?.organisationId;
    ok(userId || organisationId, "Expected user identifiers");
    return {
        userId,
        organisationId
    };
}