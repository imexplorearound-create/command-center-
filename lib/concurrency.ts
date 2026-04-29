/**
 * Processa `items` em paralelo com `concurrency` workers, partilhando um cursor.
 *
 * Pattern: cursor++ é safe em Node (single-threaded event loop). Usado em
 * crons/batch jobs onde queremos paralelismo controlado mas não temos
 * dependências entre items.
 *
 * O worker recebe cada item por sua vez. Erros do worker são responsabilidade
 * do worker (capturar localmente). Quando todos os workers terminam, a função
 * resolve.
 */
export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function loop() {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, loop),
  );
}
