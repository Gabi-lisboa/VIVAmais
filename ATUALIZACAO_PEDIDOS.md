# VIVA+ — Pedidos compartilhados no Supabase

## 1. Banco de dados

No painel Supabase, abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/003_solicitacoes_ajuda.sql` e clique em **Run**. Aguarde `Success`.

O SQL cria a tabela `help_requests`, regras RLS e duas funções seguras para aceitar e concluir pedidos. Também importa solicitações antigas do JSON `user_data.payload.requests`, incluindo **Ir ao mercado**, sem apagar os registros originais.

## 2. Aplicativo

Extraia este ZIP, abra a pasta `VIVAmais_completo` no VS Code e execute:

```bash
npm install
npm run dev
```

## 3. Teste

1. Entre como **idoso** em uma janela normal e crie um novo pedido.
2. Entre como **voluntário** em janela anônima ou outro navegador.
3. Clique em **Atualizar pedidos**. O pedido deve aparecer. O painel também consulta o banco a cada 8 segundos.
4. Clique em **Aceitar pedido**. O idoso verá a mudança após atualizar ou aguardar a sincronização.
5. Volte ao voluntário e clique em **Marcar concluída**.

## Atenção

- A tabela `user_data` continua sendo usada para dados pessoais. Se aparecer o erro de RLS nessa tabela, suas políticas ainda precisam ser verificadas separadamente.
- A localização e o envio automático de alertas SOS não fazem parte desta atualização de compartilhamento. Emergências ainda não substituem serviços oficiais.
- O compartilhamento de pedidos é restrito a voluntários autenticados; dados pessoais do idoso não são expostos pela tabela de pedidos.
- Pedidos antigos de status `Disponível` serão importados. Não execute `001_inicial.sql` novamente.
