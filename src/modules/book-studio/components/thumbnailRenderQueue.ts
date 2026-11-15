/**
 * Cola de renderizado con concurrencia limitada.
 *
 * Sin ella, la grilla montaba N <canvas> por página y los renders de PDF.js
 * corrían todos a la vez — se colgaba el navegador en PDFs con muchas páginas.
 * Con esta cola solo se renderizan hasta `concurrency` páginas en paralelo.
 */

export type RenderJob = () => Promise<void>;

export class RenderQueue {
  private jobs: RenderJob[] = [];
  private running = 0;

  constructor(private readonly concurrency: number = 2) {}

  enqueue(job: RenderJob): void {
    this.jobs.push(job);
    this.pump();
  }

  get pending(): number {
    return this.jobs.length;
  }

  get active(): number {
    return this.running;
  }

  private pump(): void {
    while (this.running < this.concurrency) {
      const job = this.jobs.shift();
      if (!job) return;
      this.running += 1;
      job()
        .catch((err) => {
          // Una tarea que falla no detiene la cola (errores de red/PDFs rotos).
          console.warn('No se pudo renderizar una página:', err);
        })
        .finally(() => {
          this.running -= 1;
          this.pump();
        });
    }
  }
}

/** Cola compartida de la grilla de miniaturas del Book Studio. */
export const thumbnailRenderQueue = new RenderQueue(2);
