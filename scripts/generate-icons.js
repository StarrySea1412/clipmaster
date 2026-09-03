import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const ROOT = path.resolve(__dirname, '..')
const SVG_PATH = path.join(ROOT, 'resources', 'icon.svg')
const TARGETS = [
  { out: path.join(ROOT, 'resources', 'icon.png'), size: 512 },
  { out: path.join(ROOT, 'build', 'icon.png'), size: 512 }
]

async function main() {
  const svg = fs.readFileSync(SVG_PATH)

  for (const target of TARGETS) {
    const dir = path.dirname(target.out)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    await sharp(svg).resize(target.size, target.size).png().toFile(target.out)
    console.log(`Generated ${target.out} (${target.size}x${target.size})`)
  }
}

main().catch((err) => {
  console.error('Icon generation failed:', err)
  process.exit(1)
})
