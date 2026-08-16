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
