const { HDKey } = require('@scure/bip32')
const { sha256 } = require('@noble/hashes/sha256')
const { ripemd160 } = require('@noble/hashes/ripemd160')
const { bech32, createBase58check } = require('@scure/base')

const b58check = createBase58check(sha256)

function hash160(data) {
  return ripemd160(sha256(data))
}

// zpub/ypub ont des version bytes différents de xpub — on les normalise
function normalizeXpub(extKey) {
  const prefix = extKey.slice(0, 4)
  if (prefix === 'xpub') return extKey
  const decoded = b58check.decode(extKey)
  const xpubVersion = new Uint8Array([0x04, 0x88, 0xB2, 0x1E])
  const result = new Uint8Array(decoded.length)
  result.set(xpubVersion)
  result.set(decoded.slice(4), 4)
  return b58check.encode(result)
}

function getType(extKey) {
  const prefix = extKey.slice(0, 4)
  if (prefix === 'zpub') return 'p2wpkh'       // native segwit bc1q...
  if (prefix === 'ypub') return 'p2sh-p2wpkh'  // wrapped segwit 3...
  return 'p2pkh'                                 // legacy 1...
}

function toAddress(pubkey, type) {
  const h = hash160(pubkey)

  if (type === 'p2wpkh') {
    const words = bech32.toWords(h)
    return bech32.encode('bc', [0, ...words])
  }

  if (type === 'p2sh-p2wpkh') {
    const redeemScript = new Uint8Array([0x00, 0x14, ...h])
    const scriptHash = hash160(redeemScript)
    return b58check.encode(new Uint8Array([0x05, ...scriptHash]))
  }

  return b58check.encode(new Uint8Array([0x00, ...h]))
}

async function mempoolGet(path) {
  const res = await fetch(`https://mempool.space/api${path}`)
  if (!res.ok) throw new Error(`mempool ${res.status}: ${path}`)
  return res.json()
}

async function getXpubUtxos(extKey) {
  const type       = getType(extKey)
  const normalized = normalizeXpub(extKey)
  const root       = HDKey.fromExtendedKey(normalized)

  const allUtxos = []
  const stats    = { funded_txo_count: 0, spent_txo_count: 0, funded_txo_sum: 0 }
  const GAP      = 20

  for (const chain of [0, 1]) {
    const chainKey = root.deriveChild(chain)
    let gap = 0
    let i   = 0

    while (gap < GAP) {
      const child   = chainKey.deriveChild(i)
      const address = toAddress(child.publicKey, type)
      const info    = await mempoolGet(`/address/${address}`)
      const txCount = info.chain_stats.tx_count + info.mempool_stats.tx_count

      stats.funded_txo_count += info.chain_stats.funded_txo_count
      stats.spent_txo_count  += info.chain_stats.spent_txo_count
      stats.funded_txo_sum   += info.chain_stats.funded_txo_sum

      if (txCount === 0) {
        gap++
      } else {
        gap = 0
        const utxos = await mempoolGet(`/address/${address}/utxo`)
        for (const u of utxos) {
          allUtxos.push({ ...u, address, chain, index: i })
        }
      }
      i++
    }
  }

  return { utxos: allUtxos, stats }
}

module.exports = { getXpubUtxos }
