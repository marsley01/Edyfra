import { AppError } from "@/core/errors";
import { logger } from "@/core/logging";
import { eventBus } from "@/core/events";

export type PaymentProvider = "mpesa" | "paystack" | "stripe";

export interface PaymentRequest {
  amount: number;
  currency: string;
  phone?: string;
  email?: string;
  description: string;
  metadata?: Record<string, unknown>;
  provider?: PaymentProvider;
}

export interface PaymentResult {
  transactionId: string;
  provider: PaymentProvider;
  status: "pending" | "completed" | "failed";
  amount: number;
  currency: string;
  providerReference?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount?: number): Promise<PaymentResult>;
}

export class MpesaPaymentProvider implements PaymentProviderAdapter {
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const { initiateStkPush } = await import("@/lib/mpesa");
      const result = await initiateStkPush({
        phone: request.phone!,
        amount: request.amount,
        reference: `EDY-${Date.now()}`,
        description: request.description || "Edyfra payment",
      });

      return {
        transactionId: result.CheckoutRequestID,
        provider: "mpesa",
        status: "pending",
        amount: request.amount,
        currency: "KES",
        providerReference: result.CheckoutRequestID,
        metadata: request.metadata,
      };
    } catch (err) {
      logger.error("M-Pesa payment failed", { amount: request.amount, error: String(err) });
      throw AppError.externalService("M-Pesa", "Payment processing failed.");
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    return {
      transactionId,
      provider: "mpesa",
      status: "completed",
      amount: 0,
      currency: "KES",
    };
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PaymentResult> {
    return {
      transactionId,
      provider: "mpesa",
      status: "completed",
      amount: amount || 0,
      currency: "KES",
    };
  }
}

export class PaymentService {
  private providers: Map<PaymentProvider, PaymentProviderAdapter> = new Map();
  private defaultProvider: PaymentProvider = "mpesa";

  constructor() {
    this.providers.set("mpesa", new MpesaPaymentProvider());
  }

  registerProvider(provider: PaymentProvider, adapter: PaymentProviderAdapter): void {
    this.providers.set(provider, adapter);
  }

  setDefaultProvider(provider: PaymentProvider): void {
    this.defaultProvider = provider;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const provider = request.provider || this.defaultProvider;
    const adapter = this.providers.get(provider);

    if (!adapter) {
      throw AppError.validation(`Payment provider "${provider}" is not configured.`);
    }

    const result = await adapter.processPayment(request);

    eventBus.emit("payment:processed", result, "payments", undefined, result.transactionId);

    return result;
  }

  async verifyPayment(transactionId: string, provider?: PaymentProvider): Promise<PaymentResult> {
    const p = provider || this.defaultProvider;
    const adapter = this.providers.get(p);
    if (!adapter) throw AppError.validation(`Provider "${p}" not configured.`);
    return adapter.verifyPayment(transactionId);
  }

  async refundPayment(transactionId: string, amount?: number, provider?: PaymentProvider): Promise<PaymentResult> {
    const p = provider || this.defaultProvider;
    const adapter = this.providers.get(p);
    if (!adapter) throw AppError.validation(`Provider "${p}" not configured.`);
    return adapter.refundPayment(transactionId, amount);
  }
}

export const payments = new PaymentService();
