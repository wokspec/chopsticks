import { SlashCommandBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("commands")
  .setDescription("Browse commands")
  .addSubcommand(s =>
    s.setName("list").setDescription("List categories")
  )
  .addSubcommand(s =>
    s
      .setName("category")
      .setDescription("List commands in a category")
      .addStringOption(o => o.setName("name").setDescription("Category").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("search")
      .setDescription("Search commands")
      .addStringOption(o => o.setName("term").setDescription("Search term").setRequired(true))
  );

function categorize(commands) {
  const map = {
    mod: new Set(["ban","unban","kick","timeout","purge","slowmode","warn","warnings","clearwarns","lock","unlock","nick","softban","role"]),
    util: new Set(["ping","uptime","help","serverinfo","userinfo","avatar","roleinfo","botinfo","invite","echo"]),
    fun: new Set(["8ball","coinflip","roll","choose"]),
    admin: new Set(["config","prefix","alias","agents"]),
    music: new Set(["music"]),
    voice: new Set(["voice","welcome","autorole"]),
    tools: new Set(["poll","giveaway","remind"]),
    assistant: new Set(["assistant"])
  };
  const out = new Map();
  for (const c of commands.values()) {
    let cat = c.meta?.category;
    if (!cat) {
      const name = c.data?.name || "";
      for (const [k, set] of Object.entries(map)) {
        if (set.has(name)) { cat = k; break; }
      }
    }
    if (!cat) cat = "general";
    const list = out.get(cat) || [];
    list.push(c.data?.name || "unknown");
    out.set(cat, list);
  }
  for (const [k, v] of out.entries()) {
    v.sort();
    out.set(k, v);
  }
  return out;
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const cmds = interaction.client.commands;
  const cats = categorize(cmds);

  if (sub === "list") {
    const list = Array.from(cats.keys()).sort();
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Categories:\n" + list.join(", ")
    });
    return;
  }

  if (sub === "category") {
    const name = interaction.options.getString("name", true);
    const list = cats.get(name);
    if (!list) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Category not found." });
      return;
    }
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `/${name}: ` + list.map(c => `/${c}`).join(", ")
    });
    return;
  }

  if (sub === "search") {
    const term = interaction.options.getString("term", true).toLowerCase();
    const hits = [];
    for (const c of cmds.values()) {
      const name = c.data?.name || "";
      if (name.includes(term)) hits.push(name);
    }
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: hits.length ? hits.map(n => `/${n}`).join(", ") : "No matches."
    });
  }
}
