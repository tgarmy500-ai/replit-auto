const defaults = { LTC: '🥈', SOL: '☀️', USDT: '💲' };
const cache = { ...defaults };

module.exports = {
  set(currency, emojiObj) { cache[currency.toUpperCase()] = emojiObj; },
  get(currency) { return cache[currency.toUpperCase()] || defaults[currency.toUpperCase()]; },
};
