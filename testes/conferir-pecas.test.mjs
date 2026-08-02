/* conferir-pecas.test.mjs — a cópia entre repositórios entrega exatamente o
   conjunto declarado no manifesto: nem peça ausente, nem sobra silenciosa. */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = join(RAIZ, 'pecas-resolvidas');
const CLI = join(RAIZ, 'tools/conferir-pecas.mjs');
const temporarias = [];

function copiarConjunto() {
  const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-produto-'));
  temporarias.push(pasta);
  for (const arq of readdirSync(ORIGEM)) copyFileSync(join(ORIGEM, arq), join(pasta, arq));
  return pasta;
}

function conferir(pasta) {
  return spawnSync(process.execPath, [CLI, `--pasta=${pasta}`], {
    cwd: RAIZ,
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('gate das peças copiadas', () => {
  it('aceita o conjunto íntegro em uma pasta isolada', () => {
    const r = conferir(copiarConjunto());
    expect(r.status, r.stderr).toBe(0);
  });

  it('recusa peça declarada no manifesto que não chegou', () => {
    const pasta = copiarConjunto();
    rmSync(join(pasta, 'roda-dianteira.json'));
    const r = conferir(pasta);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/faltam arquivos.*roda-dianteira/i);
  });

  it('recusa JSON extra que não pertence ao manifesto', () => {
    const pasta = copiarConjunto();
    copyFileSync(join(pasta, 'freio-disco.json'), join(pasta, 'peca-esquecida.json'));
    const r = conferir(pasta);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/fora do manifesto.*peca-esquecida/i);
  });
});
