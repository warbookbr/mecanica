#!/usr/bin/env node
/* conferir-pecas.mjs — a peça resolvida chegou inteira e no formato que este
   código entende?

   O QUE ESTE GATE NÃO FAZ, e é importante dizer: ele NÃO sabe se o arquivo está
   em dia com a receita. Quem sabe isso é o `exportar:check` da oficina, que tem
   a receita à mão. Aqui não há receita nenhuma, de propósito.

   O QUE ELE FAZ é a checagem que só existe deste lado: o arquivo chegou por
   cópia manual entre dois repositórios. Cópia manual trunca, corrompe e traz
   versão errada. Um `.json` cortado pela metade quebraria o build com uma
   mensagem de sintaxe que não diz nada sobre a causa; um arquivo de versão
   futura carregaria e desenharia errado, calado. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATO, VERSAO, lerPecaResolvida, parteDaFace } from '../src/autoria/ler-peca-resolvida.js';
import { SISTEMAS } from '../src/dominio/mecanica/freio-dianteiro-direito.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'pecas-resolvidas');

const problemas = [];
const arquivos = readdirSync(PASTA).filter((a) => a.endsWith('.json')).sort();

if (arquivos.length === 0) problemas.push('pecas-resolvidas/ está vazia');

for (const arq of arquivos) {
  let dado;
  try {
    dado = JSON.parse(readFileSync(join(PASTA, arq), 'utf8'));
  } catch (e) {
    problemas.push(`${arq}: não é JSON válido — ${e.message}`);
    continue;
  }
  if (dado.formato !== FORMATO) { problemas.push(`${arq}: formato '${dado.formato}', esperado '${FORMATO}'`); continue; }
  if (dado.versao !== VERSAO) { problemas.push(`${arq}: versão ${dado.versao}, este código lê a ${VERSAO}`); continue; }

  /* o leitor tem de aceitar de verdade, e não só o cabeçalho passar. */
  let neutro;
  try { neutro = lerPecaResolvida(dado); } catch (e) { problemas.push(`${arq}: o leitor recusou — ${e.message}`); continue; }
  if (neutro.V.size === 0) problemas.push(`${arq}: nenhum vértice`);
  if (neutro.F.size === 0) problemas.push(`${arq}: nenhuma face`);

  /* a lista `partes` do cabeçalho tem de bater com as partes que estão de fato
     nas faces. Divergência aqui vira botão de isolar que não faz nada. */
  const nasFaces = [...new Set(dado.F.map(parteDaFace).filter(Boolean))].sort();
  const declaradas = [...(dado.partes ?? [])].sort();
  if (JSON.stringify(nasFaces) !== JSON.stringify(declaradas)) {
    problemas.push(`${arq}: 'partes' diz [${declaradas}] e as faces têm [${nasFaces}]`);
  }
}

/* e o que o produto CITA existe? o registro de domínio nomeia as partes de cada
   sistema; se uma sumir do arquivo, o produto perde a peça sem erro. */
for (const sistema of SISTEMAS) {
  const arq = join(PASTA, `${sistema.peca ?? 'freio-disco'}.json`);
  let dado;
  try { dado = JSON.parse(readFileSync(arq, 'utf8')); } catch { continue; }
  for (const parte of sistema.partes) {
    if (!dado.partes?.includes(parte)) {
      problemas.push(`${sistema.id} cita a parte '${parte}', e o arquivo não tem`);
    }
  }
}

if (problemas.length === 0) {
  console.log(`conferir-pecas ok — ${arquivos.length} peça(s) legível(is), no formato ${FORMATO} v${VERSAO}`);
  process.exit(0);
}
console.error(`conferir-pecas FALHOU — ${problemas.length} problema(s):`);
for (const p of problemas) console.error(`  ${p}`);
process.exit(1);
