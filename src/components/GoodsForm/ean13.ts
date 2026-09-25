const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
]
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
]
const R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
]
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function ean13Bars(code: string) {
  const digits = code.split('').map((ch) => Number(ch))
  const parity = PARITY[digits[0]]
  let bits = '101'
  for (let i = 0; i < 6; i++) {
    bits += (parity[i] === 'L' ? L : G)[digits[i + 1]]
  }
  bits += '01010'
  for (let i = 0; i < 6; i++) {
    bits += R[digits[i + 7]]
  }
  bits += '101'
  return bits
}
