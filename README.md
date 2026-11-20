# VIVA+ 💜 — Conectando pessoas

Plataforma web responsiva desenvolvida para aproximar **pessoas idosas, familiares e voluntários**, facilitando pedidos de ajuda, acompanhamento e interação social.

> **Projeto acadêmico / protótipo funcional.** Não substitui serviços profissionais de saúde ou de emergência.

## Objetivo

Promover inclusão digital e apoio cotidiano às pessoas idosas, com uma interface simples, botões de fácil identificação e recursos de acessibilidade.

## Perfis da plataforma

- **Pessoa idosa:** solicita ajuda, acompanha pedidos, registra bem-estar e acessa lembretes e atividades.
- **Voluntário:** consulta pedidos disponíveis, aceita solicitações e acompanha atendimentos.
- **Familiar:** utiliza as áreas de acompanhamento e vínculo familiar, conforme permissões configuradas no Supabase.

## Funcionalidades

- Cadastro e autenticação com **Supabase Auth**.
- Solicitações de ajuda compartilhadas entre contas por meio da tabela `help_requests`.
- Aceite e conclusão de solicitações pelos voluntários.
- Atualização periódica dos pedidos enquanto a plataforma está aberta.
- **Pop-up de confirmação** quando um voluntário aceita um pedido do idoso.
- Botão **Ouvir mensagem**, usando a síntese de voz do navegador.
- Registro de bem-estar (*check-in*), lembretes e visualização de atividades.
- Áreas específicas para idosos, familiares e voluntários.
- Interface responsiva para computadores e celulares.
- Recursos de SOS/localização presentes como funcionalidades de protótipo; **não presumir atendimento emergencial real**.

## Tecnologias

- React 18
- Vite 6
- JavaScript e CSS
- Supabase (autenticação e banco de dados PostgreSQL)
- Lucide React (ícones)
- APIs de voz do navegador (quando disponíveis)

## Como executar localmente

**Pré-requisito:** Node.js e npm instalados.

1. Clone o repositório ou baixe os arquivos.
2. Abra a pasta do projeto no VS Code.
3. Instale as dependências:

   ```bash
   npm install
   ```

4. Copie `.env.example` para `.env` e preencha com a URL do projeto e a **chave pública** do Supabase:

   ```env
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
   ```

5. Inicie o servidor:

   ```bash
   npm run dev
   ```

6. Abra o endereço informado no terminal (geralmente `http://localhost:5173`).

Para encerrar o servidor, pressione **Ctrl + C** no terminal.

### Configuração do banco de dados

Em um projeto Supabase novo, execute os scripts SQL na ordem, pelo **SQL Editor**:

1. `supabase/001_inicial.sql`
2. `supabase/002_vinculos_familiares.sql`
3. `supabase/003_solicitacoes_ajuda.sql`

Se necessário, atualize o cache da API após a execução:

```sql
NOTIFY pgrst, 'reload schema';
```

**Atenção:** os scripts alteram o banco de dados. Revise-os antes de executar, especialmente se o Supabase já contém registros. Nunca coloque chaves `service_role` ou outras chaves secretas no código frontend ou no GitHub.

## Como demonstrar o fluxo principal

1. Cadastre ou entre com uma conta do tipo **pessoa idosa**.
2. Abra uma segunda janela anônima e entre com uma conta de **voluntário**.
3. Na conta do idoso, crie um novo pedido de ajuda.
4. Na conta do voluntário, abra **Pedidos disponíveis** e aceite o pedido.
5. Volte à conta do idoso. O status será atualizado e deverá aparecer um **pop-up** de confirmação.
6. Clique em **Ouvir mensagem** para testar a leitura por voz.

> A verificação de pedidos acontece periodicamente enquanto a página está aberta. A síntese de voz depende da compatibilidade e das configurações de áudio do navegador.

## Organização do projeto

```text
VIVAmais/
├── src/
│   ├── App.jsx          # Interface e regras da aplicação
│   ├── main.jsx         # Entrada do React
│   ├── styles.css       # Estilos e responsividade
│   └── supabase.js      # Cliente Supabase
├── supabase/             # Scripts SQL do banco
├── index.html
├── package.json
├── .env.example          # Modelo de configuração (sem credenciais reais)
├── .gitignore
└── README.md
```

## Limitações e melhorias futuras

- A plataforma é um **protótipo acadêmico**; a funcionalidade SOS não garante comunicação com serviços de emergência.
- O pop-up é exibido dentro do site, não como notificação push quando o navegador está fechado.
- Geolocalização inteligente, notificações externas e outras integrações podem ser desenvolvidas futuramente.
- Para testar contas diferentes simultaneamente, utilize uma janela normal e outra anônima, pois sessões do Supabase podem ser compartilhadas entre abas do mesmo navegador.

## Segurança e publicação

- O arquivo `.env` é ignorado pelo Git e **não deve ser publicado**.
- Use somente a chave pública do Supabase no frontend.
- O banco deve manter as políticas **Row Level Security (RLS)** apropriadas para cada perfil.
- O GitHub hospeda o **código-fonte**; para disponibilizar o site em um link público, é necessário fazer o deploy em uma plataforma de hospedagem compatível com Vite.

## Documentação adicional

Consulte os arquivos `GUIA_SUPABASE.md`, `COMO_ATIVAR_VINCULO_FAMILIAR.md`, `ATUALIZACAO_PEDIDOS.md` e `POPUP_CONFIRMACAO.md` para detalhes de configuração e das etapas implementadas.

---

**VIVA+ — Conectando pessoas.** 💜
