import axios from "axios";

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

const IS_SANDBOX = true; // Set to false for production Safaricom API

const BASE_URL = IS_SANDBOX 
  ? "https://sandbox.safaricom.co.ke" 
  : "https://api.safaricom.co.ke";

/**
 * Get Safaricom Access Token
 */
export async function getMpesaToken() {
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  
  try {
    const { data } = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return data.access_token;
  } catch (error: any) {
    console.error("[Mpesa] OAuth Error:", error.response?.data || error.message);
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
  const token = await getMpesaToken();
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const password = Buffer.from(
    `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  ).toString("base64");

  // Format phone: must be 2547XXXXXXXX
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.slice(1);
  if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.slice(1);
  if (!formattedPhone.startsWith("254")) formattedPhone = "254" + formattedPhone;

  try {
    const { data } = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: MPESA_CALLBACK_URL,
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
  } catch (error: any) {
    console.error("[Mpesa] STK Push Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || "Failed to initiate M-Pesa payment");
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
  const token = await getMpesaToken();
  
  // Format phone
  let formattedPhone = phone.replace(/\D/g, "");
  if (formattedPhone.startsWith("0")) formattedPhone = "254" + formattedPhone.slice(1);
  if (formattedPhone.startsWith("+")) formattedPhone = formattedPhone.slice(1);

  try {
    const { data } = await axios.post(
      `${BASE_URL}/mpesa/b2c/v1/paymentrequest`,
      {
        InitiatorName: "EdyfraAdmin",
        SecurityCredential: "YOUR_ENCRYPTED_PASSWORD", // Needs Safaricom certificate encryption
        CommandID: "BusinessPayment", // or SalaryPayment
        Amount: Math.round(amount),
        PartyA: MPESA_SHORTCODE,
        PartyB: formattedPhone,
        Remarks: remarks,
        QueueTimeOutURL: `${MPESA_CALLBACK_URL}/timeout`,
        ResultURL: `${MPESA_CALLBACK_URL}/b2c`,
        Occasion: reference,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data;
  } catch (error: any) {
    console.error("[Mpesa] B2C Error:", error.response?.data || error.message);
    throw new Error("Failed to initiate M-Pesa payout");
  }
}
