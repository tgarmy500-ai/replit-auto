# SMMuggler MM & Escrow Bot

A professional Discord middleman (MM) / escrow bot for peer-to-peer cryptocurrency trades.

## Features

- ✅ Full escrow flow: Buyer → Pay → Seller delivers → Buyer releases
- ✅ Supports **LTC**, **SOL**, **USDT (TRC20)**
- ✅ Auto-generates unique crypto wallet per deal
- ✅ Automatic payment detection (polls every 30s)
- ✅ Private deal channels with permission control
- ✅ 30+ slash commands
- ✅ Price alerts, leaderboard, stats, streaks
- ✅ Admin controls: force cancel/release, blacklist, mod lock
- ✅ Transcript export, deal recovery
- ✅ Status: "Watching smmuggler slots"
- ✅ SQLite database (no external DB needed)

---

## Setup (VPS)

### Requirements
- Node.js 18+ (install via: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs`)
- PM2 for 24/7 uptime: `npm install -g pm2`

### 1. Upload files to your VPS
```bash
scp -r bot/ user@your-vps:/home/user/mm-bot
```

### 2. Install dependencies
```bash
cd /home/user/mm-bot
npm install
```

### 3. Configure the bot
Open `config.js` and set:
```js
OWNER_IDS: ['YOUR_DISCORD_USER_ID']
```
To find your Discord User ID: Enable Developer Mode in Discord settings → right-click your username → "Copy User ID"

### 4. Start with PM2 (24/7)
```bash
pm2 start index.js --name smmuggler-bot --restart-delay=3000
pm2 save
pm2 startup  # follow the printed command to auto-start on reboot
```

### 5. View logs
```bash
pm2 logs smmuggler-bot
```

---

## Bot Invite Link
Add the bot to your server:
```
https://discord.com/oauth2/authorize?client_id=1518636805476581557&permissions=8&scope=bot%20applications.commands
```

---

## Deal Flow

1. User types `/mm` in any channel
2. Selects cryptocurrency (LTC / SOL / USDT)
3. Fills in: other party's User ID, item name, USD amount, their role (buyer/seller)
4. Bot creates a **private channel** for buyer + seller
5. Both parties click **✅ Confirm Deal**
6. Bot generates a unique wallet address and shows payment details
7. Buyer sends payment to the bot wallet
8. Bot auto-detects payment (checks every 30s)
9. Seller delivers the item
10. Buyer clicks **✅ Release Funds**
11. Bot marks deal complete — owner withdraws via `/send_funds`

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `/mm` | Start a new escrow deal |
| `/get_deal_info` | View deal details |
| `/close` | Close deal channel + save transcript |
| `/add` | Add user to deal channel |
| `/remove` | Remove user from deal channel |
| `/transcript` | Export channel transcript |
| `/price [coin]` | Current crypto price |
| `/calc [amount] [coin]` | USD ↔ Crypto converter |
| `/balance [address] [coin]` | Check wallet balance |
| `/check_balance` | Check any address balance |
| `/tx [hash] [coin]` | Transaction details |
| `/list_transactions` | Recent transactions for address |
| `/track-transaction` | Track TX and get notified |
| `/search` | Search address or transaction |
| `/pricealert` | Set a price alert |
| `/alerts` | List your active price alerts |
| `/alertremove [id]` | Remove a price alert |
| `/stats` | Your deal statistics |
| `/leaderboard` | Top traders by volume |
| `/streak` | Your deal streak |
| `/list_coins` | Enabled/disabled currencies |
| `/ping` | Bot health check |
| `/help` | Help dashboard |
| `/force_cancel` ⭐ | Force cancel deal (Owner) |
| `/force_release` ⭐ | Force release funds (Owner) |
| `/send_funds` ⭐ | Withdraw from deal wallet (Owner) |
| `/blacklist user/address` ⭐ | Blacklist management (Owner) |
| `/change-buyer` ⭐ | Change buyer (Owner) |
| `/change-seller` ⭐ | Change seller (Owner) |
| `/mod_lock` ⭐ | Lock deal buttons (Owner) |
| `/mod_unlock` ⭐ | Unlock deal buttons (Owner) |
| `/close_all` ⭐ | Delete all deal channels (Owner) |
| `/admin_rescan` ⭐ | Restart payment monitoring (Owner) |
| `/recover` ⭐ | Recover deleted channel (Owner) |
| `/create_stats_channels` ⭐ | Stats voice channels (Owner) |
| `/change_channel_id` ⭐ | Reassign deal channel (Owner) |
| `/restart` ⭐ | Restart bot (Owner) |

⭐ = Owner only

---

## Withdrawing Funds

When a deal completes, funds are in the bot's generated wallet.
Use `/send_funds` to send them to any address:
```
/send_funds deal_id:DEAL-XXXXXXXX to_address:YOUR_ADDRESS amount:0
```
(amount: 0 = send all confirmed balance)

---

## Notes

- **LTC/SOL withdrawals** work automatically via the bot
- **USDT (TRC20)** needs TronWeb to sign transactions; you may need TRX for gas fees
- Deal wallets and private keys are stored in `data/bot.db` — **keep this file safe and backed up**
- Never share your `bot.db` file publicly — it contains private keys
