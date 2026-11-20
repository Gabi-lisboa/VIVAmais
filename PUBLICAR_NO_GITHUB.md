# Publicar o VIVA+ no GitHub

1. Crie um repositório vazio no GitHub, por exemplo `VIVAmais` (não marque a opção de criar README, pois este projeto já possui um).
2. Extraia o ZIP, abra a pasta `VIVAmais` no VS Code e abra o terminal.
3. Execute os comandos abaixo, substituindo `SEU-USUARIO` pelo seu usuário do GitHub:

```bash
git init
git add .
git commit -m "Entrega do projeto VIVA+"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/VIVAmais.git
git push -u origin main
```

Antes de enviar, confira se o `.env` não aparece em `git status` ou `git ls-files`.

Se você já criou o repositório e ele tem arquivos, evite executar esses comandos às cegas: abra o repositório existente e copie os arquivos atualizados para ele.

**Importante:** o Supabase é um serviço externo. O código publicado não inclui as contas nem os dados já salvos no seu banco. O professor precisará de acesso ao aplicativo implantado e/ou de instruções para configurar o banco caso deseje executar localmente.
