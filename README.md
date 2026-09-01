# Tic Tac Toe Supreme

Jogo da Velha Supremo para navegador feito com React + TypeScript.

Cada casa do tabuleiro principal abre um novo jogo da velha 3x3. A jogada atual define em qual mini-tabuleiro o adversário precisa jogar depois, criando uma camada extra de estratégia, controle de ritmo e armadilhas táticas.

## Prévia

![Tela inicial](docs/tela-inicial.png)

![Tela de partida](docs/game.png)

## Principais recursos

- modo local para 2 jogadores
- modo solo contra IA
- IA com dificuldades `fácil`, `média` e `difícil`
- tutorial guiado dentro da aplicação
- placar acumulado entre rodadas
- persistência com `localStorage`
- efeitos sonoros, animações leves e layout responsivo
- suporte a tela cheia

## Regras básicas

1. O tabuleiro principal possui 9 mini-tabuleiros.
2. O jogador `X` começa.
3. Ao marcar uma casa dentro de um mini-tabuleiro, você envia o adversário para o mini-tabuleiro correspondente no tabuleiro principal.
4. Se o mini-tabuleiro de destino estiver vencido ou cheio, o próximo jogador pode jogar em qualquer mini-tabuleiro aberto.
5. Vencer um mini-tabuleiro faz essa casa contar no tabuleiro principal.
6. Quem conquistar 3 mini-tabuleiros em linha no tabuleiro principal vence a partida.

## Como rodar localmente

### Requisitos

- Node.js 20.19+ (ou 22.12+) recomendado
- npm instalado

### Instalar dependências

```bash
npm install
```

### Iniciar em desenvolvimento

```bash
npm run dev
```

Abra no navegador:

```text
http://localhost:5173
```

### Gerar build de produção

```bash
npm run build
```

## Como testar rapidamente

1. Abra `http://localhost:3000`
2. Escolha `2 jogadores` ou `Contra IA`
3. Se usar IA, selecione símbolo e dificuldade
4. Clique em `Começar partida`
5. Jogue algumas rodadas, recarregue a página e confirme se o estado foi restaurado

## Scripts

- `npm run dev` - inicia o servidor Vite em desenvolvimento
- `npm run build` - executa a checagem de tipos e gera a build de produção
- `npm test` - executa os testes com Vitest
- `npm run typecheck` - verifica os tipos sem gerar arquivos

## Qualidade

- o estado salvo no `localStorage` é validado antes de restaurar a partida
- o GitHub Actions executa auditoria de dependências, build e testes em cada push e pull request

## Estrutura principal

- `src/App.tsx` - fluxo principal da aplicação e interface
- `src/game.ts` - regras do Ultimate Tic-Tac-Toe
- `src/ai.ts` - tomada de decisão da IA
- `src/audio.ts` - efeitos sonoros com Web Audio API
- `src/index.css` - identidade visual e responsividade

## Observações

- `localStorage` funciona também em `localhost`
- os efeitos sonoros dependem da interação do usuário para serem liberados pelo navegador
- o placar e a partida em andamento ficam salvos entre recarregamentos
