# Anti-Mensagem Discord

Bot simples com exatamente 3 comandos:

- `/configurar canal:#canal` — define o canal protegido.
- `/imagem imagem:<arquivo>` — define a imagem do aviso.
- `/status` — mostra o canal protegido e quantas pessoas já foram expulsas.

## Como funciona

Quando uma pessoa sem permissão de Administrador envia uma mensagem no canal protegido, o bot tenta apagar a mensagem e expulsar o membro.

O contador de expulsões fica salvo em `data.json`, então não volta para zero quando o bot reinicia.

## Permissões

O bot precisa, no mínimo, de:
- Ver canais
- Enviar mensagens
- Incorporar links
- Gerenciar mensagens
- Expulsar membros

**Importante:** coloque o cargo do bot acima dos cargos dos membros que ele deverá expulsar.

## Variáveis

Configure:
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`

## Rodar

```bash
npm install
npm start
```
