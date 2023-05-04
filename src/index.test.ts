import { createPool } from '.';

const delay = () => new Promise<void>((res) => { setImmediate(res); });

test('Pool is initialized and disposed', async () => {
  const getObject = jest.fn(() => 'A string');
  const disposeObject = jest.fn(() => {});

  const pool = await createPool({
    create() {
      return getObject();
    },
    dispose() {
      return disposeObject();
    },
  }, 8);

  expect(getObject).toBeCalledTimes(8);

  await pool.resize(5);

  expect(disposeObject).toBeCalledTimes(3);
});

test('Pool is initialized and disposed async', async () => {
  const getObject = jest.fn(() => 'A string');
  const disposeObject = jest.fn(() => {});

  const pool = await createPool({
    async create() {
      await delay();
      return getObject();
    },
    async dispose() {
      await delay();
      return disposeObject();
    },
  }, 8);

  expect(getObject).toBeCalledTimes(8);

  await pool.resize(5);

  expect(disposeObject).toBeCalledTimes(3);
});

test('Perform work', async () => {
  const getObject = jest.fn(() => 'A string');
  const disposeObject = jest.fn(() => {});
  const accessObject = jest.fn((r: string) => r);
  const useObject = jest.fn((r: string) => r.toUpperCase());

  const pool = await createPool({
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
  }, 8);

  expect(getObject).toBeCalledTimes(8);

  for (let i = 0; i < 100; i += 1) {
    await pool.use((r) => useObject(r));
  }

  expect(accessObject).toBeCalledTimes(100);
});
