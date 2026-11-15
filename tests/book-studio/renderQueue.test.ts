import { describe, it, expect, vi } from 'vitest';
import { RenderQueue } from '../../src/modules/book-studio/components/thumbnailRenderQueue';

const tick = () => new Promise<void>((res) => setTimeout(res, 0));

describe('RenderQueue — Nivel 2 de rendimiento (concurrencia limitada)', () => {
  it('nunca corre más de `concurrency` trabajos a la vez', async () => {
    const q = new RenderQueue(2);
    let active = 0;
    let maxActive = 0;
    const gates: Array<() => void> = [];
    const job = () =>
      new Promise<void>((res) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        gates.push(() => {
          active -= 1;
          res();
        });
      });

    for (let i = 0; i < 5; i++) q.enqueue(job);

    // Solo 2 arrancaron; los otros 3 esperan en cola.
    expect(maxActive).toBe(2);
    expect(q.active).toBe(2);
    expect(q.pending).toBe(3);

    // Liberar uno a uno; la cola debe mantener el tope de 2.
    for (let round = 0; round < 5; round++) {
      while (gates.length) gates.shift()!();
      await tick();
    }

    expect(maxActive).toBe(2);
    expect(q.active).toBe(0);
    expect(q.pending).toBe(0);
  });

  it('un trabajo que falla no detiene la cola ni deja trabajos colgados', async () => {
    const q = new RenderQueue(2);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let ranSecond = false;

    q.enqueue(() => Promise.reject(new Error('boom')));
    q.enqueue(() => {
      ranSecond = true;
      return Promise.resolve();
    });

    await tick();
    await tick();

    expect(ranSecond).toBe(true);
    expect(q.active).toBe(0);
    expect(q.pending).toBe(0);
    warnSpy.mockRestore();
  });

  it('con concurrencia 1 los trabajos corren en orden', async () => {
    const q = new RenderQueue(1);
    const order: number[] = [];
    let release!: () => void;

    q.enqueue(
      () =>
        new Promise<void>((res) => {
          release = () => {
            order.push(1);
            res();
          };
        })
    );
    q.enqueue(async () => {
      order.push(2);
    });

    expect(order).toEqual([]);
    release();
    await tick();
    await tick();
    expect(order).toEqual([1, 2]);
  });
});
