# Pop-up de solicitação aceita — correção v2

- A consulta à tabela `help_requests` ocorre a cada 8 segundos.
- O aviso é exibido na conta do idoso para pedidos com status `Aceita` (ou `Aceito`).
- O aviso só é marcado como lido após clicar em **Entendi, obrigado!**; recarregar a página não o descarta.
- O botão **Ouvir mensagem** usa a voz do navegador.
- Não é necessário executar SQL novo.

## Teste
1. Extraia este ZIP numa pasta nova, abra `VIVAmais_completo` no VS Code.
2. Execute `npm install` e `npm run dev`.
3. Abra o idoso em uma janela e o voluntário em janela anônima.
4. Crie e aceite um novo pedido; volte à janela do idoso e aguarde 8–10 segundos.
5. Clique em **Ouvir mensagem** e depois **Entendi, obrigado!**.

A versão v2 usa uma nova chave local para permitir retestar os avisos que a versão anterior marcou como vistos antes da exibição.
