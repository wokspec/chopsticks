// src/lavalink/agentLavalink.js
import { LavalinkManager } from "lavalink-client";
import { request } from "undici";

export function createAgentLavalink(agentClient) {
  if (!agentClient?.user?.id) throw new Error("agent-client-not-ready");

  let manager = null;
  let rawHooked = false;

  const ctxBySession = new Map(); // sessionKey -> ctx
  const locks = new Map(); // sessionKey -> Promise chain

  // Track Discord voice readiness for THIS agent user (per guild)
  const voiceStateByGuild = new Map(); // guildId -> { channelId, sessionId }
  const voiceServerByGuild = new Map(); // guildId -> { token, endpoint }
  const voiceWaiters = new Map(); // guildId -> Array<{ vcId, resolve, reject, t }>

  function clampMs(v, fallback, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  }

  const STOP_GRACE_MS = clampMs(process.env.MUSIC_STOP_GRACE_MS, 15_000, 0, 300_000);
  const DEFAULT_VOLUME = clampMs(process.env.MUSIC_DEFAULT_VOLUME, 100, 0, 150);
  const DEFAULT_MAX_QUEUE = clampMs(process.env.MUSIC_MAX_QUEUE, 100, 1, 10_000);
  const DEFAULT_MAX_TRACK_MINUTES = clampMs(process.env.MUSIC_MAX_TRACK_MINUTES, 20, 1, 24 * 60);
  const DEFAULT_MAX_QUEUE_MINUTES = clampMs(process.env.MUSIC_MAX_QUEUE_MINUTES, 120, 1, 24 * 60);

  function normalizeLimits(input) {
    const l = input && typeof input === "object" ? input : {};
    const maxQueue = clampMs(l.maxQueue, DEFAULT_MAX_QUEUE, 1, 10_000);
    const maxTrackMinutes = clampMs(l.maxTrackMinutes, DEFAULT_MAX_TRACK_MINUTES, 1, 24 * 60);
    const maxQueueMinutes = clampMs(l.maxQueueMinutes, DEFAULT_MAX_QUEUE_MINUTES, 1, 24 * 60);
    return { maxQueue, maxTrackMinutes, maxQueueMinutes };
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function ensureRawHook() {
    if (rawHooked) return;
    rawHooked = true;

    agentClient.on("raw", d => {
      try {
        manager?.sendRawData(d);
      } catch {}

      // Record Discord voice readiness
      try {
        const t = d?.t;
        const data = d?.d;
        if (!t || !data) return;

        if (t === "VOICE_STATE_UPDATE") {
          const selfId = agentClient.user?.id;
          if (!selfId) return;
          if (String(data.user_id) !== String(selfId)) return;
          const guildId = data.guild_id;
          if (!guildId) return;

          voiceStateByGuild.set(guildId, {
            channelId: data.channel_id ?? null,
            sessionId: data.session_id ?? null
          });

          resolveVoiceWaiters(guildId);
          return;
        }

        if (t === "VOICE_SERVER_UPDATE") {
          const guildId = data.guild_id;
          if (!guildId) return;

          voiceServerByGuild.set(guildId, {
            token: data.token ?? null,
            endpoint: data.endpoint ?? null
          });

          resolveVoiceWaiters(guildId);
        }
      } catch {}
    });
  }

  function isTransientSocketError(err) {
    const msg = String(err?.message ?? err ?? "").toLowerCase();
    return (
      msg.includes("econnreset") ||
      msg.includes("socket hang up") ||
      msg.includes("unexpected server response") ||
      msg.includes("closed") ||
      msg.includes("1006")
    );
  }

  function bindErrorHandlersOnce() {
    if (!manager) return;
    if (manager.__chopsticksBound) return;
    manager.__chopsticksBound = true;

    try {
      manager.on("error", err => {
        if (isTransientSocketError(err)) return;
        console.error("[agent:lavalink:manager:error]", err?.message ?? err);
      });
    } catch {}

    try {
      manager.nodeManager?.on?.("disconnect", () => {});
      manager.nodeManager?.on?.("reconnecting", () => {});
      manager.nodeManager?.on?.("error", (node, err) => {
        if (isTransientSocketError(err)) return;
        console.error(
          "[agent:lavalink:node:error]",
          node?.options?.id ?? "node",
          err?.message ?? err
        );
      });
    } catch {}
  }

  async function start() {
    if (manager) return manager;

    const lavalinkHost = process.env.LAVALINK_HOST || "127.0.0.1";
    const lavalinkPort = Number(process.env.LAVALINK_PORT);
    const lavalinkPassword = process.env.LAVALINK_PASSWORD;

    if (!lavalinkHost) {
      throw new Error("Lavalink: LAVALINK_HOST environment variable is not set.");
    }
    if (!Number.isFinite(lavalinkPort) || lavalinkPort <= 0) {
      throw new Error("Lavalink: LAVALINK_PORT environment variable is not a valid number.");
    }
    if (!lavalinkPassword) {
      throw new Error("Lavalink: LAVALINK_PASSWORD environment variable is not set.");
    }

    manager = new LavalinkManager({
      nodes: [
        {
          id: "main",
          host: lavalinkHost,
          port: lavalinkPort,
          authorization: lavalinkPassword
        }
      ],
      sendToShard: (guildId, payload) => {
        const guild = agentClient.guilds.cache.get(guildId);
        guild?.shard?.send(payload);
      },
      client: { id: agentClient.user.id, username: agentClient.user.username },
      autoSkip: true,
      playerOptions: {
        defaultSearchPlatform: "ytsearch",
        onDisconnect: { autoReconnect: true, destroyPlayer: false },
        onEmptyQueue: { destroyAfterMs: 300_000 }
      }
    });

    ensureRawHook();
    bindErrorHandlersOnce();

    const maxAttempts = clampMs(process.env.LAVALINK_INIT_RETRIES, 12, 1, 50);
    let lastErr = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await manager.init({ id: agentClient.user.id, username: agentClient.user.username });
        return manager;
      } catch (err) {
        lastErr = err;
        await sleep(Math.min(2000, 150 * attempt));
      }
    }

    throw lastErr ?? new Error("lavalink-init-failed");
  }

  function sessionKey(guildId, voiceChannelId) {
    return `${guildId}:${voiceChannelId}`;
  }

  function normalizeSearchQuery(input) {
    const q = String(input ?? "").trim();
    if (!q) return "";
    if (/^https?:\/\//i.test(q)) return q;
    return `ytsearch:${q}`;
  }

  function withSessionLock(key, fn) {
    const prev = locks.get(key) ?? Promise.resolve();
    const next = prev
      .catch(() => {})
      .then(fn)
      .finally(() => {
        if (locks.get(key) === next) locks.delete(key);
      });

    locks.set(key, next);
    return next;
  }

  function withCtxLock(ctx, fn) {
    return withSessionLock(sessionKey(ctx.guildId, ctx.voiceChannelId), fn);
  }

  function assertOwner(ctx, userId) {
    if (!userId) throw new Error("missing-owner");
    if (ctx.ownerId !== userId) throw new Error("not-owner");
  }

  function getCurrent(player) {
    return player?.queue?.current ?? null;
  }

  function serializeTrack(track) {
    if (!track) return null;
    const info = track.info ?? {};
    return {
      title: info.title ?? "Unknown title",
      uri: info.uri ?? null,
      author: info.author ?? null,
      length: info.length ?? null,
      sourceName: info.sourceName ?? null,
      thumbnail: info.artworkUrl ?? info.thumbnail ?? null, // Added thumbnail
      requester: track.requester ?? null // Added requester
    };
  }

  function getQueueTracks(player) {
    const q = player?.queue;
    if (!q) return [];
    if (Array.isArray(q.tracks)) return q.tracks;
    if (Array.isArray(q.items)) return q.items;
    if (Array.isArray(q)) return q;
    return [];
  }

  function trackLengthMs(track) {
    const n = Number(track?.info?.length);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.trunc(n);
  }

  function queueTotalMs(player) {
    let total = 0;
    const current = getCurrent(player);
    const curLen = trackLengthMs(current);
    if (curLen > 0) total += curLen;

    for (const t of getQueueTracks(player)) {
      const len = trackLengthMs(t);
      if (len > 0) total += len;
    }
    return total;
  }

  function queueTotalCount(player) {
    let count = 0;
    const current = getCurrent(player);
    if (current) count++;
    count += getQueueTracks(player).length;
    return count;
  }

  function enforceTrackLimits(player, track, limits) {
    const maxQueue = Number(limits?.maxQueue);
    const maxTrackMinutes = Number(limits?.maxTrackMinutes);
    const maxQueueMinutes = Number(limits?.maxQueueMinutes);

    if (Number.isFinite(maxQueue)) {
      const count = queueTotalCount(player);
      if (count + 1 > maxQueue) throw new Error("queue-full");
    }

    const lengthMs = trackLengthMs(track);
    if (Number.isFinite(maxTrackMinutes) && lengthMs > 0) {
      const maxMs = Math.max(1, Math.trunc(maxTrackMinutes)) * 60_000;
      if (lengthMs > maxMs) throw new Error("track-too-long");
    }

    if (Number.isFinite(maxQueueMinutes)) {
      const totalMs = queueTotalMs(player) + lengthMs;
      const maxMs = Math.max(1, Math.trunc(maxQueueMinutes)) * 60_000;
      if (totalMs > maxMs) throw new Error("queue-too-long");
    }
  }

  function removeTrackAt(player, index) {
    const q = player?.queue;
    const i = Math.trunc(Number(index));
    if (!Number.isFinite(i) || i < 0) return false;

    if (Array.isArray(q?.tracks)) {
      if (i >= q.tracks.length) return false;
      q.tracks.splice(i, 1);
      return true;
    }
    if (Array.isArray(q?.items)) {
      if (i >= q.items.length) return false;
      q.items.splice(i, 1);
      return true;
    }
    if (Array.isArray(q)) {
      if (i >= q.length) return false;
      q.splice(i, 1);
      return true;
    }
    return false;
  }

  function bestEffortClearQueue(player) {
    const q = player?.queue;
    if (!q) return;

    try {
      if (typeof q.clear === "function") return q.clear();
    } catch {}

    try {
      if (Array.isArray(q)) return void (q.length = 0);
      if (Array.isArray(q.tracks)) return void (q.tracks.length = 0);
      if (typeof q.splice === "function" && typeof q.length === "number") return void q.splice(0, q.length);
    } catch {}
  }

  function markStopping(ctx, ms) {
    ctx.__stopping = true;
    ctx.__destroyAt = Date.now() + Math.max(0, Math.trunc(ms));
    if (ctx.__destroyTimer) clearTimeout(ctx.__destroyTimer);
    ctx.__destroyTimer = setTimeout(() => {
      try {
        destroySession(ctx.guildId, ctx.voiceChannelId);
      } catch {}
    }, Math.max(0, Math.trunc(ms)));
  }

  function stoppingRemainingMs(ctx) {
    if (!ctx?.__stopping || !ctx.__destroyAt) return 0;
    return Math.max(0, ctx.__destroyAt - Date.now());
  }

  function clearStopping(ctx) {
    if (!ctx) return;
    ctx.__stopping = false;
    ctx.__destroyAt = null;
    if (ctx.__destroyTimer) {
      clearTimeout(ctx.__destroyTimer);
      ctx.__destroyTimer = null;
    }
  }

  function isDiscordVoiceReady(guildId, voiceChannelId) {
    const vs = voiceStateByGuild.get(guildId);
    const vsv = voiceServerByGuild.get(guildId);
    if (!vs || !vsv) return false;
    if (!vs.sessionId || !vs.channelId) return false;
    if (!vsv.token || !vsv.endpoint) return false;
    if (String(vs.channelId) !== String(voiceChannelId)) return false;
    return true;
  }

  function resolveVoiceWaiters(guildId) {
    const list = voiceWaiters.get(guildId);
    if (!list?.length) return;

    const remaining = [];
    for (const w of list) {
      if (isDiscordVoiceReady(guildId, w.vcId)) {
        clearTimeout(w.t);
        w.resolve(true);
      } else {
        remaining.push(w);
      }
    }
    if (remaining.length) voiceWaiters.set(guildId, remaining);
    else voiceWaiters.delete(guildId);
  }

  function waitForDiscordVoiceReady(guildId, voiceChannelId, timeoutMs = 12_000) {
    if (isDiscordVoiceReady(guildId, voiceChannelId)) return Promise.resolve(true);

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        const list = voiceWaiters.get(guildId) ?? [];
        const next = list.filter(x => x.resolve !== resolve);
        if (next.length) voiceWaiters.set(guildId, next);
        else voiceWaiters.delete(guildId);
        reject(new Error("voice-not-ready"));
      }, Math.max(500, Number(timeoutMs) || 12_000));

      const list = voiceWaiters.get(guildId) ?? [];
      list.push({ vcId: voiceChannelId, resolve, reject, t });
      voiceWaiters.set(guildId, list);
    });
  }

  // ----- REST backstops (authoritative) -----

  function getNodeFromPlayer(player) {
    return (
      player?.node ||
      player?._node ||
      player?.connection?.node ||
      manager?.nodeManager?.nodes?.get?.("main") ||
      null
    );
  }

  function getLavalinkSessionId(node) {
    return (
      node?.sessionId ||
      node?.session_id ||
      node?.session?.id ||
      node?.session?.sessionId ||
      node?.state?.sessionId ||
      null
    );
  }

  async function lavalinkPatch(player, guildId, body) {
    const node = getNodeFromPlayer(player);
    const sessionId = getLavalinkSessionId(node);

    if (!node || !sessionId) return false;

    const host = node?.options?.host || process.env.LAVALINK_HOST || "127.0.0.1";
    const port = Number(node?.options?.port || process.env.LAVALINK_PORT || 2333);
    const password = node?.options?.authorization || process.env.LAVALINK_PASSWORD || "youshallnotpass";

    const url = `http://${host}:${port}/v4/sessions/${encodeURIComponent(
      String(sessionId)
    )}/players/${encodeURIComponent(String(guildId))}`;

    try {
      const res = await request(url, {
        method: "PATCH",
        headers: { Authorization: password, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      try {
        await res.body.text();
      } catch {}

      return res.statusCode >= 200 && res.statusCode < 300;
    } catch {
      return false;
    }
  }

  async function ensureUnpaused(player, guildId) {
    await lavalinkPatch(player, guildId, { paused: false });
  }

  async function ensurePaused(player, guildId) {
    await lavalinkPatch(player, guildId, { paused: true });
  }

  async function restStopNow(player, guildId) {
    // Hard stop: clear current track and pause.
    // Matches what you’re already seeing in docker logs: {"track":{"encoded":null}}
    await lavalinkPatch(player, guildId, {
      track: { encoded: null },
      paused: true,
      position: 0
    });
  }

  async function softStopPlayback(ctx) {
    const player = ctx?.player;
    if (!player) return;

    try {
      bestEffortClearQueue(player);
    } catch {}

    // Authority: REST stop current track.
    await restStopNow(player, ctx.guildId);

    // Best-effort: also call lib stop (ignored if broken).
    try {
      if (typeof player.stop === "function") await Promise.resolve(player.stop());
    } catch {}
  }

  async function recreatePlayer(ctx) {
    if (!manager) throw new Error("lavalink-not-ready");

    const player = manager.createPlayer({
      guildId: ctx.guildId,
      voiceChannelId: ctx.voiceChannelId,
      textChannelId: ctx.textChannelId,
      selfDeaf: true,
      volume: Number.isFinite(ctx.volume) ? ctx.volume : DEFAULT_VOLUME
    });

    await player.connect();
    await waitForDiscordVoiceReady(ctx.guildId, ctx.voiceChannelId);
    await ensureUnpaused(player, ctx.guildId);

    ctx.player = player;
    return player;
  }

  async function createOrGetSession({
    guildId,
    voiceChannelId,
    textChannelId,
    ownerId,
    defaultMode,
    defaultVolume,
    limits
  }) {
    if (!manager) throw new Error("lavalink-not-ready");
    if (!guildId || !voiceChannelId) throw new Error("missing-session");
    if (!ownerId) throw new Error("missing-owner");

    const key = sessionKey(guildId, voiceChannelId);
    return withSessionLock(key, async () => {
      const existing = ctxBySession.get(key);
      if (existing) {
        if (existing.ownerId && existing.ownerId !== ownerId && existing.mode === "dj") {
          throw new Error("not-owner");
        }
        if (textChannelId) existing.textChannelId = textChannelId;
        if (limits) existing.limits = normalizeLimits(limits);
        existing.lastActive = Date.now();

        clearStopping(existing);

        try {
          const p = existing.player;
          const looksDead = !p || typeof p.play !== "function" || typeof p.queue?.add !== "function";
          if (looksDead) await recreatePlayer(existing);
        } catch {
          await recreatePlayer(existing);
        }

        return existing;
      }

      const player = manager.createPlayer({
        guildId,
        voiceChannelId,
        textChannelId,
        selfDeaf: true,
        volume: Number.isFinite(defaultVolume) ? Math.min(150, Math.max(0, Math.trunc(defaultVolume))) : DEFAULT_VOLUME
      });

      await player.connect();
      await waitForDiscordVoiceReady(guildId, voiceChannelId);
      await ensureUnpaused(player, guildId);

      const ctx = {
        player,
        guildId,
        voiceChannelId,
        textChannelId,
        ownerId,
        mode: String(defaultMode ?? "open").toLowerCase() === "dj" ? "dj" : "open",
        lastActive: Date.now(),
        volume: Number.isFinite(defaultVolume)
          ? Math.min(150, Math.max(0, Math.trunc(defaultVolume)))
          : DEFAULT_VOLUME,
        limits: normalizeLimits(limits),
        __stopping: false,
        __destroyAt: null,
        __destroyTimer: null
      };

      ctxBySession.set(key, ctx);
      return ctx;
    });
  }

  function getSession(guildId, voiceChannelId) {
    return ctxBySession.get(sessionKey(guildId, voiceChannelId)) ?? null;
  }

  function getAnySessionInGuildForAgent(guildId) {
    for (const ctx of ctxBySession.values()) {
      if (ctx.guildId === guildId) return ctx;
    }
    return null;
  }

  async function search(ctx, query, requester) {
    const identifier = normalizeSearchQuery(query);
    if (!identifier) return { tracks: [] };
    if (typeof ctx?.player?.search !== "function") throw new Error("player-search-missing");
    return ctx.player.search({ query: identifier }, requester);
  }

  async function forceStart(ctx) {
    const player = ctx.player;

    await waitForDiscordVoiceReady(ctx.guildId, ctx.voiceChannelId);
    await ensureUnpaused(player, ctx.guildId);

    await Promise.resolve(player.play());

    await sleep(60);
    await ensureUnpaused(player, ctx.guildId);
  }

  async function enqueueAndPlay(ctx, track) {
    return withCtxLock(ctx, async () => {
      ctx.lastActive = Date.now();
      clearStopping(ctx);

      try {
        const p = ctx.player;
        const looksDead = !p || typeof p.play !== "function" || typeof p.queue?.add !== "function";
        if (looksDead) await recreatePlayer(ctx);
      } catch {
        await recreatePlayer(ctx);
      }

      const player = ctx.player;
      const limits = normalizeLimits(ctx.limits);
      enforceTrackLimits(player, track, limits);

      const hadCurrent = Boolean(getCurrent(player));
      const hadUpcoming = getQueueTracks(player).length > 0;
      const hadPlaying = Boolean(player.playing);

      await player.queue.add(track);

      const wasIdle = !(hadCurrent || hadUpcoming || hadPlaying);
      if (!wasIdle) return { action: "queued" };

      await forceStart(ctx);
      return { action: "playing" };
    });
  }

  function skip(ctx, actorUserId, requireOwnerMode = false) {
    return withCtxLock(ctx, async () => {
      if (requireOwnerMode) assertOwner(ctx, actorUserId);
      ctx.lastActive = Date.now();

      if (ctx.__stopping) {
        return { ok: true, action: "stopping", disconnectInMs: stoppingRemainingMs(ctx) };
      }

      const player = ctx.player;
      const current = getCurrent(player);
      const upcoming = getQueueTracks(player);

      if (!current && upcoming.length === 0) return { ok: true, action: "nothing-to-skip" };

      // If there is another track, try normal skip.
      if (upcoming.length > 0 && typeof player.skip === "function") {
        try {
          await Promise.resolve(player.skip());
        } catch {}
        return { ok: true, action: "skipped" };
      }

      // End of queue: hard stop current track (REST), then grace timer.
      await softStopPlayback(ctx);
      markStopping(ctx, STOP_GRACE_MS);
      return { ok: true, action: "stopped", disconnectInMs: STOP_GRACE_MS };
    });
  }

  function pause(ctx, actorUserId, state, requireOwnerMode = false) {
    return withCtxLock(ctx, async () => {
      if (requireOwnerMode) assertOwner(ctx, actorUserId);
      ctx.lastActive = Date.now();

      if (ctx.__stopping) {
        return { ok: true, action: "stopping", disconnectInMs: stoppingRemainingMs(ctx) };
      }

      const player = ctx.player;
      const current = getCurrent(player);
      const queued = getQueueTracks(player).length;

      if (state === true) {
        if (!current && !player.playing) return { ok: true, action: "nothing-playing" };
        await ensurePaused(player, ctx.guildId);
        return { ok: true, action: "paused" };
      }

      if (!current && !player.playing) {
        if (queued > 0) {
          await forceStart(ctx);
          return { ok: true, action: "resumed" };
        }
        return { ok: true, action: "nothing-playing" };
      }

      await forceStart(ctx);
      return { ok: true, action: "resumed" };
    });
  }

  function destroySession(guildId, voiceChannelId) {
    const key = sessionKey(guildId, voiceChannelId);
    const ctx = ctxBySession.get(key);
    if (!ctx) return;

    clearStopping(ctx);

    try {
      if (typeof ctx.player?.destroy === "function") ctx.player.destroy();
    } catch {}

    ctxBySession.delete(key);
  }

  function stop(ctx, actorUserId, requireOwnerMode = false) {
    return withCtxLock(ctx, async () => {
      if (requireOwnerMode) assertOwner(ctx, actorUserId);
      ctx.lastActive = Date.now();

      if (ctx.__stopping) {
        return { ok: true, action: "stopping", disconnectInMs: stoppingRemainingMs(ctx) };
      }

      await softStopPlayback(ctx);
      markStopping(ctx, STOP_GRACE_MS);
      return { ok: true, action: "stopped", disconnectInMs: STOP_GRACE_MS };
    });
  }

  function destroyAllSessionsInGuild(guildId) {
    const keys = [];
    for (const [k, ctx] of ctxBySession.entries()) {
      if (ctx.guildId === guildId) keys.push(k);
    }
    for (const k of keys) {
      const [g, v] = String(k).split(":");
      if (g && v) destroySession(g, v);
    }
  }

  function queue(ctx) {
    const current = getCurrent(ctx.player);
    const tracks = getQueueTracks(ctx.player).map(serializeTrack);
    return {
      current: serializeTrack(current),
      tracks,
      mode: ctx.mode,
      ownerId: ctx.ownerId ?? null
    };
  }

  function removeFromQueue(ctx, actorUserId, index, requireOwnerMode = false) {
    return withCtxLock(ctx, async () => {
      if (requireOwnerMode) assertOwner(ctx, actorUserId);
      ctx.lastActive = Date.now();
      const ok = removeTrackAt(ctx.player, index);
      if (!ok) throw new Error("bad-index");
      return { ok: true };
    });
  }

  function setMode(ctx, actorUserId, mode) {
    return withCtxLock(ctx, async () => {
      ctx.lastActive = Date.now();
      const m = String(mode ?? "").toLowerCase() === "open" ? "open" : "dj";
      if (m === "dj") ctx.ownerId = actorUserId;
      ctx.mode = m;
      return { ok: true, action: "mode-set", mode: ctx.mode, ownerId: ctx.ownerId ?? null };
    });
  }

  function clampVolume(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.min(150, Math.max(0, Math.trunc(n)));
  }

  function presetFilters(name) {
    const n = String(name || "").toLowerCase();
    if (n === "flat") return { equalizer: [] };
    if (n === "bassboost") {
      return {
        equalizer: [
          { band: 0, gain: 0.35 },
          { band: 1, gain: 0.3 },
          { band: 2, gain: 0.25 },
          { band: 3, gain: 0.2 }
        ]
      };
    }
    if (n === "nightcore") {
      return { timescale: { speed: 1.1, pitch: 1.2, rate: 1.1 } };
    }
    if (n === "vaporwave") {
      return { timescale: { speed: 0.9, pitch: 0.8, rate: 1.0 } };
    }
    if (n === "8d") {
      return { rotation: { rotationHz: 0.2 } };
    }
    return null;
  }

  async function setVolume(ctx, actorUserId, volume, requireOwnerMode = false) {
    return withCtxLock(ctx, async () => {
      if (requireOwnerMode) assertOwner(ctx, actorUserId);
      ctx.lastActive = Date.now();

      const v = clampVolume(volume);
      if (v === null) throw new Error("bad-volume");

      const player = ctx.player;
      let ok = false;
      try {
        if (typeof player?.setVolume === "function") {
          await Promise.resolve(player.setVolume(v));
          ok = true;
        }
      } catch {}

      if (!ok) {
        const patched = await lavalinkPatch(player, ctx.guildId, { volume: v });
        if (!patched) throw new Error("bad-volume");
      }

      ctx.volume = v;
      return { ok: true, action: "volume-set", volume: v };
    });
  }

  async function setPreset(ctx, actorUserId, preset, requireOwnerMode = false) {
    return withCtxLock(ctx, async () => {
      if (requireOwnerMode) assertOwner(ctx, actorUserId);
      ctx.lastActive = Date.now();
      const filters = presetFilters(preset);
      if (!filters) throw new Error("bad-preset");
      const ok = await lavalinkPatch(ctx.player, ctx.guildId, { filters });
      if (!ok) throw new Error("preset-failed");
      ctx.preset = String(preset);
      return { ok: true, preset: ctx.preset };
    });
  }

  return {
    start,
    createOrGetSession,
    getSession,
    getAnySessionInGuildForAgent,
    search,
    enqueueAndPlay,
    skip,
    pause,
    stop,
    destroySession,
    destroyAllSessionsInGuild,
    setMode,
    setVolume,
    queue,
    removeFromQueue,
    setPreset
  };
}
