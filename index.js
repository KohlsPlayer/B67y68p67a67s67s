require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Variável obrigatória ausente: ${key}`);
    process.exit(1);
  }
}

const commands = [
  new SlashCommandBuilder()
    .setName("bypass")
    .setDescription("Tenta resolver um link compatível")
    .addStringOption(option =>
      option
        .setName("link")
        .setDescription("Cole aqui o link que deseja resolver")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Mostra o avatar de um usuário")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuário desejado (opcional)")
        .setRequired(false)
    ),
].map(command => command.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const cooldowns = new Map();
const COOLDOWN_MS = 5000;

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const route = process.env.DISCORD_GUILD_ID
    ? Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      )
    : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log(
    process.env.DISCORD_GUILD_ID
      ? "Comandos registrados no servidor de teste."
      : "Comandos globais registrados."
  );
}

function extractResolvedUrl(data) {
  if (typeof data === "string" && isHttpUrl(data)) return data;
  if (!data || typeof data !== "object") return null;

  const directKeys = [
    "url", "result", "destination", "destination_url",
    "bypassed", "link", "target", "resolved"
  ];

  for (const key of directKeys) {
    const value = data[key];
    if (typeof value === "string" && isHttpUrl(value)) return value;
    if (value && typeof value === "object") {
      const nested = extractResolvedUrl(value);
      if (nested) return nested;
    }
  }

  for (const value of Object.values(data)) {
    if (value && typeof value === "object") {
      const nested = extractResolvedUrl(value);
      if (nested) return nested;
    }
  }
  return null;
}

async function callZenApi(originalUrl) {
  const endpoint = process.env.ZEN_API_URL;
  const apiKey = process.env.ZEN_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error(
      "A API ainda não foi configurada. O administrador precisa preencher ZEN_API_URL e ZEN_API_KEY."
    );
  }

  const timeoutMs = Number(process.env.ZEN_TIMEOUT_MS || 45000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // A chamada é feita exclusivamente no servidor. A chave nunca é enviada ao Discord.
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ url: originalUrl }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = raw; }

    if (!response.ok) {
      const message =
        data && typeof data === "object"
          ? (data.error || data.message || data.detail)
          : null;
      throw new Error(message || `A API respondeu com HTTP ${response.status}.`);
    }

    const resolved = extractResolvedUrl(data);
    if (!resolved) {
      throw new Error(
        "A API respondeu, mas não encontrei o link final. Confira o formato de resposta da documentação."
      );
    }
    return resolved;
  } finally {
    clearTimeout(timer);
  }
}

client.once("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const now = Date.now();
  const last = cooldowns.get(interaction.user.id) || 0;
  if (now - last < COOLDOWN_MS) {
    return interaction.reply({
      content: "Aguarde alguns segundos antes de usar outro comando.",
      ephemeral: true,
    });
  }
  cooldowns.set(interaction.user.id, now);

  if (interaction.commandName === "avatar") {
    const user = interaction.options.getUser("usuario") || interaction.user;
    const avatar = user.displayAvatarURL({ size: 1024, extension: "png" });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Avatar de ${user.username}`)
      .setImage(avatar)
      .setURL(avatar);

    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "bypass") {
    const link = interaction.options.getString("link", true).trim();

    if (!isHttpUrl(link)) {
      return interaction.reply({
        content: "Envie um link válido começando com http:// ou https://.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const resolved = await callZenApi(link);
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("Link resolvido")
        .setDescription(`[Abrir destino](${resolved})`)
        .addFields({ name: "Link final", value: resolved.slice(0, 1024) })
        .setFooter({ text: "Resultado retornado pela API configurada." });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Erro no /bypass:", error);
      await interaction.editReply({
        content: `Não foi possível resolver esse link: ${error.message}`.slice(0, 1900),
      });
    }
  }
});

(async () => {
  try {
    await registerCommands();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error("Falha ao iniciar o bot:", error);
    process.exit(1);
  }
})();
