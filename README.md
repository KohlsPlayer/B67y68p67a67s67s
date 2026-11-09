# Bot Discord — /bypass e /avatar

Projeto Node.js com discord.js v14.

## Importante sobre a API Zen

O bot faz a chamada à API no servidor e não revela a chave aos membros. Os termos do Zen exigem integração server-side e proíbem expor a API ou a chave.

**Antes de usar `/bypass`, obtenha a documentação oficial da API e preencha `ZEN_API_URL` com o endpoint exato.** O site público `https://izen.lol/` não é, por si só, o endpoint da API. Este projeto não inventa o endereço do endpoint.

O adaptador está preparado para `POST`, header `x-api-key` e JSON `{ "url": "..." }`. Se a documentação da sua conta indicar outro formato de autenticação/corpo ou outra propriedade de resposta, ajuste a função `callZenApi` e `extractResolvedUrl` em `index.js`.

## Variáveis necessárias

Copie `.env.example` para `.env` e preencha:

- `DISCORD_TOKEN`: token do bot.
- `DISCORD_CLIENT_ID`: Application ID.
- `DISCORD_GUILD_ID`: opcional; ID do servidor para registrar os comandos imediatamente.
- `ZEN_API_URL`: endpoint da API conforme a documentação oficial.
- `ZEN_API_KEY`: sua chave da API.

Nunca publique o arquivo `.env`, nem envie sua chave em prints ou mensagens.

## Executar

Requer Node.js 20 ou superior.

```bash
npm install
npm start
```

## Criar o bot no Discord

1. Acesse https://discord.com/developers/applications
2. Crie uma aplicação e abra a aba **Bot**.
3. Gere/copiei o token e guarde em segredo.
4. Em **OAuth2 > URL Generator**, marque `bot` e `applications.commands`.
5. Dê ao bot permissões para ver canais e enviar mensagens/embeds.
6. Convide o bot ao servidor.
7. Copie o Application ID para `DISCORD_CLIENT_ID`.
8. Opcionalmente, copie o ID do servidor para `DISCORD_GUILD_ID` (ative o Modo Desenvolvedor no Discord).

## Hospedagem: Northflank

O plano Sandbox lista dois serviços gratuitos, até US$20/mês em recursos e execução sem suspensão por inatividade. A disponibilidade de recursos e os limites do Sandbox se aplicam; a documentação também diz que o plano é para projetos de teste/hobby, não produção. Confira os termos antes de depender dele para um bot público.

1. Crie uma conta em https://northflank.com/.
2. Crie um projeto e um serviço a partir de um repositório Git ou Dockerfile.
3. Envie estes arquivos para um repositório GitHub e conecte-o ao Northflank.
4. Configure as variáveis de ambiente listadas acima no painel do serviço.
5. Comando de inicialização: `npm start`.
6. Deploy.

O processo do bot precisa permanecer ativo para manter a conexão Gateway do Discord.

## Comandos

- `/bypass link:<URL>` — tenta resolver um link e responde de forma privada.
- `/avatar usuario:<opcional>` — mostra o avatar escolhido ou o seu próprio avatar.
