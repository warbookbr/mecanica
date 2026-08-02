# Mecanifica

A oficina 3D interativa que explica sistemas automotivos a clientes.

🔧 **[Abrir a Mecânica](https://warbookbr.github.io/mecanica/)**

Este repositório é **só o produto**: o que o cliente abre no navegador. Ele
mostra o freio a disco dianteiro no contexto do veículo, e deixa girar, focar,
explodir e isolar cada parte pelo nome.

## O que ele NÃO tem, e por quê

Não tem o núcleo procedural, nem as receitas das peças, nem a bancada de
autoria. Tudo isso vive na oficina, em
[`warbookbr/nos-mecanifica`](https://github.com/warbookbr/nos-mecanifica).

O motivo é o que o cliente faz. Ele **olha** a peça: gira, explode e isola.
Girar é câmera. Explodir e isolar mexem em partes, e o nome de cada parte já
vem escrito dentro do arquivo da peça. Nenhuma das três precisa reexecutar a
receita, então mandar a receita e o motor que a executa seria pagar por uma
capacidade que ninguém usa.

Medido na troca: **111 KB comprimidos** de núcleo mais receitas viraram
**30 KB** de arquivo pronto.

## De onde vêm as peças

De `pecas-resolvidas/*.json`, no formato `mecanifica.peca-resolvida` v1. Cada
arquivo traz a geometria já resolvida, o dicionário de materiais, a lista de
partes e a marca da receita que o gerou.

Quem gera é a oficina:

```
npm run exportar          # grava os arquivos
npm run exportar:check    # reprova se algum estiver desatualizado
```

O `exportar:check` roda no CI de lá. Ele existe para o caso que vai acontecer
um dia: alguém muda a peça e esquece de gerar o arquivo. Sem esse gate, o
produto mostraria a peça de ontem com a mesma cara de sempre, e nenhum teste
do núcleo perceberia — porque do lado do núcleo estaria tudo certo.

Para atualizar uma peça aqui: gere na oficina e copie juntos os JSONs, o
`manifesto.json` e `src/autoria/ler-peca-resolvida.js`. O gate recusa conjunto
incompleto, arquivo extra, versão desconhecida ou leitor divergente.

## Rodar

```
npm install
npm run dev        # desenvolvimento
npm run build      # build estático em dist/
npm run preview    # serve o build
```

## Estrutura

| pasta | o que é |
|---|---|
| `pecas-resolvidas/` | as peças já resolvidas, geradas pela oficina |
| `src/autoria/` | o leitor do formato e o adaptador para Three.js |
| `src/cena/` | o galpão e o veículo de contexto |
| `src/dominio/mecanica/` | onde cada sistema fica no veículo |
| `src/interacao/` | seleção, inspeção e os modos de apresentação |

## Licença e origem

Código sob a [licença MIT](LICENSE). O produto foi separado de
[`warbookbr/nos-mecanifica`](https://github.com/warbookbr/nos-mecanifica), que
preserva o histórico e as contribuições herdadas de
[`brigsd/nos`](https://github.com/brigsd/nos).

`src/autoria/ler-peca-resolvida.js` é módulo puro: sem `node:`, sem Three.js e
sem DOM. Ele é cópia do arquivo de mesmo nome na oficina, e um teste de lá
prova que escrever com um e ler com o outro desenha o mesmo triângulo.
