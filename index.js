const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");
const fs = require("fs");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Configure DISCORD_TOKEN, CLIENT_ID e GUILD_ID nas variáveis de ambiente.");
  process.exit(1);
}

const DATA_FILE = "./data.json";

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({
        protectedChannelId: null,
        imageUrl: null,
        expelled: 0
      }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { protectedChannelId: null, imageUrl: null, expelled: 0 };
  }
}

let data = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("configurar")
    .setDescription("Configura o canal protegido.")
    .addChannelOption(option =>
      option
        .setName("canal")
        .setDescription("Canal onde não será permitido enviar mensagens.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("imagem")
    .setDescription("Define a imagem exibida no aviso do canal protegido.")
    .addAttachmentOption(option =>
      option
        .setName("imagem")
        .setDescription("Envie a imagem do aviso.")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Mostra o status do canal protegido e o total de expulsões.")
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("Comandos registrados.");
}

function isAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

client.once("ready", async () => {
  console.log(`Online como ${client.user.tag}`);
  try {
    await registerCommands();
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!isAdmin(interaction.member)) {
    return interaction.reply({
      content: "❌ Apenas administradores podem usar este comando.",
      ephemeral: true
    });
  }

  if (interaction.commandName === "configurar") {
    const channel = interaction.options.getChannel("canal", true);

    data.protectedChannelId = channel.id;
    saveData();

    await interaction.reply({
      content: `✅ Canal protegido configurado: ${channel}`,
      ephemeral: true
    });

    try {
      const embed = new EmbedBuilder()
        .setTitle("🚫 NÃO ENVIE MENSAGENS NESTE CANAL")
        .setDescription("Este canal é somente para informações e avisos oficiais.")
        .setColor(0xff0000);

      if (data.imageUrl) embed.setImage(data.imageUrl);

      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Não consegui enviar o aviso no canal:", error);
    }
  }

  if (interaction.commandName === "imagem") {
    const attachment = interaction.options.getAttachment("imagem", true);

    if (!attachment.contentType || !attachment.contentType.startsWith("image/")) {
      return interaction.reply({
        content: "❌ O arquivo precisa ser uma imagem.",
        ephemeral: true
      });
    }

    data.imageUrl = attachment.url;
    saveData();

    await interaction.reply({
      content: "✅ Imagem configurada! O próximo aviso enviado pelo bot usará essa imagem.",
      ephemeral: true
    });

    if (data.protectedChannelId) {
      const channel = await client.channels.fetch(data.protectedChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("🚫 NÃO ENVIE MENSAGENS NESTE CANAL")
          .setDescription("Este canal é somente para informações e avisos oficiais.")
          .setColor(0xff0000)
          .setImage(data.imageUrl);

        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }

  if (interaction.commandName === "status") {
    const channelText = data.protectedChannelId
      ? `<#${data.protectedChannelId}>`
      : "Não configurado";

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Status do Anti-Mensagem")
      .addFields(
        { name: "Canal protegido", value: channelText, inline: true },
        { name: "Pessoas expulsas", value: String(data.expelled), inline: true }
      )
      .setColor(0x5865f2);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!data.protectedChannelId) return;
  if (message.channel.id !== data.protectedChannelId) return;
  if (!message.guild) return;

  // Administradores não são expulsos.
  if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

  try {
    await message.delete().catch(() => {});

    // O bot precisa ter "Expulsar membros" para esta parte funcionar.
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member) return;

    if (!member.kickable) {
      console.log(`Não foi possível expulsar ${message.author.tag}. Verifique a hierarquia/permissões.`);
      return;
    }

    await member.kick("Enviou mensagem em canal protegido");
    data.expelled += 1;
    saveData();
  } catch (error) {
    console.error("Erro ao processar mensagem no canal protegido:", error);
  }
});

client.login(TOKEN);
