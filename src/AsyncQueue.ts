export default class AsyncQueue<T> {
  #elements: T[] = [];

  #waiting: ((el: T) => void)[] = [];

  get size() {
    return this.#elements.length;
  }

  enqueue(el: T) {
    const next = this.#waiting.shift();
    if (next) {
      next(el);
    } else {
      this.#elements.push(el);
    }
  }

  async dequeue() {
    const next = this.#elements.shift();
    if (next) {
      return next;
    }
    const defer = new Promise<T>((res) => this.#waiting.push(res));
    return defer;
  }
}
