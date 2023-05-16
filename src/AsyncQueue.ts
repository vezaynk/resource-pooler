export default class AsyncQueue<T> {
  #elements: { element: T }[] = [];

  #waiting: ((el: T) => void)[] = [];

  get size(): number {
    return this.#elements.length;
  }

  peek(): T {
    return this.#elements[0]?.element;
  }

  enqueue(element: T): void {
    const next = this.#waiting.shift();
    if (next) {
      next(element);
    } else {
      this.#elements.push({ element });
    }
  }

  async dequeue(): Promise<T> {
    const next = this.#elements.shift();
    if (next) {
      return next.element;
    }
    const defer = new Promise<T>((res) => this.#waiting.push(res));
    return defer;
  }
}
