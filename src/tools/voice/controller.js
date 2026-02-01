import { loadGuildData, saveGuildData } from "../../utils/storage.js";

function ensureVoice(data) {
  if (!data.voice) {
    data.voice = { lobbies: {}, tempChannels: {} };
  }
  return data.voice;
}
export const getStatus = async guildId => {
  const data = loadGuildData(guildId);

  if (!data.voice) {
    return {
      lobbies: {},
      tempChannels: {}
    };
  }

  return data.voice;
};

export const addLobby = async (guildId, lobbyChannelId, categoryId) => {
  const data = loadGuildData(guildId);
  const voice = ensureVoice(data);

  if (voice.lobbies[lobbyChannelId]?.enabled === true) {
    return false;
  }

  voice.lobbies[lobbyChannelId] = {
    categoryId,
    enabled: true,
    nameTemplate: "🔊 {user}"
  };

  saveGuildData(guildId, data);
  return true;
};

export const removeLobby = async (guildId, lobbyChannelId) => {
  const data = loadGuildData(guildId);
  const voice = ensureVoice(data);

  const lobby = voice.lobbies[lobbyChannelId];
  if (!lobby || lobby.enabled === false) {
    return false;
  }

  lobby.enabled = false;

  for (const [id, temp] of Object.entries(voice.tempChannels)) {
    if (temp.lobbyId === lobbyChannelId) {
      delete voice.tempChannels[id];
    }
  }

  saveGuildData(guildId, data);
  return true;
};

export const resetVoice = async guildId => {
  const data = loadGuildData(guildId);
  data.voice = { lobbies: {}, tempChannels: {} };
  saveGuildData(guildId, data);
};
