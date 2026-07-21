// Décodage zbase32 (Human-Oriented Base-32, Zooko Wilcox) — format utilisé
// par LND pour encoder les signatures de SignMessage/VerifyMessage.
const ALPHABET = 'ybndrfg8ejkmcpqxot1uwisza345h769'

function decode(str) {
  const lookup = {}
  for (let i = 0; i < ALPHABET.length; i++) lookup[ALPHABET[i]] = i

  let bits = 0
  let value = 0
  const bytes = []

  for (const char of str.toLowerCase()) {
    const idx = lookup[char]
    if (idx === undefined) throw new Error('Caractère zbase32 invalide')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 0xff)
    }
  }

  return Buffer.from(bytes)
}

module.exports = { decode }
