import axios, { AxiosError } from "axios";

function getMpesaConfig() {
  const config = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    callbackUrl: process.env.MPESA_CALLBACK_URL,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing M-Pesa environment variables: ${missing.join(", ")}`);
  }

  return config;
}

const isSandbox = () => (process.env.MPESA_ENV || "sandbox") !== "production";

function getBaseUrl() {
  return isSandbox()
    ? "https://sandbox.safaricom.co.ke"
    : "https://api.safaricom.co.ke";
}

/**
 * Get Safaricom Access Token
 */
export async function getMpesaToken() {
  const cfg = getMpesaConfig();
  const auth = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");
  
  try {
    const { data } = await axios.get(
      `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return data.access_token;
  } catch (error) {
    const err = error as AxiosError<{ errorMessage?: string }>;
    console.error("[Mpesa] OAuth Error:", err.response?.data || err.message);
    throw new Error("Failed to get M-Pesa access token");
  }
}

/**
 * Initiate M-Pesa STK Push
 */
export async function initiateStkPush({
  phone,
  amount,
  reference,
  description,
}: {
  phone: string;
  amount: number;
  reference: string;
  description: string;
}) {
  const cfg = getMpesaConfig();
  const token = await getMpesaToken();
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const password = Buffer.from(
    `${cfg.shortcode}${cfg.passkey}${timestamp}`
  ).toString("base64");

  // Format phone: must be 2547XXXXXXXX
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.slice(1);
  if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.slice(1);
  if (!formattedPhone.startsWith("254")) formattedPhone = "254" + formattedPhone;

  try {
    const { data } = await axios.post(
      `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: cfg.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: cfg.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: cfg.callbackUrl,
        AccountReference: reference,
        TransactionDesc: description,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data;
  } catch (error) {
    const err = error as AxiosError<{ errorMessage?: string }>;
    console.error("[Mpesa] STK Push Error:", err.response?.data || err.message);
    throw new Error((err.response?.data as { errorMessage?: string } | undefined)?.errorMessage || "Failed to initiate M-Pesa payment");
  }
}

/**
 * Initiate M-Pesa B2C Payout (Tutor Earnings or Refunds)
 */
export async function initiateB2CPayout({
  phone,
  amount,
  reference,
  remarks,
}: {
  phone: string;
  amount: number;
  reference: string;
  remarks: string;
}) {
  const cfg = getMpesaConfig();
  const token = await getMpesaToken();
  
  // Format phone
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.slice(1);
  if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.slice(1);

  try {
    const securityCredential = process.env.MPESA_B2C_SECURITY_CREDENTIAL;
    if (!securityCredential) {
      throw new Error("MPESA_B2C_SECURITY_CREDENTIAL is not configured. Generate it using Safaricom's public certificate.");
    }

    const { data } = await axios.post(
      `${getBaseUrl()}/mpesa/b2c/v1/paymentrequest`,
      {
        InitiatorName: "EdyfraAdmin",
        SecurityCredential: securityCredential,
        CommandID: "BusinessPayment", // or SalaryPayment
        Amount: Math.round(amount),
        PartyA: cfg.shortcode,
        PartyB: formattedPhone,
        Remarks: remarks,
        QueueTimeOutURL: `${cfg.callbackUrl}/timeout`,
        ResultURL: `${cfg.callbackUrl}/b2c`,
        Occasion: reference,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data;
  } catch (error) {
    const err = error as AxiosError;
    console.error("[Mpesa] B2C Error:", err.response?.data || err.message);
    throw new Error("Failed to initiate M-Pesa payout");
  }
}
