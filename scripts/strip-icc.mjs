import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const SKIP = new Set(['node_modules', '.expo', '.next', '.git'])

async function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full)
    else if (EXTS.has(path.extname(e.name).toLowerCase())) await strip(full)
  }
}

async function strip(file) {
  const buf = await sharp(file).withMetadata({ icc: undefined }).toBuffer()
  fs.writeFileSync(file, buf)
  console.log('stripped:', file)
}

await walk(process.cwd())
