import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  PermissionsBitField,
  ChannelType
} from "discord.js";
import {
  insertAgentBot,
  fetchAgentBots,
  updateAgentBotStatus,
  deleteAgentBot
} from "../utils/storage.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild],
  category: "admin"
};

function fmtTs(ms) {
  if (!ms) return "n/a";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function buildMainInvite(clientId) {
  const perms = new PermissionsBitField([
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.Connect,
    PermissionsBitField.Flags.Speak,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ModerateMembers
  ]);
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${perms.bitfield}&scope=bot%20applications.commands`;
}

export const data = new SlashCommandBuilder()
  .setName("agents")
  .setDescription("Deploy and manage Chopsticks agents")
  .addSubcommand(s => s.setName("status").setDescription("Status overview for this guild"))
  .addSubcommand(s => s.setName("manifest").setDescription("List every connected agent and identity"))
  .addSubcommand(s =>
    s
      .setName("deploy")
      .setDescription("Generate invite links to deploy more agents into this guild")
      .addIntegerOption(o =>
        o
          .setName("desired_total")
          .setDescription("Total number of agents you want available in this guild (multiples of 10, max 50)")
          .setRequired(true)
          .setMinValue(10) // Enforce minimum package size
          .setMaxValue(50)  // Enforce maximum total agents
      )
  )
  .addSubcommand(s => s.setName("sessions").setDescription("List active sessions for this guild"))
  .addSubcommand(s =>
    s
      .setName("assign")
      .setDescription("Pin a specific agent to a voice channel")
      .addChannelOption(o =>
        o.setName("channel").setDescription("Voice channel").setRequired(true).addChannelTypes(ChannelType.GuildVoice)
      )
      .addStringOption(o => o.setName("agent_id").setDescription("Agent ID (e.g. agent0001)").setRequired(true))
      .addStringOption(o =>
        o
          .setName("kind")
          .setDescription("Session type")
          .addChoices(
            { name: "music", value: "music" },
            { name: "assistant", value: "assistant" }
          )
      )
  )
  .addSubcommand(s =>
    s
      .setName("release")
      .setDescription("Release a session for a voice channel")
      .addChannelOption(o =>
        o.setName("channel").setDescription("Voice channel").setRequired(true).addChannelTypes(ChannelType.GuildVoice)
      )
      .addStringOption(o =>
        o
          .setName("kind")
          .setDescription("Session type")
          .addChoices(
            { name: "music", value: "music" },
            { name: "assistant", value: "assistant" }
          )
      )
  )
  .addSubcommand(s =>
    s
      .setName("scale")
      .setDescription("Scale active agents inside agentRunner (requires AGENT_SCALE_TOKEN)")
      .addIntegerOption(o =>
        o.setName("count").setDescription("Desired active agents").setRequired(true).setMinValue(1).setMaxValue(200)
      )
  )
  .addSubcommand(s =>
    s
      .setName("restart")
      .setDescription("Restart an agent by id (disconnects it so agentRunner reconnects)")
      .addStringOption(o => o.setName("agent_id").setDescription("Agent ID").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("add_token")
      .setDescription("Add a new agent token to the system")
      .addStringOption(o => o.setName("token").setDescription("Discord Bot Token").setRequired(true))
      .addStringOption(o => o.setName("client_id").setDescription("Discord Bot Client ID").setRequired(true))
      .addStringOption(o => o.setName("tag").setDescription("Bot Tag (e.g., BotName#1234)").setRequired(true))
  )
  .addSubcommand(s => s.setName("list_tokens").setDescription("List all registered agent tokens"))
  .addSubcommand(s =>
    s
      .setName("update_token_status")
      .setDescription("Update the status of an agent token")
      .addStringOption(o => o.setName("agent_id").setDescription("Agent ID (e.g., agent0001)").setRequired(true))
      .addStringOption(o =>
        o
          .setName("status")
          .setDescription("New status for the agent (active, inactive, or restarting)") // Added restarting
          .setRequired(true)
          .addChoices({ name: "active", value: "active" }, { name: "inactive", value: "inactive" }, { name: "restarting", value: "restarting" })
      )
  )
  .addSubcommand(s =>
    s
      .setName("delete_token")
      .setDescription("Delete an agent token from the system")
      .addStringOption(o => o.setName("agent_id").setDescription("Agent ID (e.g., agent0001)").setRequired(true))
  );

export async function execute(interaction) {
  const mgr = global.agentManager;
  if (!mgr) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Agent control not started." });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === "status") {
    const allAgents = await fetchAgentBots(); // Fetch all registered agents from DB
    const liveAgents = mgr.listAgents(); // Currently connected agents
    const liveAgentIds = new Set(liveAgents.map(a => a.agentId));

    const inGuild = liveAgents.filter(a => a.guildIds.includes(guildId));
    const idleInGuild = inGuild.filter(a => a.ready && !a.busyKey);
    const busyInGuild = inGuild.filter(a => a.ready && a.busyKey);

    const registeredButNotInGuild = allAgents.filter(a => !liveAgentIds.has(a.agent_id) || !liveAgents.find(la => la.agentId === a.agent_id)?.guildIds.includes(guildId));
    const invitable = registeredButNotInGuild.filter(a => a.status === 'active'); // Only active registered agents are invitable

    const lines = [];
    lines.push(`Registered agents: ${allAgents.length}`);
    lines.push(`Live (connected) agents: ${liveAgents.length}`);
    lines.push(`Agents present in this guild: ${inGuild.length}`);
    lines.push(`Idle agents in this guild: ${idleInGuild.length}`);
    lines.push(`Busy agents in this guild: ${busyInGuild.length}`);
    lines.push(`Invitable (active, not in guild) agents: ${invitable.length}`);
    lines.push("");

    lines.push("__Live Agents in Guild:__");
    if (inGuild.length === 0) lines.push("  None");
    for (const a of inGuild.sort((x, y) => String(x.agentId).localeCompare(String(y.agentId)))) {
      const state = a.ready ? (a.busyKey ? `busy(${a.busyKind || "?"})` : "idle") : "down";
      const ident = a.tag ? `${a.tag} (${a.botUserId})` : (a.botUserId ? String(a.botUserId) : "unknown-id");
      lines.push(`  ${a.agentId} — ${state} — seen ${fmtTs(a.lastSeen)} — ${ident}`);
    }
    lines.push("");

    lines.push("__Invitable Agents:__");
    if (invitable.length === 0) lines.push("  None");
    for (const a of invitable.sort((x, y) => String(x.agent_id).localeCompare(String(y.agent_id)))) {
      lines.push(`  ${a.agent_id} — ${a.tag} (${a.client_id}) — Status: ${a.status}`);
    }

    await interaction.reply({ flags: MessageFlags.Ephemeral, content: lines.join("\n").slice(0, 1900) });
    return;
  }

  if (sub === "manifest") {
    const agents = await fetchAgentBots(); // Fetch all registered agents from DB
    const liveAgents = mgr.listAgents(); // Currently connected agents
    const liveAgentMap = new Map(liveAgents.map(a => [a.agentId, a]));

    const lines = [];
    lines.push("__Registered Agents:__");
    if (agents.length === 0) lines.push("  None");
    for (const a of agents.sort((x, y) => String(x.agent_id).localeCompare(String(y.agent_id)))) {
      const liveStatus = liveAgentMap.get(a.agent_id);
      const state = liveStatus ? (liveStatus.ready ? (liveStatus.busyKey ? `busy(${liveStatus.busyKind || "?"})` : "idle") : "down (not connected)") : "offline (not connected)";
      const inGuildState = liveStatus?.guildIds.includes(guildId) ? "in-guild" : "not-in-guild";
      lines.push(`  ${a.agent_id} — Tag: ${a.tag} — Client ID: ${a.client_id} — DB Status: ${a.status} — Live Status: ${state} — ${inGuildState}`);
    }

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: lines.join("\n").slice(0, 1900)
    });
    return;
  }

  if (sub === "deploy") {
    const desiredTotal = interaction.options.getInteger("desired_total", true);

    if (desiredTotal % 10 !== 0) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `❌ The desired total number of agents must be a multiple of 10. You entered ${desiredTotal}.`
      });
      return;
    }

    const plan = await mgr.buildDeployPlan(guildId, desiredTotal); // Now async

    const lines = [];
    lines.push(`Desired total agents in this guild: ${plan.desired}`);
    lines.push(`Currently present: ${plan.presentCount}`);
    lines.push(`Need invites: ${plan.needInvites}`);
    lines.push("");

    if (plan.invites.length) {
      lines.push("To deploy more agents, invite these bot identities:");
      for (const inv of plan.invites) {
        const label = inv.tag ? `${inv.agentId} (${inv.tag})` : inv.agentId;
        // Use client_id from the stored agent bot for the invite URL
        lines.push(`- **${label}**: <${buildMainInvite(inv.botUserId)}>`);
      }
    } else {
      lines.push("No invites needed (already at or above desired count, or no available agents to invite).");
    }

    // If there's an issue and still need invites but none are available for invite
    if (plan.needInvites > 0 && plan.invites.length === 0) {
        lines.push("");
        lines.push("💡 If you need more agents, ensure they are registered and active:");
        lines.push("1. Use `/agents add_token` to register new agents.");
        lines.push("2. Ensure registered agents are marked `active` using `/agents update_token_status`.");
        lines.push("3. Start `chopsticks-agent-runner` processes (e.g., via PM2) to bring agents online.");
        lines.push("4. Rerun `/agents deploy`.");
    }

    await interaction.reply({ flags: MessageFlags.Ephemeral, content: lines.join("\n").slice(0, 1900) });
    return;
  }

  if (sub === "sessions") {
    const sessions = mgr
      .listSessions()
      .filter(s => s.guildId === guildId)
      .map(s => `music ${s.voiceChannelId} -> ${s.agentId}`);

    const assistantSessions = mgr
      .listAssistantSessions()
      .filter(s => s.guildId === guildId)
      .map(s => `assistant ${s.voiceChannelId} -> ${s.agentId}`);

    const lines = [...sessions, ...assistantSessions];
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: lines.length ? lines.join("\n") : "No sessions for this guild."
    });
    return;
  }

  if (sub === "assign") {
    const channel = interaction.options.getChannel("channel", true);
    const agentId = interaction.options.getString("agent_id", true);
    const kind = interaction.options.getString("kind") || "music";
    const agent = mgr.agents.get(agentId);
    if (!agent?.ready || !agent.ws) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Agent not ready." });
      return;
    }
    if (kind === "assistant") {
      mgr.setPreferredAssistant(guildId, channel.id, agentId, 300_000);
    } else {
      mgr.setPreferredAgent(guildId, channel.id, agentId, 300_000);
    }
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Pinned ${agentId} to ${channel.id} (${kind}).` });
    return;
  }

  if (sub === "release") {
    const channel = interaction.options.getChannel("channel", true);
    const kind = interaction.options.getString("kind") || "music";

    if (kind === "assistant") {
      const sess = mgr.getAssistantSessionAgent(guildId, channel.id);
      if (sess.ok) {
        try {
          await mgr.request(sess.agent, "assistantLeave", {
            guildId,
            voiceChannelId: channel.id,
            actorUserId: interaction.user.id
          });
        } catch {}
        mgr.releaseAssistantSession(guildId, channel.id);
      }
    } else {
      const sess = mgr.getSessionAgent(guildId, channel.id);
      if (sess.ok) {
        try {
          await mgr.request(sess.agent, "stop", {
            guildId,
            voiceChannelId: channel.id,
            actorUserId: interaction.user.id
          });
        } catch {}
        mgr.releaseSession(guildId, channel.id);
      }
    }

    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Released ${kind} session for ${channel.id}.` });
    return;
  }

  if (sub === "scale") {
    const count = interaction.options.getInteger("count", true);
    const scaleToken = String(process.env.AGENT_SCALE_TOKEN || "").trim();
    if (!scaleToken) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "AGENT_SCALE_TOKEN not configured." });
      return;
    }
    const any = mgr.listAgents().find(a => a.ready);
    if (!any) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "No ready agent available." });
      return;
    }
    const agentObj = mgr.agents.get(any.agentId);
    try {
      const res = await mgr.request(agentObj, "scale", { desiredActive: count, scaleToken });
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Scale result: ${res?.action ?? "ok"} (active: ${res?.active ?? "?"})`
      });
    } catch (err) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Scale failed: ${err?.message ?? err}` });
    }
    return;
  }

  if (sub === "restart") {
    const agentId = interaction.options.getString("agent_id", true);
    // Use the new updateAgentBotStatus to set status to 'restarting'
    try {
      await mgr.updateAgentBotStatus(agentId, 'restarting');
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Agent ${agentId} marked for restart. AgentRunner will handle reconnection.` });
    } catch (error) {
      console.error(`Error marking agent ${agentId} for restart: ${error}`);
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Failed to mark agent for restart: ${error.message}` });
    }
    return;
  }

  if (sub === "add_token") {
    const token = interaction.options.getString("token", true);
    const clientId = interaction.options.getString("client_id", true);
    const tag = interaction.options.getString("tag", true);
    const agentId = `agent${clientId}`; // Use client ID to form a unique agent ID

    try {
      const result = await insertAgentBot(agentId, token, clientId, tag);
      const operationMsg = result.operation === 'inserted' ? 'added' : 'updated';
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Agent token ${agentId} ${operationMsg} successfully. AgentRunner will attempt to start it.` });
    } catch (error) {
      console.error(`Error adding/updating agent token: ${error}`); // Updated log message
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Failed to add/update agent token: ${error.message}` }); // Updated reply message
    }
    return;
  }

  if (sub === "list_tokens") {
    try {
      const tokens = await fetchAgentBots(); // Use mgr method
      if (tokens.length === 0) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "No agent tokens registered." });
        return;
      }

      const lines = tokens.map(t => `ID: ${t.agent_id}, Client ID: ${t.client_id}, Tag: ${t.tag}, Status: ${t.status}`);
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: lines.join("\n").slice(0, 1900) });
    } catch (error) {
      console.error(`Error listing agent tokens: ${error}`);
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Failed to list agent tokens: ${error.message}` });
    }
    return;
  }

  if (sub === "update_token_status") {
    const agentId = interaction.options.getString("agent_id", true);
    const status = interaction.options.getString("status", true);

    try {
      const updated = await updateAgentBotStatus(agentId, status); // Await boolean return
      if (updated) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Agent ${agentId} status updated to ${status}.` });
      } else {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Agent ${agentId} not found.` });
      }
    } catch (error) {
      console.error(`Error updating agent token status: ${error}`);
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Failed to update agent token status: ${error.message}` });
    }
    return;
  }

  if (sub === "delete_token") {
    const agentId = interaction.options.getString("agent_id", true);

    try {
      const deleted = await deleteAgentBot(agentId); // Await the boolean return
      if (deleted) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Agent token ${agentId} deleted.` });
      } else {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Agent token ${agentId} not found or already deleted.` });
      }
    } catch (error) {
      console.error(`Error deleting agent token: ${error}`);
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Failed to delete agent token: ${error.message}` });
    }
    return;
  }
}
