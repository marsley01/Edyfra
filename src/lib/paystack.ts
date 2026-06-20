import axios from "axios";

function getPaystackSecret(): string {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not defined. Please check your environment variables.");
  }
  return secret;
}
const PAYSTACK_API_URL = "https://api.paystack.co";

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export const paystack = {
  /**
   * Initialize a transaction and get a checkout URL
   */
  async initializeTransaction(data: {
    email: string;
    amount: number; // in KES (or local currency)
    reference?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<PaystackInitializeResponse> {
    const response = await axios.post(
      `${PAYSTACK_API_URL}/transaction/initialize`,
      {
        ...data,
        amount: data.amount * 100, // Paystack expects amount in subunits (cents/pesewas/etc)
        currency: "KES",
      },
      {
        headers: {
          Authorization: `Bearer ${getPaystackSecret()}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  /**
   * Verify a transaction status
   */
  async verifyTransaction(reference: string) {
    const response = await axios.get(
      `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${getPaystackSecret()}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Create a transfer recipient (for payouts)
   */
  async createTransferRecipient(data: {
    type: "nuban" | "mobile_money";
    name: string;
    account_number: string;
    bank_code: string; // e.g., "MPESA"
    currency: "KES";
  }) {
    const response = await axios.post(
      `${PAYSTACK_API_URL}/transferrecipient`,
      data,
      {
        headers: {
          Authorization: `Bearer ${getPaystackSecret()}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  /**
   * Initiate a transfer
   */
  async initiateTransfer(data: {
    source: "balance";
    amount: number;
    recipient: string;
    reason?: string;
  }) {
    const response = await axios.post(
      `${PAYSTACK_API_URL}/transfer`,
      {
        ...data,
        amount: data.amount * 100,
        currency: "KES",
      },
      {
        headers: {
          Authorization: `Bearer ${getPaystackSecret()}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  }
};
