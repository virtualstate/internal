import type {OrderCheckoutConfirmationComponentInfo} from "./checkout-confirmation";
import {ReactNode} from "react";

export interface InputConfig {
    name?: string;
    enabled?: boolean;
    props?: Record<string, unknown>;
}

export interface PaymentFormConfig extends Record<string, boolean | InputConfig> {
    nameOnCard?: boolean | InputConfig;
    cardNumber?: boolean | InputConfig;
    expirationMonth?: boolean | InputConfig;
    expirationYear?: boolean | InputConfig;
    cvc?: boolean | InputConfig;
    savePaymentMethod?: boolean | InputConfig;
}

export interface PaymentForm {
    url?: string;
    method?: "GET" | "POST"; // GET will remove all form input excluding the below data
    encoding?: "multipart/form-data" | string;
    data?: FormData;
    inputs?: PaymentFormConfig;
    header?: ReactNode;
    footer?: ReactNode;
    submit?: ReactNode;
}

export interface ReactOrderConfig {
    getPaymentForm?(info: OrderCheckoutConfirmationComponentInfo): Promise<string | PaymentForm>
}