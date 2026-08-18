import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const require = createRequire(import.meta.url)
const occtimportjs = require('occt-import-js')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const stepPath = join(root, 'bottle-of-wine-3.snapshot.1', 'LIGHT 750.step')
const outPath = join(root, 'public', 'models', 'bottle.glb')

globalThis.FileReader = class FileReader {
  constructor() {
    this.result = null
    this.onloadend = null
  }
  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((buf) => {
        this.result = buf
        this.onloadend?.()
      })
      .catch((err) => {
        throw err
      })
  }
}

function geometryFromMesh(part) {
  const geo = new BufferGeometry()
  const pos = part.attributes?.position?.array
  const nrm = part.attributes?.normal?.array
  const idx = part.index?.array
  if (!pos || !idx) return null
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  if (nrm) geo.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3))
  else geo.computeVertexNormals()
  geo.setIndex(Array.from(idx))
  geo.computeBoundingBox()
  return geo
}

async function main() {
  const occt = await occtimportjs()
  const bytes = new Uint8Array(await readFile(stepPath))
  const result = occt.ReadStepFile(bytes, {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.0006,
    angularDeflection: 0.12,
  })
  if (!result?.success || !result.meshes?.length) {
    throw new Error(`STEP import failed: ${JSON.stringify(result)?.slice(0, 400)}`)
  }

  const group = new Group()
  group.name = 'LIGHT_750'
  for (const part of result.meshes) {
    const geo = geometryFromMesh(part)
    if (!geo) continue
    const mesh = new Mesh(geo, new MeshStandardMaterial({ color: '#1b3a28', metalness: 0, roughness: 0.15 }))
    mesh.name = part.name || 'shell'
    group.add(mesh)
  }

  group.updateMatrixWorld(true)
  group.scale.setScalar(0.001)
  group.updateMatrixWorld(true)

  const scene = new Scene()
  scene.add(group)

  const exporter = new GLTFExporter()
  const glb = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true })
  })
  const buffer = glb instanceof ArrayBuffer ? glb : await glb.arrayBuffer()
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, Buffer.from(buffer))
  console.log('wrote', outPath, 'meshes', group.children.length, `${(buffer.byteLength / 1024).toFixed(0)} ko`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
