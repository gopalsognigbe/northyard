import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Scene,
  Vector2,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'public', 'models', 'bottle.glb')

globalThis.FileReader = class FileReader {
  constructor() {
    this.result = null
    this.onloadend = null
  }
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf
      this.onloadend?.()
    })
  }
}

function bordeauxProfile() {
  /* Cépage Bordeaux 75 cl, mm → m. */
  const mm = (x, y) => new Vector2(x / 1000, y / 1000)
  return [
    mm(0, 0),
    mm(18, 1),
    mm(34, 4),
    mm(38.1, 14),
    mm(38.1, 178),
    mm(36.2, 198),
    mm(28, 218),
    mm(16.4, 236),
    mm(14.6, 268),
    mm(14.4, 286),
    mm(15.6, 292),
    mm(14.2, 298),
    mm(13.4, 301),
  ]
}

async function main() {
  const body = new LatheGeometry(bordeauxProfile(), 64)
  body.computeVertexNormals()
  const glass = new Mesh(
    body,
    new MeshPhysicalMaterial({
      color: '#10281c',
      roughness: 0.08,
      metalness: 0,
      transmission: 0.72,
      thickness: 0.006,
      ior: 1.52,
      attenuationColor: '#0a1f14',
      attenuationDistance: 0.08,
    }),
  )
  glass.name = 'glass'

  const cork = new Mesh(
    new CylinderGeometry(0.0124, 0.0128, 0.038, 24),
    new MeshStandardMaterial({ color: '#c4a574', roughness: 0.82 }),
  )
  cork.name = 'cork'
  cork.position.y = 0.301 + 0.012

  const group = new Group()
  group.name = 'bordeaux_75cl'
  group.add(glass, cork)

  const scene = new Scene()
  scene.add(group)
  const exporter = new GLTFExporter()
  const glb = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true })
  })
  const buffer = glb instanceof ArrayBuffer ? glb : await glb.arrayBuffer()
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, Buffer.from(buffer))
  console.log('wrote', outPath, `${(buffer.byteLength / 1024).toFixed(0)} ko`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
