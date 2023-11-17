import {ok} from "../is";
import {Transporter, SendMailOptions} from "nodemailer";
import {DurableEventData, DurableEventSchedule} from "../data";
import {on, dispatchEvent} from "../events";
import {
    MAIL_FROM,
    MAIL_SENDER,
    MAIL_PASSWORD,
    MAIL_USERNAME,
    MAIL_MAILER,
    MAIL_URL,
    MAIL_HOST,
    MAIL_PORT,
    MAIL_SENDMAIL_PATH,
    MAIL_MAILGUN_API_KEY,
    MAIL_MAILGUN_DOMAIN,
    MAIL_ENCRYPTION,
    MAIL_REPLY_TO
} from "../config";

export interface EmailOptions extends SendMailOptions {
    schedule?: DurableEventSchedule;
}

export async function email(options: EmailOptions) {
    const { schedule, ...emailOptions } = options;
    if (schedule) {
        const event: ScheduledEmailEvent = {
            type: EMAIL,
            email: emailOptions,
            schedule
        };
        return dispatchEvent(event);
    }
    const transport = await getNodemailerTransport();
    return transport.sendMail({
        from: MAIL_FROM,
        sender: MAIL_SENDER,
        replyTo: MAIL_REPLY_TO,
        ...emailOptions
    });
}

let transport: Transporter<unknown>;

export async function getNodemailerTransport(): Promise<Transporter<unknown>> {
    if (transport) return transport;
    return transport = await getTransport();

    async function getTransport() {

        const nodemailer = await import("nodemailer");

        if (MAIL_MAILER === "mailgun") {
            const { default: mailgun } = await import("nodemailer-mailgun-transport");
            return nodemailer.createTransport(mailgun({
                auth: {
                    domain: MAIL_MAILGUN_DOMAIN || MAIL_USERNAME,
                    api_key: MAIL_MAILGUN_API_KEY || MAIL_PASSWORD
                }
            }));
        }

        if (MAIL_MAILER === "sendmail") {
            return nodemailer.createTransport({
                sendmail: true,
                path: MAIL_SENDMAIL_PATH
            });
        }

        ok(!MAIL_MAILER || MAIL_MAILER === "smtp", `Unsupported MAIL_MAILER "${MAIL_MAILER}"`);
        return nodemailer.createTransport({
            url: MAIL_URL,
            host: MAIL_HOST,
            port: MAIL_PORT ? +MAIL_PORT : undefined,
            auth: (MAIL_USERNAME || MAIL_PASSWORD) ? {
                user: MAIL_USERNAME,
                pass: MAIL_PASSWORD
            } : undefined,
            tls: {
                rejectUnauthorized: MAIL_ENCRYPTION === "tls"
            }
        });
    }
}

const EMAIL = "email" as const;
type ScheduleEmailEventType = typeof EMAIL;

export interface ScheduledEmailEvent extends DurableEventData {
    type: ScheduleEmailEventType;
    email: SendMailOptions;
}

export const removeEmailScheduledFunction = on(EMAIL, async (event: ScheduledEmailEvent) => {
    if (event.email) {
        await email(event.email);
    }
});