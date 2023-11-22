import { ResourcePooler, createPool } from '.';

const delay = () => new Promise<void>((res) => {
  setImmediate(res);
});

describe('Lifecycle', () => {
  test('createPool default size', async () => {
    await createPool({
      create() {
        return {};
      },
    });
  });

  test('Pool is initialized and disposed', async () => {
    const getObject = jest.fn(() => 'A string');
    const disposeObject = jest.fn(() => {});

    const pool = await createPool(
      {
        create() {
          return getObject();
        },
        dispose() {
          return disposeObject();
        },
      },
      8,
    );

    expect(getObject).toBeCalledTimes(8);

    await pool.resize(5);

    expect(disposeObject).toBeCalledTimes(3);
  });

  test('Pool is initialized and disposed async', async () => {
    const getObject = jest.fn(() => 'A string');
    const disposeObject = jest.fn(() => {});

    const pool = await createPool(
      {
        async create() {
          await delay();
          return getObject();
        },
        async dispose() {
          await delay();
          return disposeObject();
        },
      },
      8,
    );

    expect(getObject).toBeCalledTimes(8);

    await pool.resize(5);

    expect(disposeObject).toBeCalledTimes(3);
  });

  test('Pool is initialized and sized down', async () => {
    const getObject = jest.fn(() => 'A string');

    const pool = await createPool(
      {
        async create() {
          await delay();
          return getObject();
        },
      },
      8,
    );

    await pool.resize(5);
  });

  test('Pool resize conflicted', async () => {
    const getObject = jest.fn(() => 'A string');
    const disposeObject = jest.fn(() => {});

    const pool = await createPool(
      {
        async create() {
          await delay();
          return getObject();
        },
        async dispose() {
          await delay();
          return disposeObject();
        },
      },
      8,
    );

    expect(getObject).toBeCalledTimes(8);

    pool.resize(10);
    await expect(pool.resize(5)).rejects.toThrow();
  });
});

describe('Work', () => {
  test('Perform work', async () => {
    const getObject = jest.fn(() => 'A string');
    const disposeObject = jest.fn(() => {});
    const accessObject = jest.fn((r: string) => r);
    const useObject = jest.fn((r: string) => r.toUpperCase());

    const pool = await createPool(
      {
        async create() {
          await delay();
          return getObject();
        },
        async dispose() {
          await delay();
          return disposeObject();
        },
        async access(r) {
          await delay();
          return accessObject(r);
        },
      },
      8,
    );

    expect(getObject).toBeCalledTimes(8);

    for (let i = 0; i < 100; i += 1) {
      await pool.use((r) => useObject(r));
    }

    expect(accessObject).toBeCalledTimes(100);
  });

  test('Use before available', async () => {
    const used = jest.fn();
    const pooler = new ResourcePooler({
      factory: {
        create() {
          return null;
        },
      },
    });

    pooler.use(() => {
      used();
    });
    await delay();
    expect(used).not.toBeCalled();
    await pooler.resize(1);
    await delay();
    expect(used).toBeCalled();
  });
});

describe('Error handling', () => {
  test('Accessor throws when calling use', async () => {
    const pool = await createPool(
      {
        create() {
          return { foo: {} };
        },
        access() {
          throw new Error('Whoops!');
        },
      },
      8,
    );

    expect(pool.resourceQueue.size).toBe(8);
    // rejects because accessor throws
    await expect(() => pool.use(async () => {})).rejects.toThrow();
    // resource sent back to queue
    expect(pool.resourceQueue.size).toBe(8);
  });

  test('Creator throws', async () => {
    const pooler = new ResourcePooler({
      factory: {
        create() {
          throw new Error('Whoops!');
        },
      },
    });

    await expect(pooler.resize(1)).rejects.toThrow();
  });
  test('Dispose throws when resizing', async () => {
    const pooler = new ResourcePooler({
      factory: {
        create() {
          return null;
        },
        dispose() {
          throw new Error('Whoops!');
        },
      },
    });

    await pooler.resize(1);
    await expect(pooler.resize(0)).rejects.toThrow();
  });
  test('Dispose throws when using if waitForResize', async () => {
    const pooler = new ResourcePooler({
      factory: {
        create() {
          return null;
        },
        dispose() {
          throw new Error('Whoops!');
        },
      },
    });

    await pooler.resize(1);
    pooler.targetSize = 0;
    await expect(pooler.use(() => {}, true)).rejects.toThrow();
  });
  test('Use throws if task throws', async () => {
    const pooler = new ResourcePooler({
      factory: {
        create() {
          return null;
        },
      },
    });

    await pooler.resize(1);
    pooler.targetSize = 0;
    await expect(pooler.use(() => { throw new Error("Whoops!")})).rejects.toThrow();
  });
});
