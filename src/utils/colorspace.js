export const CHANNEL_LABELS = {
  R: 'Красный', G: 'Зелёный', B: 'Синий', A: 'Альфа', Grey: 'Серый',
}

export const CHANNEL_SHORT = {
  R: 'R', G: 'G', B: 'B', A: 'A', Grey: 'Y',
}

export function getLuminance(r, g, b) {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b)
}

export function rgbToLab(r, g, b) {
  const toLinear = c => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b)
  let X = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047
  let Y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000
  let Z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  const fx = f(X), fy = f(Y), fz = f(Z)
  return {
    L: Math.round((116 * fy - 16) * 10) / 10,
    a: Math.round(500 * (fx - fy) * 10) / 10,
    b: Math.round(200 * (fy - fz) * 10) / 10,
  }
}

export function scaleImageData(src, targetW, targetH) {
  const out = new ImageData(targetW, targetH)
  const xRatio = src.width / targetW
  const yRatio = src.height / targetH
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), src.width - 1)
      const srcY = Math.min(Math.floor(y * yRatio), src.height - 1)
      const si = (srcY * src.width + srcX) * 4
      const di = (y * targetW + x) * 4
      out.data[di]     = src.data[si]
      out.data[di + 1] = src.data[si + 1]
      out.data[di + 2] = src.data[si + 2]
      out.data[di + 3] = src.data[si + 3]
    }
  }
  return out
}

export function createChannelThumbnail(imageData, channelId) {
  const { width: w, height: h, data: src } = imageData
  const out = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < src.length; i += 4) {
    let r = 0, g = 0, b = 0
    if (channelId === 'R')         { r = src[i] }
    else if (channelId === 'G')    { g = src[i + 1] }
    else if (channelId === 'B')    { b = src[i + 2] }
    else if (channelId === 'A')    { r = g = b = src[i + 3] }
    else if (channelId === 'Grey') { r = g = b = src[i] }
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255
  }
  return new ImageData(out, w, h)
}

export function applyChannelToggle(imageData, enabledSet) {
  const { width, height, data: src } = imageData
  const out = new Uint8ClampedArray(src)
  const hasGrey = enabledSet.has('Grey')
  const hasR = enabledSet.has('R')
  const hasG = enabledSet.has('G')
  const hasB = enabledSet.has('B')
  const hasA = enabledSet.has('A')
  const hasAnyColor = hasGrey || hasR || hasG || hasB
  for (let i = 0; i < src.length; i += 4) {
    if (!hasAnyColor) {
      out[i] = out[i + 1] = out[i + 2] = 0
    } else if (!hasGrey) {
      if (!hasR) out[i] = 0
      if (!hasG) out[i + 1] = 0
      if (!hasB) out[i + 2] = 0
    }
    if (!hasA) out[i + 3] = 255
  }
  return new ImageData(out, width, height)
}
