# CLAUDE.md — Site Calvin Jota

> **Ponto de partida de toda sessão de trabalho neste repositório.**

---

## ⚠️ ANTES DE COMEÇAR QUALQUER TRABALHO (obrigatório, toda vez)

1. **Leia `INSTRUCOES-SITE.md`** — são as regras de trabalho do Calvin, não são opcionais.
2. **Leia o diário de bordo principal**: `C:\Dev\precificador-marketplace\preco-e-lucro\CLAUDE.md`.
   O site e o app são reorganizados juntos, e o histórico completo do trabalho fica lá.
   **As pastas foram renomeadas em 16/08**, depois do commit da fatia 4.4c: `Precificador Markeplace` virou `precificador-marketplace`, `android-project` virou `preco-e-lucro` e `C:\Dev\Site` virou `C:\Dev\site`. Achou o caminho velho escrito em algum lugar, corrija.
3. **Confira o estado real do código** antes de afirmar qualquer coisa.

### Regras que mais pesam aqui

- **Tudo que entra neste repositório vai pro ar** (GitHub Pages). Conferir antes de commitar.
- **Perguntar antes** de criar arquivo, refatorar, instalar dependência ou deletar.
- **Commits no nome do Calvin**, em português, pequenos, com push depois de cada um.
- **Nunca usar travessão** (o caractere "—") em texto voltado ao usuário.
- **Ao terminar cada item: atualizar o diário de bordo e commitar.**

---

## O que é este repositório

Site institucional em `calvinjota.com.br`, hospedado no GitHub Pages. HTML, CSS e JavaScript puro, **sem framework**, usando ES Modules nativos via CDN.

```
index.html                      portada da marca (hub de apps)
assets/                         CSS, favicon e logo compartilhados
preco-lucro/
  index.html                    landing do app Preço & Lucro
  politica-privacidade.html      páginas legais (também abertas dentro do app)
  termos-servico.html
  deletar-conta.html
  calculadora/                  a calculadora web (exclusiva para assinantes Pro)
    index.html
    calculator.css
    calc.js                     cálculo puro, espelhado do app
    clipboard.js                copiar texto, espelhado do app
    toast.js                    aviso flutuante, espelhado do app
    price-sort.js               ordem alfabética dos salvos, espelhado do app
    price-search.js             filtro da busca pelos salvos, puro, só do site
    board-layout.js             onde cada card fica no quadro, puro, só do site
    board-views.js              as duas visualizações e o pin, puro, só do site
    board-bar.js                a barra de visualizações e o popup de renomear
    board.js                    arrastar, teclado e localStorage do quadro
    app.js                      arranque, só liga os módulos
    format.js                   formatação de número e moeda
    field-order.js              ordem do Enter entre os campos
    theme.js                    tema claro/escuro
    menu.js                     menu lateral
    overlays.js                 popups e fechamento pelo fundo escuro
    legal.js                    abertura das páginas legais
    calculator.js               leitura dos campos e pintura da tela
    saved-prices.js             lista de preços salvos e seus popups
    auth.js                     login com Google (Firebase)
    sync.js                     sincronização dos preços salvos (Firestore)
    paywall.js                  libera ou trava conforme a assinatura
    firebase-config.js          configuração pública do Firebase
capidoku/
  index.html                    landing do jogo Capidoku (botão da Play Store dorme até a publicação)
  icon-192.png                  ícone do jogo, cópia de assets/icon do repositório capidoku
  politica-privacidade.html     páginas legais em português, abertas pelo popup de configurações do jogo
  termos-servico.html
  en/                           as mesmas duas em inglês (privacy-policy.html, terms-of-service.html)
  capidoku.css                  a folha das páginas legais do jogo, na paleta e nas fontes do jogo (mesmas classes do assets/style.css)
  capybara-menu.png, wallpaper-capybaras.png   artes do jogo pra landing e pro papel de parede das páginas
app-ads.txt                     vendedores autorizados do AdMob (IAB), na raiz porque calvinjota.com.br é o site do desenvolvedor na Play
tests/                          testes do cálculo (Vitest)
```

**A calculadora depende de um Cloudflare Worker** (`api.calvinjota.com.br/check-pro`) que confere a assinatura Pro no RevenueCat. O código do Worker fica em outro repositório: `calvinjota/preco-lucro-worker`.

---

## Regras técnicas específicas deste projeto

- **`calc.js` precisa calcular exatamente igual ao app.** Os dois projetos rodam a mesma bateria de testes (`tests/calc.scenarios.js` é espelhado entre eles). Ao editar os casos em um, copiar para o outro.
- **`clipboard.js`, `toast.js` e `price-sort.js` também são espelhados do app**, byte a byte. Ao mexer em um dos três, copiar para o outro projeto.
- **Os ids da calculadora estão em inglês desde a fatia 4.2** (16/08), e o id do campo na tela não é o nome do dado guardado: `commissionNum` é o campo, `commissionPct` é o dado, e a ponte entre os dois é a tabela `INPUT_KEY_BY_FIELD` do `app.js`, única de propósito.
- **O preço salvo tem o mesmo formato do app desde a fatia 4.3** (16/08): `inputs` com as 8 chaves do `calc.js` e `display` com `adjustedProductCost`, `price`, `marginAmount` e `operatingMarginPct`. Mexeu no formato aqui, mexa no app junto, senão os dois divergem no Firestore.
- **Cache (`?v=N`)**: ao alterar qualquer `.js` ou `.css` da calculadora, subir o número da versão no `index.html` **e** em todo `import` que aponta para o arquivo, na mesma edição. Conferir o número atual antes, varrendo a pasta inteira e não só o `index.html`:
  ```bash
  grep -rn "?v=" preco-lucro/calculadora/
  ```
  **Esquecer um `import` é pior do que esquecer o `index.html`**: com dois números diferentes para o mesmo arquivo o navegador o trata como dois módulos e o executa duas vezes, o que registra dois jogos de listener e faz cada clique acontecer em dobro. Em 16/08 isso apagou um preço duas vezes e apareceu como `Missing or insufficient permissions` do Firestore, um erro que parece de segurança e é de cache. Arquivo cujo conteúdo mudou sobe o próprio número também, senão o navegador serve a versão velha dele.
- **O JS, o HTML e o CSS da calculadora estão em inglês desde a fatia 4.4c** (15/08), comentários e nomes de classe incluídos: código novo nasce em inglês, e o único português que resta no `calculadora.css` é "Preço & Lucro" no cabeçalho, que é o nome da marca.
- **As classes do CSS do site não são espelhadas com as do app** (15/08), ao contrário de `calc.js`, `clipboard.js`, `toast.js` e `price-sort.js`: as duas folhas são arquivos independentes, então `card-breakdown` aqui e `card-sale-breakdown` lá é esperado, cada um com o vocabulário do próprio projeto.
- **As chaves do Firebase em `firebase-config.js` são públicas por design.** Isso está correto, não é falha de segurança. A proteção real vem das regras do Firestore (cada usuário só acessa os próprios preços).
- **O paywall tem proteção contra falha**: qualquer erro mantém a calculadora **trancada**, nunca liberada. Preservar esse comportamento.
- **O lint é `npm run lint` e roda junto com o `npm test`** (desde a fatia 5.2, 16/08): o `eslint.config.mjs` tem 2 blocos (calculadora com globais de browser, testes com globais de Node) e usa o `eslint-plugin-import-x`, que abre o módulo vizinho e confere se o nome importado existe mesmo lá, coisa que o ESLint de fábrica não faz e nenhum teste daqui pega.
- **O resolver de cache-busting do `eslint.config.mjs` não é enfeite**: sem ele o `import-x/no-unresolved` acusaria erro falso em todo import, porque `./calc.js?v=3` não é caminho no disco e o Firebase vem por URL. Ele tira a query, resolve o arquivo real e responde "externo" para `https:`. Não troque isso por desligar a regra: é ela que acusa arquivo movido ou renomeado, o risco número 1 da reorganização de pastas.
- **O Prettier roda com `npm run format` e a configuração é idêntica à do app** (desde a fatia 5.3, 16/08): `printWidth` 100, aspas simples no JS e duplas no CSS, e o `.prettierrc.json` precisa continuar **idêntico byte a byte** ao do outro repositório, senão os arquivos espelhados divergem em silêncio na primeira formatação. HTML e Markdown ficam de fora, o motivo está escrito no `.prettierignore`.
- **Arquivo reformatado é arquivo alterado**: rodou o Prettier, suba o `?v=N` de tudo que ele tocou e dos `import` que apontam pra lá, igual a qualquer outra mudança.
- **O aviso de `Cross-Origin-Opener-Policy` no login está aceito desde 16/08 e não se reabre**: o teste A/B em servidor local provou que mandar `same-origin-allow-popups` na resposta **não muda nada**, porque quem dispara o relatório é a página que o popup abre (`accounts.google.com/signin/v2/identifier` responde `Cross-Origin-Opener-Policy-Report-Only: same-origin`). **Report-Only é modo relatório**, nada é bloqueado, o login entra normalmente e o app Android nem passa por aqui (lá é plugin nativo). Não troque o `signInWithPopup` do `auth.js:35` por `signInWithRedirect` para calar o aviso: o `authDomain` é `preco-e-lucro.firebaseapp.com`, outro site, e o redirect é justamente o fluxo que quebra com storage particionado. Histórico completo no `preco-e-lucro/HISTORICO.md`, 16/08 19h30.
- **A Etapa 9 está fechada** (16/08): o `app.js` saiu de 680 para 28 linhas em 8 módulos e hoje é só arranque, com a mesma regra do app (dado tem dono único, dependência anda pra baixo, quem está embaixo avisa por callback). Provas fatia a fatia no `preco-e-lucro/HISTORICO.md`.
- **O `toast.js` é espelhado do app, mas a posição dele na tela não é** (06/11/2026): no site a mensagem fica no centro da janela, no app fica embaixo, que é a convenção do Android e onde está o polegar. A folha de estilo nunca foi espelhada (regra acima), então isso não abre exceção nenhuma, só não "conserte" a diferença achando que é descuido.
- **O truque do card de preços salvos absoluto dentro de um wrapper morreu em 09/11/2026**, junto com `.card-saved-wrap` e `.col-mid`: as colunas do quadro são pilhas independentes e dão de graça o que ele resolvia na mão. Achou o nome velho escrito em algum lugar, é resíduo. A altura da lista agora é `--saved-list-max-h: 55vh`, medida contra a janela, porque não há mais coluna vizinha fixa de quem emprestar altura.
- **Os cards são arrastáveis e o quadro tem três colunas iguais** (09/11/2026): `#calcGate.board` com `repeat(3, minmax(0, 1fr))` e três `.board-col`, cada card uma `section.glass-card[data-card]` com a alça `.card-grip`. Largura igual é requisito, não estética: card que muda de forma ao mudar de coluna faz de cada movimento uma surpresa.
- **Arrastar é troca, nunca inserção** (09/11/2026): soltar A sobre B põe cada um no lugar do outro e mais ninguém se move, por decisão do Calvin. Quem faz é `swapCards`, e o aviso visual é o card alvo aceso (`.is-swap-target`), não um vão aberto entre cards.
- **A faixa tracejada no pé de cada coluna só existe durante o arraste e não é enfeite** (09/11/2026): é o único lugar onde soltar significa empilhar em vez de trocar, e precisa existir até na coluna mais alta, que por definição não tem sobra. Vive em `body.board-dragging .board-col::after`. Sem ela, provado no navegador, é impossível pôr três cards numa coluna.
- **A visualização "Padrão" é só leitura e é o ponto de volta** (09/11/2026): nada escreve nela, só o perfil guarda arranjo, e arrastar com ela aberta pula para o perfil e salva lá em vez de recusar ou perder o movimento. O pin diz qual abre sozinha, e não é a mesma coisa que a aba aberta.
- **O arranjo é guardado no navegador, um por contagem de colunas** (09/11/2026): chave `boardViews` no `localStorage`, `{ "3": [...], "2": [...], "1": [...] }`, então arrumar o celular não mexe no computador. Firestore foi avaliado e recusado: as regras liberam só `userPrices` e negam o resto, então exigiria regra nova publicada à mão no Console, mais leitura e escrita por carregamento, por causa de posição de card.
- **As larguras 1279 e 1023 vivem no CSS e no `board.js` ao mesmo tempo** (09/11/2026), porque media query não diz nada a JavaScript e o arranjo tem que colapsar junto com as colunas. Mexeu numa, mexa na outra: há teste no `handlers.test.js` que falha se divergirem.
- **O `change` do `matchMedia` não basta para reagir à janela, o `resize` é obrigatório** (09/11/2026): com só o primeiro, estreitar a janela deixou três cards presos numa coluna que o CSS esconde, ou seja, sumidos da tela. Os dois estão escutados e os `MediaQueryList` ficam guardados em variável, porque um que ninguém referencia pode ser coletado junto com o listener.
- **Fundo do `body` nunca na forma curta `background:`** (09/11/2026): ela repõe `background-repeat` no padrão (repetir), o body tem a altura da janela, o navegador estica o fundo dele pela página inteira e o `radial-gradient` de 600px volta a cada 600px, em faixas bem visíveis no celular. São três declarações separadas, nos dois temas.
- **A busca dos preços salvos vive no `price-search.js` e é só do site** (06/11/2026): o app não tem busca, e o módulo é puro igual ao `price-sort.js`, então a regra se prova em teste sem abrir navegador. Quem normaliza acento e caixa é ele, não o `saved-prices.js`.
- **A rede de segurança daqui é o `tests/handlers.test.js`**, 13 dos 100 testes: ids, ids montados de `PCT_KEYS`, classes, seletores de atributo, ordem do Enter, `?v=` coerente entre HTML e imports, nenhum handler inline, nenhuma global nova, e os cards do quadro batendo com o `BOARD_CARD_IDS` mais as larguras de quebra iguais entre CSS e JS. Quem busca id aqui é o helper `$()`, não `getElementById` literal, então o regex procura os dois.
- **O site tem uma global proposital, `window.currentUser`** (`auth.js` escreve, `paywall.js` e `sync.js` leem), ao contrário do app, que é zero globais. A rede aceita essa uma e barra qualquer outra.
- **O `sync.js` importa direto do `saved-prices.js`** e a volta é por `CustomEvent` no `document`, nunca import de retorno: é isso que impede o ciclo entre os dois.
- **As URLs públicas não se tocam** (decisão de 16/08): são quatro endereços cadastrados no Google (Política de Privacidade, os dois campos de eliminação no questionário de Segurança dos dados, e o Website do app), e a única forma segura de mudar exigiria deixar redirect no endereço antigo para sempre, o que deixaria a estrutura mais bagunçada do que está.
- **As quatro páginas legais do Capidoku também não se tocam** (04/09/2026): `capidoku/politica-privacidade.html`, `capidoku/termos-servico.html`, `capidoku/en/privacy-policy.html` e `capidoku/en/terms-of-service.html` estão gravadas no jogo (`settings_popup.gd` do repositório capidoku) e vão pra ficha da Play. A pasta `capidoku/` inteira veste a paleta e as fontes do jogo (bege-capivara, Fredoka, Nunito pelo Google Fonts) por ordem do Calvin de 04/09/2026, nunca o tema escuro do site: o card dele na home também. O `app-ads.txt` da raiz nasce sem linha de vendedor: a linha `google.com, pub-..., DIRECT, f08c47fec0942fa0` entra com o ID da conta AdMob antes de publicar o jogo, e o texto legal do Capidoku é do Capidoku (nada do Preço & Lucro vale lá, e vice-versa, ordem do Calvin).
- **O botão "Assinar pelo app" do overlay funciona desde 16/08**: o `APP_STORE_URL` do `paywall.js` tem o mesmo link do botão do menu lateral (`preco-lucro/calculadora/index.html:84`). São duas cópias de propósito, uma é HTML estático e a outra só existe quando o gate decide mostrar. Quem vê a do overlay é usuário logado sem Pro.
- **A Política de Privacidade está na versão 1.2 desde 17/08**, com RevenueCat e Cloudflare declarados como operadores e a frase de transferência internacional cobrindo os três. Mexeu em quem recebe dado do usuário, atualize a seção 4 dessa página junto, é exigência da LGPD e o endereço dela é campo obrigatório no Play Console.
- **`catch` vazio se comenta, não se silencia** (`app.js`, tema x `localStorage`): a regra `no-empty` ignora bloco que tem comentário dentro, então o porquê fica escrito e o lint fica limpo sem exceção na config, igual ao `clipboard.js` do app.

---

## Como rodar

Testes do cálculo:
```bash
npm test
```

Servidor local para ver o site no navegador:
```bash
npx http-server . -p 8081 -c-1
```
Depois abrir `http://localhost:8081/preco-lucro/calculadora/`.
