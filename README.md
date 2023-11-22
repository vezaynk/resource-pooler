# Resource-Pooler

The minimal, lock-free library for managing shared access to resources.

Use cases:

- Worker Pools
- Request Throttling
- Task Queues

## Distribution Strategy

Resources are assigned on a FIFO (first in, first out) basis:

1. The caller that requested a resource first will be assigned the first available resource
2. The resource that first becomes available will be the first to be assigned

## Guarantees

1. No two callers will be able to access the same resource concurrently (as long as the API is respected)
2. Each caller will eventually be assigned a resource (as long as one eventually becomes available)
3. Does _not_ guarantee that the number of resources specified by the size will never be exceeded

# API

## `ResourcePooler`

Constructor accepts a factory to manage the creation, disposal and access to resources. These actions are managed through a `ResourceFactory` interface which is provides the following methods:

```ts
interface ResourceFactory<T, U = T> {
  create(): PromiseLike<T> | T;
  dispose?(resource: T): PromiseLike<void> | void;
  access?(resource: T): PromiseLike<U> | U;
}
```

It is passed into the constructor of a `ResourcePooler`:

```ts
new ResourcePooler({
    factory: {
        create(): PromiseLike<T> | T,
        dispose?(resource: T): PromiseLike<void> | void,
        access?(resource: T): PromiseLike<U> | U,
    }
})
```

See below for examples.

### Creating Resources

Creating resources can done either synchronously or asynchronously. Once the `create` method completes, the resource is assumed to be available for use.

```ts
// Resource is ready immediately (sync)
new ResourcePooler({
  factory: {
    create: () => {
      return new Worker();
    },
  },
});

// Resource is NOT ready immediately (async)
new ResourcePooler({
  factory: {
    create: async () => {
      const worker = new Worker();
      await worker.waitForReady();
      return worker;
    },
  },
});
```

The creation method owns it's implementation and should completely handle its error cases. ResourcePooler expects it always return successfully and does not expect it to throw errors.

Failed resource creation is currently not supported.

`create()` will be called when new resources need to be provisioned.

### Accessing Resources

Resource access can be managed via the `access` API in order to modify the API that the resource exposes. For example, when wanting to restrict access to a specific property, or for using `ResourcePooler` to restrict parallelism.

```ts
// Make `fetch` calls queue
new ResourcePooler({
  factory: {
    create: () => {
      // Dummy object
      return {};
    },
    access: () => {
      return fetch;
    },
  },
});

new ResourcePooler({
  factory: {
    create: () => {
      // Dummy object
      return { someProperty: 1 };
    },
    access: (resource) => {
      return resource.someProperty;
    },
  },
});

new ResourcePooler({
  factory: {
    create: () => {
      // Dummy object
      return { someProperty: 1 };
    },
    access: (resource) => {
      // Will be called once per access
      const myOneTimeUseResource = new OneTimeResource(resource);
      return myOneTimeUseResource;
    },
  },
});
```

### Resource Disposal

## `createPool()`

Helper function to create a pre-sized pool.

```js
async function createPool(factory, size = 8) {
  const pooler = new ResourcePooler({ factory });
  await pooler.resize(size);
  return pooler;
}
```

# Examples

## Worker Pooling

Sample usage

```js
const workerPool = await createPool({
  create() {
    return new Worker(require.resolve("./Worker.js"));
  },
  async dispose(worker) {
    await worker.terminate();
  },
});

workerPool.use((worker) => {
  worker.postMessage({
    message: "Hello World!",
  });
  return new Promise((resolve, reject) => {
    worker
      .once("message", (content) => {
        resolve(content);
      })
      .once("error", (error) => reject(error));
  });
});
```

## Roadmap to 1.0.0 release

### Foundations

- [x] Semantic guarantees
- [x] Error handling
- [x] Complete unit tests

### Extend Design

- [ ] Establish patterns for pre/post runs
- [ ] Evaluate task executor wrappers
- [ ] Introduce resource recycling
- [ ] Allow disposing specific resources

### Documentation

- [ ] Complete API documentation
- [ ] User guide
- [ ] Code-gen documentation

### Examples

- [x] Worker Pool Example
- [ ] Task Queue example
- [ ] API Throttle example

