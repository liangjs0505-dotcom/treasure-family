const WIDTHS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

const START_B = 104
const START_C = 105
const CODE_C = 99

function modules(widths: string) {
  let bits = ''
  for (let i = 0; i < widths.length; i++) {
    bits += (i % 2 === 0 ? '1' : '0').repeat(Number(widths[i]))
  }
  return bits
}

function encode(text: string) {
  const values: number[] = []
  if (/^\d+$/.test(text) && text.length >= 2) {
    let index = 0
    if (text.length % 2 === 1) {
      values.push(START_B, text.charCodeAt(0) - 32, CODE_C)
      index = 1
    } else {
      values.push(START_C)
    }
    for (; index < text.length; index += 2) {
      values.push(Number(text.slice(index, index + 2)))
    }
    return values
  }
  values.push(START_B)
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126) return null
    values.push(code - 32)
  }
  return values
}

export function code128Bars(text: string) {
  if (!text) return ''
  const values = encode(text)
  if (!values) return ''
  let sum = values[0]
  for (let i = 1; i < values.length; i++) sum += values[i] * i
  values.push(sum % 103, 106)
  const quiet = '0'.repeat(10)
  return quiet + values.map((value) => modules(WIDTHS[value])).join('') + quiet
}
