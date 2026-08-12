# CLAUDE.md — Site Calvin Jota

> **Ponto de partida de toda sessão de trabalho neste repositório.**

---

## ⚠️ ANTES DE COMEÇAR QUALQUER TRABALHO (obrigatório, toda vez)

1. **Leia `INSTRUCOES-SITE.md`** — são as regras de trabalho do Calvin, não são opcionais.
2. **Leia o diário de bordo principal**: `C:\Dev\Precificador Markeplace\android-project\CLAUDE.md`.
   O site e o app são reorganizados juntos, e o histórico completo do trabalho fica lá.
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
- **Cache (`?v=N`)**: ao alterar qualquer `.js` ou `.css` da calculadora, subir o número da versão no `index.html` **e** em todos os `import` que apontam para o arquivo. Conferir o número atual antes:
  ```bash
  grep -n "?v=" preco-lucro/calculadora/index.html preco-lucro/calculadora/sync.js
  ```
  Sem isso, o navegador continua servindo a versão antiga (já causou um bug real).
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
