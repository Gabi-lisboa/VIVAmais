# VIVA+ — Supabase (Etapa 1)

## O que já está conectado
- Cadastro/login com **Supabase Auth**, incluindo confirmação de e-mail quando habilitada.
- Perfil real por conta (`profiles`): idoso, familiar ou voluntário.
- Dados **pessoais** (pedidos, check-ins, lembretes, alertas) persistidos em `user_data` e protegidos por Row Level Security (RLS).
- Sem senha em `localStorage` no modo Supabase.
- Layout VIVA+ preservado. Sem `.env`, o aplicativo continua no modo demonstração local.

## Configuração
1. Crie um projeto em https://supabase.com/dashboard.
2. No painel, abra **SQL Editor** e execute todo o conteúdo de `supabase/001_inicial.sql`.
3. Em **Project Settings > API** (ou Connect), copie a **Project URL** e a chave **publishable** (ou `anon` legada).
4. O arquivo `.env` já contém a URL do seu projeto. Preencha apenas `VITE_SUPABASE_ANON_KEY` com sua chave **publishable** (ou `anon` legada).
5. Execute `npm install` e `npm run dev`. Reinicie o Vite se ele já estiver aberto.
6. Cadastre um usuário com e-mail real. Se a confirmação de e-mail estiver ativada em **Authentication**, confirme a mensagem recebida antes de entrar.
7. Faça login, crie um pedido ou check-in e atualize a página. Os dados pessoais serão carregados do Supabase.

**NUNCA** coloque chave `service_role` ou `secret` no arquivo `.env` do frontend. As variáveis `VITE_` ficam acessíveis no navegador. A segurança é feita pelo Supabase Auth + RLS.

## Limites desta primeira etapa
- O armazenamento é **por conta**, não compartilhado entre contas. Os recursos de vinculação familiar, atribuição de pedidos a voluntários, localização de terceiros e notificações entre dispositivos **ainda não estão integrados**. O sistema mostra um aviso ao entrar com Supabase.
- O SOS registra o pedido apenas nos dados da conta do idoso. **Não chama familiares, voluntários ou serviços de emergência**. Em emergência real, use 192/190.
- Atividades continuam ilustrativas. A busca de voluntário mais próximo só funciona no modo demonstração local, com dados de localização previamente registrados no mesmo navegador.
- Não use dados sensíveis reais até concluir as etapas de consentimento, acesso compartilhado, auditoria, políticas de privacidade e notificações.
- Os dados antigos do `localStorage` **não são importados** automaticamente para contas reais.
- O salvamento dos dados pessoais usa um documento JSON por usuário. É adequado para esta etapa inicial, mas a próxima migração deve separar pedidos, vínculos, alertas e localizações em tabelas próprias com políticas de acesso por relacionamento e atualizações concorrentes.

## Próxima etapa
Criar tabelas de `family_links` (com consentimento do idoso), `help_requests`, `emergency_alerts`, `volunteer_locations` e `notifications`, com RLS específico e atualizações em tempo real. Isso é necessário para a plataforma funcionar entre aparelhos com segurança.
