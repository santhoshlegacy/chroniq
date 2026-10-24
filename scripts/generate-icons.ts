import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

function createSolidPng(width: number, height: number, r: number, g: number, b: number, a: number = 255): Buffer {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth: 8
  ihdr.writeUInt8(6, 9) // color type: 6 (RGBA)
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace: none

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type, 'ascii')
    const toCrc = Buffer.concat([typeBuf, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(toCrc), 0)
    return Buffer.concat([len, toCrc, crc])
  }

  // Simplified CRC32 table
  const crcTable: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1)
      else c = c >>> 1
    }
    crcTable[n] = c
  }

  function crc32(buf: Buffer): number {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    }
    return (c ^ 0xffffffff) >>> 0
  }

  // Raw image scanlines
  const rowLen = 1 + width * 4
  const rawData = Buffer.alloc(rowLen * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLen
    rawData[rowStart] = 0 // Filter type: None
    for (let x = 0; x < width; x++) {
      const pxStart = rowStart + 1 + x * 4
      rawData[pxStart] = r
      rawData[pxStart + 1] = g
      rawData[pxStart + 2] = b
      rawData[pxStart + 3] = a
    }
  }

  const compressedData = zlib.deflateSync(rawData)
  const idatChunk = makeChunk('IDAT', compressedData)
  const ihdrChunk = makeChunk('IHDR', ihdr)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const iconsDir = path.resolve(import.meta.dirname, '../public/icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Chroniq Indigo #6366f1 -> RGB: (99, 102, 241)
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createSolidPng(192, 192, 99, 102, 241))
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createSolidPng(512, 512, 99, 102, 241))
fs.writeFileSync(path.join(iconsDir, 'badge-72.png'), createSolidPng(72, 72, 139, 92, 246))

console.log('Icons generated successfully!')
