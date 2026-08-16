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
    calculadora.css
    calc.js                     cálculo puro, espelhado do app
    clipboard.js                copiar texto, espelhado do app
    toast.js                    aviso flutuante, espelhado do app
    price-sort.js               ordem alfabética dos salvos, espelhado do app
    app.js                      interface
    auth.js                     login com Google (Firebase)
    sync.js                     sincronização dos preços salvos (Firestore)
    paywall.js                  libera ou trava conforme a assinatura
    firebase-config.js          configuração pública do Firebase
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
