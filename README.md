# Extremo Leste (PWA)

Vue 3 (Composition API) + Vite + vite-plugin-pwa. Jogos, campeonatos, resultados, fotos e controle de quem pagou.

## Quem vê o quê

| | Visitante (sem login) | Admin (com login) |
|---|---|---|
| Jogadores, jogos (marcados e jogados, com placar), campeonatos, inscritos, fotos | ver | ver e editar |
| Patrocinadores ativos (nome, logo, site e no que ajudam) | ver | ver e editar |
| Quem pagou, quem deve, valor por jogador, taxa de inscrição, aba Financeiro | **não aparece** | ver e editar |
| Valores dos aportes dos patrocinadores, contato, telefone, anotações, patrocinadores inativos | **não aparece** | ver e editar |

O site abre sem login e **não tem nenhum botão ou link para o login**. Os admins acessam digitando
`seusite.com/admin` na barra de endereço e entram com a própria conta.

## Rodar local

```bash
npm install
npm run dev
```

Sem variáveis de ambiente o app roda em **modo local** (dados no `localStorage` do aparelho) e abre como
visitante. Para testar a visão de admin nesse modo, abra `/admin` e use **Entrar como admin** (não há senha, e a
visão volta para visitante ao recarregar a página). O login de verdade exige o Firebase configurado.

## Banco de dados (Firebase Firestore, NoSQL, plano gratuito)

O plano Spark aguenta um time com folga: cerca de 50 mil leituras e 20 mil escritas por dia, 1 GB.

### 1. Projeto e variáveis

1. Crie um projeto em https://console.firebase.google.com e adicione um app **Web**.
2. Ative **Firestore Database** (modo produção).
3. Copie `.env.example` para `.env` e preencha `VITE_FIREBASE_*`.

### 2. Contas de admin (uma por pessoa)

1. **Authentication > Sign-in method**: ative **E-mail/senha**.
2. **Authentication > Settings > User actions**: desmarque a criação de contas por conta própria
   (assim ninguém de fora cria usuário).
3. **Authentication > Users > Add user**: crie uma conta para cada admin.
4. Copie o **User UID** de cada admin (coluna da lista de usuários).
5. **Firestore > Start collection** `admins` > ID do documento = o UID copiado (o conteúdo pode ser vazio,
   por exemplo um campo `nome`). Repita para cada admin.

Para tirar o acesso de alguém: apague o documento dele em `admins` (e/ou o usuário em Authentication).

### 3. Migrar dados antigos (só se o banco já tinha dados)

Antes, valores e pagamentos ficavam dentro dos jogos e campeonatos. Agora ficam em coleções privadas.
Rode **antes de publicar as novas regras**:

```bash
# simulação (não grava nada)
MIGRATE_EMAIL=conta@time.com MIGRATE_PASSWORD=senha node --env-file=.env scripts/migrate-finance.mjs
# para valer
MIGRATE_EMAIL=conta@time.com MIGRATE_PASSWORD=senha node --env-file=.env scripts/migrate-finance.mjs --apply
```

### 4. Regras

Cole o conteúdo de `firestore.rules` em **Firestore > Rules** e publique.

- `players`, `matches` (e `photos`), `championships`, `sponsors`: qualquer pessoa lê, só admin escreve.
- `matchFinance`, `championshipFinance`, `sponsorFinance`: só admin lê e escreve.
- `admins`: cada pessoa lê só o próprio documento; ninguém escreve pelo app.
- Qualquer outra coleção: negado.

Esconder a tela não basta. A proteção real é a separação das coleções mais estas regras.

### Estrutura

```
PÚBLICO
players/{id}                  { name, nickname, active }
matches/{id}                  { date, time, opponent, location, status: scheduled|played,
                                scoreUs, scoreThem, notes, championshipId,
                                attendance: { [playerId]: true } }
matches/{id}/photos/{id}      { url, inline, createdAt }
championships/{id}            { name, location, startDate, endDate, status: open|finished, notes,
                                roster: { [playerId]: true } }
sponsors/{id}                 { name, website, logoUrl, inline, featured, active,
                                supports: { campeonato, uniforme, geral } }
PRIVADO (só admin)
sponsorFinance/{id}           { contact, phone, privateNote,
                                contributions: { [id]: { amount, date, purpose, championshipId, note } } }
matchFinance/{matchId}        { totalCost, costType, perPlayer, payments: { [playerId]: { paid, amount, paidAt } } }
championshipFinance/{id}      { feeMode: team|player, fee, payments: { [playerId]: { paid, amount, paidAt } } }
admins/{uid}                  { ... }
```

Funciona offline: o Firestore guarda cache local e sincroniza quando a internet volta.

## Campeonatos

- Cadastre o campeonato, escolha quem vai jogar (inscritos) e marque quem pagou a inscrição.
- A taxa pode ser **do time** (dividida entre os inscritos, arredondando o centavo para cima) ou **por jogador**.
- Inscrições não pagas entram em "Quem está devendo", no Financeiro (só admin).

## Patrocinadores

- Só o admin cadastra e edita (`/patrocinadores` > **+ Novo patrocinador**). O público vê uma faixa na página inicial e a vitrine em `/patrocinadores`, com logo, nome, link e no que ajudam (campeonatos, uniforme, gastos gerais).
- **Nome, logo, site e tipo de apoio são públicos.** Valores, datas dos aportes, contato, telefone e anotações ficam em `sponsorFinance` e nunca chegam ao visitante.
- Patrocinador marcado como **inativo** some da vitrine pública. Sem logo, o site mostra as iniciais.
- **Dentro do campeonato** (modo de taxa "do time"): na página do campeonato, o card *Patrocinadores do campeonato* mostra a conta: inscrição − patrocínios = sobra, dividida entre os inscritos (arredonda o centavo para cima). Ex.: R$ 1.000 − R$ 500 = R$ 500 ÷ 20 = R$ 25 por jogador. Adicionar ou tirar um patrocinador ali recalcula o valor por jogador; é o mesmo aporte da tela do patrocinador. Na cobrança "por jogador" o patrocínio não abate.
- Os aportes alimentam o Financeiro ("Patrocínios recebidos") e a página de cada campeonato.
- Sem Cloudinary, o logo (PNG, 512px) fica dentro do próprio documento no Firestore.

## Fotos

- **Recomendado:** Cloudinary (plano grátis). Crie um *Unsigned upload preset* e preencha `VITE_CLOUDINARY_*`.
- Sem Cloudinary, a foto é comprimida (~1024px) e guardada no próprio Firestore (funciona, mas não escala bem).
- As fotos são públicas: quem tiver o link da imagem consegue abri-la.
- Excluir uma foto no app remove a referência; o arquivo continua no Cloudinary (apagar exige chave secreta/servidor).

## Colocar no ar (GitHub + Vercel + domínio)

Ordem recomendada. Os passos do Firebase (seção acima) vêm antes de abrir o site para o público.

### 1. Subir o código para o GitHub

```bash
# na pasta do projeto (onde está o package.json), depois de descompactar o zip
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/extremo-leste.git   # repositório vazio criado no GitHub
git push -u origin main
```

O `.gitignore` já protege `.env`, `node_modules`, `dist` e `dist-preview`. Antes do primeiro commit, confira com
`git status` que o `.env` **não** aparece na lista. As chaves do Firebase no `.env.example` ficam em branco de propósito.

### 2. Publicar na Vercel

1. Em vercel.com: **Add New > Project** e importe o repositório (o preset **Vite** é detectado).
2. Em **Settings > Environment Variables**, cadastre as variáveis do `.env.example`
   (`VITE_FIREBASE_*` e, se usar, `VITE_CLOUDINARY_*`), para Production e Preview.
3. **Deploy.** Se mudar uma variável depois, faça um novo deploy (elas são lidas na hora do build).

O `vercel.json` já manda qualquer rota para o `index.html`, então `/admin`, `/jogo/...` e `/campeonato/...`
abrem direto, também ao recarregar a página.

### 3. Domínio próprio

1. Na Vercel: **Settings > Domains > Add** e digite o domínio comprado (e o `www`, se quiser).
2. Ajuste o DNS no site onde comprou o domínio, exatamente como a Vercel mostrar (registro `A` para o domínio
   raiz e `CNAME` para o `www`, ou troque os nameservers para os da Vercel). Pode levar de minutos a algumas horas.
3. O HTTPS é ativado sozinho. O PWA só instala em HTTPS.

### 4. Liberar o domínio no Firebase (senão o login não funciona nele)

**Firebase > Authentication > Settings > Authorized domains > Add domain**. Adicione:

- o domínio comprado (`seudominio.com.br`) e o `www.seudominio.com.br`, se usar;
- o endereço da Vercel (`seu-projeto.vercel.app`), para testar antes de o domínio propagar.

### 5. Ordem do Firebase (resumo)

1. Criar as contas de admin (Authentication > Users).
2. Criar um documento em `admins` com o UID de cada uma.
3. Se já havia dados no banco, migrar com `scripts/migrate-finance.mjs` (seção "Migrar dados antigos").
4. **Só depois** publicar o `firestore.rules`.

### Como conferir depois

- Abra o site sem login: não aparece botão nem texto de Admin em nenhuma tela, e nenhum valor em reais.
- Digite `/admin` na URL: abre o login. Recarregue a página nessa rota: continua funcionando.
- Entre como admin: aparecem o selo "Admin", o Financeiro e os botões de edição.
- Saia: volta para a visão pública.

## Prévias em arquivo único

`npm run build:preview` gera dois arquivos com dados de exemplo e sem Firebase, em `dist-preview/`:

- `extremo-leste-publico.html`: o site como o visitante vê (sem login, sem valores).
- `extremo-leste-privado.html`: o site com o admin logado (Financeiro, edição, patrocinadores).

Servem só para demonstrar. No site de verdade quem decide é o login do Firebase.

## Ícones

`npm run icons` regenera os PNGs a partir de `public/favicon.svg`.
