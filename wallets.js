const crypto = require('crypto');

function generateId(prefix = 'DEAL') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = prefix + '-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const litecoinNetwork = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: { public: 0x019da462, private: 0x019d9cfe },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

async function generateLTCWallet() {
  try {
    const bitcoin = require('bitcoinjs-lib');
    const { ECPairFactory } = require('ecpair');
    const ecc = require('tiny-secp256k1');
    const ECPair = ECPairFactory(ecc);
    const keyPair = ECPair.makeRandom({ network: litecoinNetwork });
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: litecoinNetwork,
    });
    return {
      address,
      privateKey: keyPair.toWIF(),
      mnemonic: null,
    };
  } catch (e) {
    console.error('LTC wallet generation error:', e.message);
    throw new Error('Failed to generate LTC wallet: ' + e.message);
  }
}

async function generateSOLWallet() {
  const { Keypair } = require('@solana/web3.js');
  const bs58 = require('bs58');
  const kp = Keypair.generate();
  return {
    address: kp.publicKey.toBase58(),
    privateKey: bs58.encode(Buffer.from(kp.secretKey)),
    mnemonic: null,
  };
}

async function generateUSDTWallet() {
  const TronWeb = require('tronweb');
  const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
  const account = await tronWeb.createAccount();
  return {
    address: account.address.base58,
    privateKey: account.privateKey,
    mnemonic: null,
  };
}

async function generateWallet(currency) {
  switch (currency.toUpperCase()) {
    case 'LTC': return generateLTCWallet();
    case 'SOL': return generateSOLWallet();
    case 'USDT': return generateUSDTWallet();
    default: throw new Error(`Unsupported currency: ${currency}`);
  }
}

async function checkLTCBalance(address) {
  const axios = require('axios');
  try {
    const res = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`, { timeout: 10000 });
    const balanceLTC = res.data.balance / 1e8;
    const unconfirmedLTC = res.data.unconfirmed_balance / 1e8;
    return { confirmed: balanceLTC, unconfirmed: unconfirmedLTC, total: balanceLTC + unconfirmedLTC };
  } catch {
    try {
      const res2 = await axios.get(`https://sochain.com/api/v2/get_address_balance/LTC/${address}`, { timeout: 10000 });
      const bal = parseFloat(res2.data.data?.confirmed_balance || 0);
      return { confirmed: bal, unconfirmed: 0, total: bal };
    } catch {
      return { confirmed: 0, unconfirmed: 0, total: 0 };
    }
  }
}

async function checkSOLBalance(address) {
  const { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
  try {
    const conn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const pk = new PublicKey(address);
    const bal = await conn.getBalance(pk);
    return { confirmed: bal / LAMPORTS_PER_SOL, unconfirmed: 0, total: bal / LAMPORTS_PER_SOL };
  } catch {
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
}

async function checkUSDTBalance(address) {
  const axios = require('axios');
  try {
    const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    const res = await axios.get(`https://api.trongrid.io/v1/accounts/${address}`, { timeout: 10000 });
    const trc20 = res.data?.data?.[0]?.trc20 || [];
    const usdt = trc20.find(t => Object.keys(t)[0] === USDT_CONTRACT);
    const balance = usdt ? parseInt(Object.values(usdt)[0]) / 1e6 : 0;
    return { confirmed: balance, unconfirmed: 0, total: balance };
  } catch {
    return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
}

async function getBalance(currency, address) {
  switch (currency.toUpperCase()) {
    case 'LTC': return checkLTCBalance(address);
    case 'SOL': return checkSOLBalance(address);
    case 'USDT': return checkUSDTBalance(address);
    default: return { confirmed: 0, unconfirmed: 0, total: 0 };
  }
}

async function getLTCTransactions(address) {
  const axios = require('axios');
  try {
    const res = await axios.get(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?limit=5`, { timeout: 10000 });
    return (res.data.txs || []).map(tx => ({
      hash: tx.hash,
      amount: (tx.outputs?.filter(o => o.addresses?.includes(address))?.reduce((a, b) => a + b.value, 0) || 0) / 1e8,
      confirmations: tx.confirmations || 0,
      time: tx.confirmed || tx.received,
    }));
  } catch { return []; }
}

async function getSOLTransactions(address) {
  const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');
  try {
    const conn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const sigs = await conn.getSignaturesForAddress(new PublicKey(address), { limit: 5 });
    return sigs.map(s => ({
      hash: s.signature,
      amount: 0,
      confirmations: s.confirmationStatus === 'finalized' ? 999 : 1,
      time: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
    }));
  } catch { return []; }
}

async function getUSDTTransactions(address) {
  const axios = require('axios');
  try {
    const res = await axios.get(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=5&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`, { timeout: 10000 });
    return (res.data?.data || []).map(tx => ({
      hash: tx.transaction_id,
      amount: parseInt(tx.value || 0) / 1e6,
      confirmations: 999,
      time: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : null,
    }));
  } catch { return []; }
}

async function getTransactions(currency, address) {
  switch (currency.toUpperCase()) {
    case 'LTC': return getLTCTransactions(address);
    case 'SOL': return getSOLTransactions(address);
    case 'USDT': return getUSDTTransactions(address);
    default: return [];
  }
}

async function getCryptoPrice(currency) {
  const axios = require('axios');
  const ids = { LTC: 'litecoin', SOL: 'solana', USDT: 'tether' };
  try {
    const id = ids[currency.toUpperCase()];
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`, { timeout: 8000 });
    const data = res.data[id];
    return { price: data.usd, change24h: data.usd_24h_change };
  } catch {
    try {
      const symbols = { LTC: 'LTCUSDT', SOL: 'SOLUSDT', USDT: 'USDTBUSD' };
      const res = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbols[currency.toUpperCase()]}`, { timeout: 8000 });
      return { price: parseFloat(res.data.lastPrice), change24h: parseFloat(res.data.priceChangePercent) };
    } catch { return { price: 0, change24h: 0 }; }
  }
}

async function usdToCrypto(usd, currency) {
  const { price } = await getCryptoPrice(currency);
  if (!price) return null;
  return usd / price;
}

async function sendLTC(fromKey, toAddress, amountLTC) {
  return { success: false, error: 'Manual withdrawal required. Use private key in /data/bot.db wallets table.' };
}

async function sendSOL(fromKey, toAddress, amountSOL) {
  const { Connection, Keypair, PublicKey, Transaction, SystemProgram, clusterApiUrl, LAMPORTS_PER_SOL, sendAndConfirmTransaction } = require('@solana/web3.js');
  const bs58 = require('bs58');
  try {
    const conn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    const senderKP = Keypair.fromSecretKey(bs58.decode(fromKey));
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: senderKP.publicKey, toPubkey: new PublicKey(toAddress), lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL) })
    );
    const sig = await sendAndConfirmTransaction(conn, tx, [senderKP]);
    return { success: true, txHash: sig };
  } catch (e) { return { success: false, error: e.message }; }
}

async function sendUSDT(fromKey, toAddress, amount) {
  const TronWeb = require('tronweb');
  try {
    const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io', privateKey: fromKey });
    const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const res = await contract.transfer(toAddress, Math.floor(amount * 1e6)).send();
    return { success: true, txHash: res };
  } catch (e) { return { success: false, error: e.message }; }
}

async function sendFunds(currency, privateKey, toAddress, amount) {
  switch (currency.toUpperCase()) {
    case 'LTC': return sendLTC(privateKey, toAddress, amount);
    case 'SOL': return sendSOL(privateKey, toAddress, amount);
    case 'USDT': return sendUSDT(privateKey, toAddress, amount);
    default: return { success: false, error: 'Unsupported currency' };
  }
}

async function getTxDetails(currency, txHash) {
  const axios = require('axios');
  switch (currency.toUpperCase()) {
    case 'LTC': {
      try {
        const res = await axios.get(`https://api.blockcypher.com/v1/ltc/main/txs/${txHash}`, { timeout: 10000 });
        return { hash: res.data.hash, confirmations: res.data.confirmations, amount: (res.data.total || 0) / 1e8, fee: (res.data.fees || 0) / 1e8, time: res.data.confirmed };
      } catch { return null; }
    }
    case 'SOL': {
      try {
        const res = await axios.post('https://api.mainnet-beta.solana.com', { jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [txHash, { encoding: 'json', maxSupportedTransactionVersion: 0 }] }, { timeout: 10000 });
        const tx = res.data.result;
        if (!tx) return null;
        return { hash: txHash, confirmations: 999, amount: Math.abs((tx.meta?.preBalances?.[0] || 0) - (tx.meta?.postBalances?.[0] || 0)) / 1e9, fee: (tx.meta?.fee || 0) / 1e9, time: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null };
      } catch { return null; }
    }
    case 'USDT': {
      try {
        const res = await axios.get(`https://api.trongrid.io/v1/transactions/${txHash}`, { timeout: 10000 });
        const tx = res.data?.data?.[0];
        if (!tx) return null;
        return { hash: txHash, confirmations: 999, amount: 0, fee: 0, time: tx.block_timestamp ? new Date(tx.block_timestamp).toISOString() : null };
      } catch { return null; }
    }
    default: return null;
  }
}

module.exports = { generateId, generateWallet, getBalance, getTransactions, getCryptoPrice, usdToCrypto, sendFunds, getTxDetails };
