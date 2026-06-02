import { getLuminance } from './colorspace.js'

export function computeHistogram(imageData, channel) {
  const counts = new Uint32Array(256)
  const { data } = imageData
  for (let i = 0; i < data.length; i += 4) {
    let v
    if (channel === 'R')      v = data[i]
    else if (channel === 'G') v = data[i + 1]
    else if (channel === 'B') v = data[i + 2]
    else if (channel === 'A') v = data[i + 3]
    else                      v = getLuminance(data[i], data[i + 1], data[i + 2])
    counts[v]++
  }
  return counts
}

export function generateLUT(black, white, gamma) {
  const lut = new Uint8Array(256)
  const range = white - black
  for (let i = 0; i < 256; i++) {
    if (range <= 0) { lut[i] = i <= black ? 0 : 255; continue }
    let v = Math.max(0, Math.min(1, (i - black) / range))
    if (gamma !== 1) v = Math.pow(v, 1 / gamma)
    lut[i] = Math.round(v * 255)
  }
  return lut
}

export function applyLevels(imageData, s) {
  const { width, height, data: src } = imageData
  const out = new Uint8ClampedArray(src)
  const mk = k => generateLUT(s[k].black, s[k].white, s[k].gamma)
  const lutM = mk('master'), lutR = mk('R'), lutG = mk('G'), lutB = mk('B'), lutA = mk('A')
  const compR = new Uint8Array(256).map((_, i) => lutR[lutM[i]])
  const compG = new Uint8Array(256).map((_, i) => lutG[lutM[i]])
  const compB = new Uint8Array(256).map((_, i) => lutB[lutM[i]])
  for (let i = 0; i < src.length; i += 4) {
    out[i]     = compR[src[i]]
    out[i + 1] = compG[src[i + 1]]
    out[i + 2] = compB[src[i + 2]]
    out[i + 3] = lutA[src[i + 3]]
  }
  return new ImageData(out, width, height)
}
