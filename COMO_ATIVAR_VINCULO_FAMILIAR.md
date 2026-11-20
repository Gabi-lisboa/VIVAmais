# VIVA+ — Conectar familiares ao idoso (Etapa 2)

## 1. Instalar a atualização do banco

1. Entre no seu projeto Supabase → **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/002_vinculos_familiares.sql` deste ZIP.
3. Copie **todo** o SQL, cole no editor e clique em **Run**.
4. O SQL cria a tabela `family_links` e as funções necessárias. Não apaga as contas já cadastradas.

**Não é necessário executar `001_inicial.sql` novamente.**

## 2. Executar a nova versão

Extraia o ZIP, abra `VIVAmais_completo` no VS Code e rode:

```bash
npm install
npm run dev
```

O arquivo `.env` já foi incluído com a URL e a chave pública do projeto que você forneceu. Nunca coloque `service_role`, `secret key` ou senha do banco no `.env` do React.

## 3. Teste com duas contas

1. Entre como **familiar** e abra **Pessoa acompanhada**.
2. Digite o e-mail da conta de **idoso** e clique em **Solicitar vínculo**.
3. Saia da conta familiar e entre como **idoso**.
4. Abra **Minha família**, clique em **Atualizar solicitações** e **Aceitar**.
5. Entre novamente como familiar e clique em **Atualizar vínculos**.
6. O idoso deverá aparecer como **Vínculo ativo**. Os registros compartilhados são lidos do Supabase.

## Segurança e limites

- A busca pelo e-mail ocorre dentro de uma função SQL protegida; o navegador não recebe a lista de contas.
- Apenas a pessoa idosa pode aprovar ou recusar o pedido.
- As informações compartilhadas só são retornadas ao familiar depois da aprovação.
- Dados como lembretes, anotações e alertas podem ser sensíveis. O idoso deve entender que está autorizando esse compartilhamento.
- **Ainda não há notificações push ou envio automático de SOS entre dispositivos.** O familiar pode atualizar a tela para consultar os registros autorizados.
- Para produção ainda são necessários revogação de vínculo, consentimento granular, revisão de segurança, tratamento de dados pessoais e testes completos.
