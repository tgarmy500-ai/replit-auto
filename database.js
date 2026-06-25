const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'bot.db');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id TEXT UNIQUE NOT NULL,
    channel_id TEXT,
    guild_id TEXT NOT NULL,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount_usd REAL,
    amount_crypto REAL,
    item_name TEXT,
    wallet_address TEXT,
    wallet_private_key TEXT,
    status TEXT DEFAULT 'pending_confirm',
    buyer_confirmed INTEGER DEFAULT 0,
    seller_confirmed INTEGER DEFAULT 0,
    payment_received INTEGER DEFAULT 0,
    payment_tx TEXT,
    funds_released INTEGER DEFAULT 0,
    buttons_locked INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    closed_at INTEGER,
    payment_message_id TEXT,
    confirm_message_id TEXT,
    swept INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    address TEXT NOT NULL,
    private_key TEXT NOT NULL,
    mnemonic TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    total_deals INTEGER DEFAULT 0,
    completed_deals INTEGER DEFAULT 0,
    total_volume_usd REAL DEFAULT 0,
    deals_as_buyer INTEGER DEFAULT 0,
    deals_as_seller INTEGER DEFAULT 0,
    last_deal_at INTEGER,
    streak INTEGER DEFAULT 0,
    last_streak_date TEXT
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    reason TEXT,
    added_by TEXT,
    added_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(type, value)
  );

  CREATE TABLE IF NOT EXISTS price_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    target_price REAL NOT NULL,
    direction TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    triggered INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id TEXT,
    tx_hash TEXT UNIQUE,
    currency TEXT,
    amount REAL,
    from_address TEXT,
    to_address TEXT,
    confirmations INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id TEXT NOT NULL,
    channel_name TEXT,
    content TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS tracked_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    currency TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

module.exports = {
  db,

  createDeal(data) {
    const stmt = db.prepare(`
      INSERT INTO deals (deal_id, guild_id, buyer_id, seller_id, currency, item_name)
      VALUES (@deal_id, @guild_id, @buyer_id, @seller_id, @currency, @item_name)
    `);
    stmt.run(data);
    return this.getDeal(data.deal_id);
  },

  getDeal(deal_id) {
    return db.prepare('SELECT * FROM deals WHERE deal_id = ?').get(deal_id);
  },

  getDealByChannel(channel_id) {
    return db.prepare('SELECT * FROM deals WHERE channel_id = ?').get(channel_id);
  },

  updateDeal(deal_id, data) {
    const keys = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    const stmt = db.prepare(`UPDATE deals SET ${keys}, updated_at = unixepoch() WHERE deal_id = @deal_id`);
    stmt.run({ ...data, deal_id });
  },

  getAllActiveDeals() {
    return db.prepare("SELECT * FROM deals WHERE status NOT IN ('completed', 'cancelled', 'refunded')").all();
  },

  saveWallet(data) {
    db.prepare(`INSERT INTO wallets (deal_id, currency, address, private_key, mnemonic) VALUES (?,?,?,?,?)`)
      .run(data.deal_id, data.currency, data.address, data.private_key, data.mnemonic || null);
  },

  getWallet(deal_id) {
    return db.prepare('SELECT * FROM wallets WHERE deal_id = ?').get(deal_id);
  },

  getUserStats(user_id) {
    let stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(user_id);
    if (!stats) {
      db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(user_id);
      stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(user_id);
    }
    return stats;
  },

  updateUserStats(user_id, data) {
    const keys = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE user_stats SET ${keys} WHERE user_id = @user_id`).run({ ...data, user_id });
  },

  getLeaderboard(limit = 10) {
    return db.prepare('SELECT * FROM user_stats ORDER BY total_volume_usd DESC LIMIT ?').all(limit);
  },

  isBlacklisted(type, value) {
    return !!db.prepare('SELECT * FROM blacklist WHERE type = ? AND value = ?').get(type, value);
  },

  addBlacklist(type, value, reason, added_by) {
    try {
      db.prepare('INSERT INTO blacklist (type, value, reason, added_by) VALUES (?,?,?,?)').run(type, value, reason, added_by);
      return true;
    } catch { return false; }
  },

  removeBlacklist(type, value) {
    const res = db.prepare('DELETE FROM blacklist WHERE type = ? AND value = ?').run(type, value);
    return res.changes > 0;
  },

  getBlacklist() {
    return db.prepare('SELECT * FROM blacklist ORDER BY added_at DESC').all();
  },

  addPriceAlert(data) {
    const stmt = db.prepare('INSERT INTO price_alerts (user_id, currency, target_price, direction, channel_id) VALUES (?,?,?,?,?)');
    const res = stmt.run(data.user_id, data.currency, data.target_price, data.direction, data.channel_id);
    return res.lastInsertRowid;
  },

  getPriceAlerts(user_id) {
    return db.prepare('SELECT * FROM price_alerts WHERE user_id = ? AND triggered = 0').all(user_id);
  },

  getAllActivePriceAlerts() {
    return db.prepare('SELECT * FROM price_alerts WHERE triggered = 0').all();
  },

  removePriceAlert(id, user_id) {
    const res = db.prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?').run(id, user_id);
    return res.changes > 0;
  },

  triggerPriceAlert(id) {
    db.prepare('UPDATE price_alerts SET triggered = 1 WHERE id = ?').run(id);
  },

  saveTransaction(data) {
    try {
      db.prepare('INSERT OR IGNORE INTO transactions (deal_id, tx_hash, currency, amount, from_address, to_address, status) VALUES (?,?,?,?,?,?,?)')
        .run(data.deal_id, data.tx_hash, data.currency, data.amount, data.from_address, data.to_address, data.status || 'confirmed');
    } catch {}
  },

  getTransactions(deal_id) {
    return db.prepare('SELECT * FROM transactions WHERE deal_id = ?').all(deal_id);
  },

  saveTranscript(deal_id, channel_name, content) {
    db.prepare('INSERT INTO transcripts (deal_id, channel_name, content) VALUES (?,?,?)').run(deal_id, channel_name, content);
  },

  addTrackedTx(user_id, tx_hash, currency, channel_id) {
    db.prepare('INSERT INTO tracked_transactions (user_id, tx_hash, currency, channel_id) VALUES (?,?,?,?)').run(user_id, tx_hash, currency, channel_id);
  },

  getTrackedTxs() {
    return db.prepare('SELECT * FROM tracked_transactions').all();
  },

  removeTrackedTx(id) {
    db.prepare('DELETE FROM tracked_transactions WHERE id = ?').run(id);
  },

  getDealsByUser(user_id) {
    return db.prepare('SELECT * FROM deals WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC').all(user_id, user_id);
  },

  getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  setSetting(key, value) {
    db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, unixepoch()) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()').run(key, value);
  },

  getWithdrawWallets() {
    return {
      LTC:  this.getSetting('withdraw_wallet_LTC')  || null,
      SOL:  this.getSetting('withdraw_wallet_SOL')  || null,
      USDT: this.getSetting('withdraw_wallet_USDT') || null,
    };
  },

  setWithdrawWallet(currency, address) {
    this.setSetting(`withdraw_wallet_${currency.toUpperCase()}`, address);
  },

  getAllCompletedUnswept(currency = null) {
    if (currency) {
      return db.prepare("SELECT * FROM deals WHERE status = 'completed' AND funds_released = 1 AND (swept IS NULL OR swept = 0) AND currency = ?").all(currency.toUpperCase());
    }
    return db.prepare("SELECT * FROM deals WHERE status = 'completed' AND funds_released = 1 AND (swept IS NULL OR swept = 0)").all();
  },

  markDealSwept(deal_id) {
    db.prepare("UPDATE deals SET swept = 1, updated_at = unixepoch() WHERE deal_id = ?").run(deal_id);
  },
};
