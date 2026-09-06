# Rony Móveis

Site institucional e catálogo administrável da Rony Móveis, em Goiânia. O projeto não processa pagamentos: o cliente explora produtos, monta uma seleção, solicita orçamento e conclui o atendimento pelo WhatsApp.

## Estrutura

- Next.js 16 e React 19
- Vercel para hospedagem e deploy contínuo pelo GitHub
- Neon Postgres para produtos, campanhas e solicitações de orçamento
- Vercel Blob para fotos do catálogo e referências dos clientes
- Painel próprio em `/admin`, protegido por sessão assinada

## Desenvolvimento

```bash
npm install
npm run dev
```

Copie `.env.example` para `.env.local` e preencha as credenciais dos serviços.

## Variáveis de ambiente

- `DATABASE_URL`: conexão Postgres criada pela integração Neon na Vercel
- `BLOB_READ_WRITE_TOKEN`: token criado pela integração Vercel Blob
- `ADMIN_EMAIL`: e-mail autorizado a entrar no painel
- `ADMIN_PASSWORD`: senha forte, cadastrada como Secret na Vercel
- `NEXT_PUBLIC_SITE_URL`: endereço público final, sem barra no fim

O painel funciona somente com `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Para uma configuração avançada, `ADMIN_PASSWORD_HASH` pode substituir `ADMIN_PASSWORD`, e `ADMIN_SESSION_SECRET` pode receber um segredo aleatório com pelo menos 32 caracteres. Para gerar o hash:

```bash
node scripts/hash-admin-password.mjs "sua-senha-segura"
```

## Publicação

Importe `cristianovieira24/rony-moveis` na Vercel, conecte Neon e Vercel Blob ao projeto, configure as variáveis administrativas e faça o deploy. As tabelas e o catálogo inicial são preparados automaticamente no primeiro acesso.

## Verificação

```bash
npm run lint
npm run build
```
