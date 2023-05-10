# Resource-Pooler

The minimal library for managing resource concurrent access over resources.

`resource-pooler` is a simple utility for 

## Distribution Strategy

Resources are assigned on a FIFO (first in, first out) basis:

1. The caller that requested a resource first will be assigned the first available resource
2. The resource that first becomes available will be the first to be assigned

## Guarantees

1. No two callers will be able to access the same resource concurrently (as long as the API is respected)
2. Each caller will eventually be assigned a resource (as long as one eventually becomes available)

# API

TODO

# Examples

## Worker Pooling

Sample usage

```js
const workerPool = await createPool({
    create() {
        return new Worker(require.resolve('./Worker.js'))
    },
    async dispose(worker) {
        await worker.terminate()
    },
})

workerPool.use((worker) => {
    worker.postMessage({
        message: "Hello World!"
    })
    return new Promise((resolve, reject) => {
    worker
        .once('message', (content) => {
        resolve(content)
        })
        .once('error', (error) => reject(error))
    })
})
```