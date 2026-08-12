# calvinjota.com.br

Site institucional da marca **Calvin Jota**, hospedado no GitHub Pages. Funciona como portada dos aplicativos e hospeda a calculadora web do **Preço & Lucro**, além das páginas legais exigidas pela Google Play.

🔗 **No ar em:** [calvinjota.com.br](https://calvinjota.com.br)

## O que tem no site

| Página | Endereço | O que é |
|---|---|---|
| Portada | `/` | Hub da marca, com os cards dos aplicativos |
| Landing do app | `/preco-lucro/` | Apresentação do Preço & Lucro, com link para a Play Store |
| Calculadora web | `/preco-lucro/calculadora/` | A calculadora rodando no navegador, exclusiva para assinantes Pro |
| Páginas legais | `/preco-lucro/politica-privacidade.html`, `/termos-servico.html`, `/deletar-conta.html` | Documentos exigidos pela Google Play, também abertos dentro do app |

## A calculadora web

Mesma calculadora do aplicativo Android, rodando no navegador. Quem assina o Pro pelo app entra com a mesma conta Google e encontra os preços salvos sincronizados.

**Como o acesso funciona:**

1. O usuário entra com a conta Google (Firebase Authentication)
2. O site envia o token de login para um Cloudflare Worker
3. O Worker confere no RevenueCat se a assinatura Pro está ativa
4. Só então a calculadora é liberada

A chave secreta do RevenueCat fica apenas no Worker, nunca no site. Qualquer falha na verificação mantém a calculadora trancada, nunca liberada por engano.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Site | HTML, CSS e JavaScript puro (sem framework), com ES Modules nativos |
| Hospedagem | GitHub Pages, domínio próprio via CNAME |
| DNS e proxy | Cloudflare |
| Login | Firebase Authentication (Google Sign-In) |
| Preços salvos | Cloud Firestore, mesma base do aplicativo |
| Verificação de assinatura | Cloudflare Worker + RevenueCat |
| Testes | [Vitest](https://vitest.dev/) |

## Estrutura

```
index.html                      portada da marca
assets/                         CSS, favicon e logo compartilhados
preco-lucro/
  index.html                    landing do app
  politica-privacidade.html
  termos-servico.html
  deletar-conta.html
  calculadora/
    index.html
    calculadora.css
    calc.js                     cálculo puro (espelhado do app)
    app.js                      interface
    auth.js                     login com Google
    sync.js                     sincronização dos preços na nuvem
    paywall.js                  libera ou trava conforme a assinatura
    firebase-config.js          configuração pública do Firebase
tests/                          testes automatizados do cálculo
```

## Como rodar localmente

Pré-requisito: [Node.js](https://nodejs.org/) 18 ou mais recente.

```bash
npm install
npx http-server . -p 8081 -c-1
```

O site fica em `http://localhost:8081`. A calculadora, em `http://localhost:8081/preco-lucro/calculadora/`.

> O login com Google já funciona em `localhost` (o endereço está autorizado no Firebase).

## Testes

```bash
npm test
```

Os testes cobrem a lógica de cálculo de precificação, que é a parte mais crítica do projeto: um erro ali faz o usuário precificar errado e perder dinheiro real.

Os casos de teste (`tests/calc.scenarios.js`) são **os mesmos usados no aplicativo Android**. Se o site e o app calcularem diferente, os testes falham. É isso que garante que um preço salvo mostre os mesmos números no celular e no computador.

## Projetos relacionados

| Repositório | O que é |
|---|---|
| `calvinjota/preco-e-lucro` | O aplicativo Android (Capacitor) |
| `calvinjota/preco-lucro-worker` | O Cloudflare Worker que verifica a assinatura |

## Autor

**Calvin Jota**
[calvinjota.com.br](https://calvinjota.com.br) · [LinkedIn](https://linkedin.com/in/calvinjota/)

## Licença

Todos os direitos reservados.
