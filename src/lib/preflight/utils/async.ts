export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  if (concurrency <= 0) {
    throw new Error("Concurrency must be positive");
  }

  const results: T[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index;
      index++;
      const task = tasks[currentIndex];
      if (task !== undefined) {
        results[currentIndex] = await task();
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}

export async function serial<T>(
  tasks: Array<() => Promise<T>>,
): Promise<T[]> {
  const results: T[] = [];

  for (const task of tasks) {
    results.push(await task());
  }

  return results;
}

export async function mapAsync<T, U>(
  items: T[],
  fn: (item: T, index: number) => Promise<U>,
  concurrency?: number,
): Promise<U[]> {
  if (concurrency === undefined || concurrency >= items.length) {
    return Promise.all(items.map((item, index) => fn(item, index)));
  }

  return parallel(
    items.map((item, index) => () => fn(item, index)),
    concurrency,
  );
}

export async function filterAsync<T>(
  items: T[],
  predicate: (item: T, index: number) => Promise<boolean>,
  concurrency?: number,
): Promise<T[]> {
  const results = await mapAsync(
    items,
    async (item, index) => ({ item, keep: await predicate(item, index) }),
    concurrency,
  );

  return results.filter((r) => r.keep).map((r) => r.item);
}

export async function reduceAsync<T, U>(
  items: T[],
  fn: (acc: U, item: T, index: number) => Promise<U>,
  initial: U,
): Promise<U> {
  let acc = initial;

  for (let i = 0; i < items.length; i++) {
    acc = await fn(acc, items[i] as T, i);
  }

  return acc;
}

export async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export interface Queue<T> {
  push(item: T): void;
  pushMany(items: T[]): void;
  start(): void;
  pause(): void;
  resume(): void;
  clear(): void;
  get size(): number;
  get pending(): number;
  onEmpty(): Promise<void>;
  onIdle(): Promise<void>;
}

export function createQueue<T>(
  handler: (item: T) => Promise<void>,
  concurrency = 1,
): Queue<T> {
  let queue: T[] = [];
  let activeCount = 0;
  let isPaused = false;
  let resolveEmpty: (() => void) | undefined;
  let resolveIdle: (() => void) | undefined;

  function processNext(): void {
    if (isPaused || activeCount >= concurrency) {
      return;
    }

    const item = queue.shift();
    if (item === undefined) {
      if (activeCount === 0) {
        resolveEmpty?.();
        resolveEmpty = undefined;
        resolveIdle?.();
        resolveIdle = undefined;
      }
      return;
    }

    activeCount++;
    handler(item)
      .catch(() => {
        // Error handled by consumer
      })
      .finally(() => {
        activeCount--;
        processNext();
      });

    processNext();
  }

  const api: Queue<T> = {
    push(item: T): void {
      queue.push(item);
      processNext();
    },

    pushMany(items: T[]): void {
      queue.push(...items);
      processNext();
    },

    start(): void {
      processNext();
    },

    pause(): void {
      isPaused = true;
    },

    resume(): void {
      isPaused = false;
      processNext();
    },

    clear(): void {
      queue = [];
    },

    get size(): number {
      return queue.length;
    },

    get pending(): number {
      return activeCount;
    },

    onEmpty(): Promise<void> {
      if (queue.length === 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        resolveEmpty = resolve;
      });
    },

    onIdle(): Promise<void> {
      if (queue.length === 0 && activeCount === 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        resolveIdle = resolve;
      });
    },
  };

  return api;
}

export interface DebouncedBatch<T> {
  add(item: T): void;
  flush(): Promise<void>;
  clear(): void;
}

export function createDebouncedBatch<T>(
  processBatch: (items: T[]) => Promise<void>,
  waitMs: number,
  maxSize?: number,
): DebouncedBatch<T> {
  let batch: T[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let flushPromise: Promise<void> | undefined;
  let resolveFlush: (() => void) | undefined;

  async function doFlush(): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (batch.length === 0) {
      return;
    }

    const items = [...batch];
    batch = [];

    try {
      await processBatch(items);
    } finally {
      resolveFlush?.();
      resolveFlush = undefined;
      flushPromise = undefined;
    }
  }

  function scheduleFlush(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      void doFlush();
    }, waitMs);
  }

  const api: DebouncedBatch<T> = {
    add(item: T): void {
      batch.push(item);
      scheduleFlush();

      if (maxSize !== undefined && batch.length >= maxSize) {
        void doFlush();
      }
    },

    async flush(): Promise<void> {
      if (batch.length === 0) {
        return;
      }

      if (flushPromise !== undefined) {
        return flushPromise;
      }

      flushPromise = new Promise((resolve) => {
        resolveFlush = resolve;
      });

      await doFlush();
    },

    clear(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      batch = [];
    },
  };

  return api;
}
