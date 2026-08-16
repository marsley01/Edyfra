export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobPriority = "low" | "normal" | "high" | "critical";

export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
  error?: string;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

interface QueuedJob<T = unknown> {
  job: Job<T>;
  handler: JobHandler<T>;
}

export class JobQueue {
  private queues: Map<JobPriority, QueuedJob[]> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing = false;
  private concurrency = 3;
  private activeJobs = 0;

  constructor() {
    this.queues.set("critical", []);
    this.queues.set("high", []);
    this.queues.set("normal", []);
    this.queues.set("low", []);
  }

  register<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  async enqueue<T>(
    type: string,
    payload: T,
    options?: {
      priority?: JobPriority;
      maxAttempts?: number;
      delayMs?: number;
    },
  ): Promise<string> {
    const handler = this.handlers.get(type);
    if (!handler) throw new Error(`No handler registered for job type: ${type}`);

    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const job: Job<T> = {
      id,
      type,
      payload,
      priority: options?.priority || "normal",
      status: "pending",
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date().toISOString(),
      scheduledAt: options?.delayMs
        ? new Date(Date.now() + options.delayMs).toISOString()
        : undefined,
    };

    if (job.scheduledAt && new Date(job.scheduledAt) > new Date()) {
      this.scheduleDelayed(job, handler);
    } else {
      this.queues.get(job.priority)!.push({ job, handler });
    }

    this.processNext();
    return id;
  }

  private async scheduleDelayed(job: Job, handler: JobHandler): Promise<void> {
    const delay = new Date(job.scheduledAt!).getTime() - Date.now();
    setTimeout(() => {
      this.queues.get(job.priority)!.push({ job, handler });
      this.processNext();
    }, Math.max(delay, 0));
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.activeJobs >= this.concurrency) return;
    this.processing = true;

    const priorities: JobPriority[] = ["critical", "high", "normal", "low"];
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        const item = queue.shift()!;
        this.activeJobs++;
        this.processing = false;
        this.executeJob(item).finally(() => {
          this.activeJobs--;
          this.processNext();
        });
        return;
      }
    }

    this.processing = false;
  }

  private async executeJob(item: QueuedJob): Promise<void> {
    item.job.status = "processing";
    item.job.attempts++;

    try {
      await item.handler(item.job);
      item.job.status = "completed";
      item.job.completedAt = new Date().toISOString();
    } catch (err) {
      item.job.error = err instanceof Error ? err.message : String(err);
      if (item.job.attempts < item.job.maxAttempts) {
        item.job.status = "pending";
        const backoff = Math.pow(2, item.job.attempts) * 1000;
        setTimeout(() => {
          this.queues.get(item.job.priority)!.push(item);
          this.processNext();
        }, backoff);
      } else {
        item.job.status = "failed";
      }
    }
  }

  getStats(): Record<JobPriority, number> {
    return {
      critical: this.queues.get("critical")!.length,
      high: this.queues.get("high")!.length,
      normal: this.queues.get("normal")!.length,
      low: this.queues.get("low")!.length,
    };
  }
}

export const jobQueue = new JobQueue();
