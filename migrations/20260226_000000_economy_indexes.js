// migrations/20260226_000000_economy_indexes.js
// HA-17: Add missing compound indexes for high-frequency economy queries

export default {
  version: '20260226_000000',
  description: 'HA-17: Add compound indexes for economy performance',

  async up(client) {
    // user_daily_quests — fast per-user quest lookup (currently only day-indexed)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_quests_user
      ON user_daily_quests(user_id, day DESC);
    `);

    // transaction_log — fast history per sender and receiver
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_from_time
      ON transaction_log(from_user, timestamp DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_to_time
      ON transaction_log(to_user, timestamp DESC);
    `);

    // user_inventory — already has UNIQUE(user_id, item_id) but no plain index
    // Add explicit index for item lookup without full table scan
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_user_item
      ON user_inventory(user_id, item_id);
    `);

    // user_streaks — fast lookup for daily streak checks
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_streaks_daily
      ON user_streaks(last_daily DESC NULLS LAST);
    `);

    // user_wallets — additional compound for total_earned leaderboard
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallets_earned
      ON user_wallets(total_earned DESC);
    `);
  },

  async down(_client) {
    // Level 1: no rollback
  }
};
