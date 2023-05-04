import AsyncQueue from './AsyncQueue';

interface ResourceFactory<T, U = T> {
  create(): PromiseLike<T> | T;
  dispose?(resource: T): PromiseLike<void> | void;
  access?(resource: T): PromiseLike<U> | U;
}

class ResourcePooler<T, U> {
  factory: ResourceFactory<T, U>;

  targetSize: number = 0;

  currentSize: number = 0;

  resourceQueue: AsyncQueue<T> = new AsyncQueue();

  constructor({ factory }: { factory: ResourceFactory<T, U> }) {
    this.factory = factory;
  }

  async use<O>(task: (resource: U) => Promise<O> | O, waitForDispose = false): Promise<O> {
    const resource = await this.resourceQueue.dequeue();
    const accessor = this.factory.access ?? ((r) => r);
    const accessed = (await accessor(resource)) as U;
    const result = await task(accessed);

    if (this.currentSize > this.targetSize) {
      // Get rid of excess resources
      const diposing = this.factory.dispose?.(resource);
      if (waitForDispose) await diposing;
      this.currentSize--;
    } else {
      this.resourceQueue.enqueue(resource);
    }

    return result;
  }

  #resizing = false;

  async resize(newSize: number) {
    // prevent conflicting resizes
    if (this.#resizing) return;
    this.#resizing = true;

    this.targetSize = newSize;

    while (newSize > this.currentSize) {
      this.currentSize++;
      const next = await this.factory.create();
      this.resourceQueue.enqueue(next);
    }

    while (newSize < this.currentSize) {
      await this.use(async () => {}, true);
    }

    this.#resizing = false;
  }
}

async function createPool<T, U = T>(factory: ResourceFactory<T, U>, size: number = 8) {
  const pooler = new ResourcePooler<T, U>({
    factory,
  });
  await pooler.resize(size);
  return pooler;
}

export { createPool, ResourcePooler };
