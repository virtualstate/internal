import { listen } from "../listen";
import {getOrigin} from "../listen/config";
import {Client} from "../client";
import {Chance} from "chance"
import {ok} from "../is";

const chance = new Chance();

{

  const close = await listen();

  const url = getOrigin();

  const publicClient = new Client({
    url
  });

  ok(Array.isArray(await publicClient.listPartners()));

  const partnerName = chance.company();
  const location = chance.city();

  const countryCode = Math.random() > 0.5 ? "NZ" : "CA"

  const { partnerId, accessToken } = await publicClient.addPartner({
    partnerName,
    location,
    countryCode
  });

  ok(accessToken);

  {
    const client = new Client({
      url,
      partnerId,
      accessToken
    });

    console.log(client);

    // Seed 1 will re-run any seeding that can be done in the background task
    // This should be fine to run over and over with no worries
    await client.background({
      seed: "1"
    });

    // Running background tasks with no seeding, will just run anything in the queue
    await client.background();

    ok(Array.isArray(await client.listSystemLogs()));

    const partners = await client.listPartners();
    const partner = partners.find(partner => partner.partnerId === partnerId);
    ok(partner);

    // There should be seeded partners available
    ok(partners.length > 1);

    console.log(partners);
  }

  await close();
}