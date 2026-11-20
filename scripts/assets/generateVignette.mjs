#!/usr/bin/env node
// Writes src/assets/images/app/vignette.png: a soft dark vignette (transparent in the middle, darker towards the corners and the
// edges) that is stretched over the 3D scene. Pure alpha, no colour: it only darkens.
// Usage: node scripts/assets/generateVignette.mjs <outputFile>
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { deflateSync } from 'node:zlib'

const outputFile = process.argv[2] ?? 'src/assets/images/app/vignette.png'
const WIDTH = 128
const HEIGHT = 256
const STRENGTH = 0.55
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }

  return value >>> 0
})
const crc32 = buffer => {
  let crc = 0xffffffff

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const checksum = Buffer.alloc(4)

  length.writeUInt32BE(data.length, 0)

  checksum.writeUInt32BE(crc32(body), 0)

  return Buffer.concat([length, body, checksum])
}
const smooth = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))

  return t * t * (3 - 2 * t)
}
const rows = []

for (let row = 0; row < HEIGHT; row += 1) {
  const line = Buffer.alloc(1 + WIDTH * 4)

  for (let column = 0; column < WIDTH; column += 1) {
    // Distance from the middle, 0 at the centre and 1 at the middle of an edge, 1.41 in a corner.
    const distance = Math.hypot(((column + 0.5) / WIDTH - 0.5) * 2, ((row + 0.5) / HEIGHT - 0.5) * 2)
    const alpha = Math.round(255 * STRENGTH * smooth(0.55, 1.35, distance))

    line.set([0, 0, 0, alpha], 1 + column * 4)
  }

  rows.push(line)
}

const header = Buffer.alloc(13)

header.writeUInt32BE(WIDTH, 0)

header.writeUInt32BE(HEIGHT, 4)

header.set([8, 6, 0, 0, 0], 8)

mkdirSync(dirname(outputFile), { recursive: true })

writeFileSync(
  outputFile,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]),
)

console.log(`${outputFile}: ${WIDTH}x${HEIGHT}`)
