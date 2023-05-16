import AsyncQueue from './AsyncQueue';

interface ResourceFactory<T, U = T> {
  create(): PromiseLike<T> | T;
  dispose?(resource: T): PromiseLike<void> | void;
  access?(resource: T): PromiseLike<U> | U;
}

class ResourcePooler<T, U> {
  factory: ResourceFactory<T, U>;

  // eslint-disable-next-line class-methods-use-this
  stubFn: (resource: U) => void = () => {};

  targetSize: number = 0;

  currentSize: number = 0;

  resourceQueue: AsyncQueue<T> = new AsyncQueue();

  constructor({ factory }: { factory: ResourceFactory<T, U> }) {
    this.factory = factory;
  }

  async use<O>(task: (resource: U) => Promise<O> | O, waitForResize = false): Promise<O> {
    // if resource is not available, and size limit isn't reached, create a new resource
    if (this.currentSize < this.targetSize && (!this.resourceQueue.peek() || waitForResize)) {
      this.currentSize++;
      const resource = await this.factory.create();
      this.resourceQueue.enqueue(resource);
    }
    const resource = await this.resourceQueue.dequeue();
    const accessor = this.factory.access ?? ((r) => r);

    try {
      if (task !== this.stubFn) {
        const accessed = (await accessor(resource)) as U;
        const result = await task(accessed);
        return result;
      }
      // @ts-ignore Escape hatch to avoid calling accessor for resizing
      return task();
    } finally {
      if (this.currentSize > this.targetSize) {
        // Get rid of excess resources
        this.currentSize--;
        const diposing = this.factory.dispose?.(resource);
        if (waitForResize) await diposing;
      } else {
        this.resourceQueue.enqueue(resource);
      }
    }
  }

  #resizing = false;

  async resize(newSize: number) {
    // prevent conflicting resizes
    if (this.#resizing) throw new Error('Cannot resize while already resizing');
    this.#resizing = true;

    this.targetSize = newSize;

    while (newSize !== this.currentSize) {
      await this.use(this.stubFn, true);
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
