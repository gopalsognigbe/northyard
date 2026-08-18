import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function slug(value) {
  return String(value || 'plan')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'plan'
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { cwd: root })
    let err = ''
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(err.slice(-800) || `ffmpeg ${code}`))
    })
  })
}

export function studioExportPlugin() {
  return {
    name: 'studio-export',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__studio/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const name = slug(url.searchParams.get('name'))
        const dir = join(root, 'public', 'studio', name)
        const out = join(root, 'public', 'film', `${name}.mp4`)

        try {
          if (req.method === 'POST' && url.pathname === '/__studio/begin') {
            await rm(dir, { recursive: true, force: true })
            await mkdir(dir, { recursive: true })
            await mkdir(dirname(out), { recursive: true })
            return json(res, 200, { ok: true, name })
          }

          if (req.method === 'POST' && url.pathname === '/__studio/frame') {
            const i = Number(url.searchParams.get('i') || 0)
            const body = await readBody(req)
            const file = join(dir, `${String(i).padStart(4, '0')}.jpg`)
            await mkdir(dir, { recursive: true })
            await writeFile(file, body)
            return json(res, 200, { ok: true, i })
          }

          if (req.method === 'POST' && url.pathname === '/__studio/end') {
            const fps = Number(url.searchParams.get('fps') || 24)
            await mkdir(dirname(out), { recursive: true })
            await runFfmpeg([
              '-y',
              '-start_number',
              '0',
              '-framerate',
              String(fps),
              '-i',
              join(dir, '%04d.jpg'),
              '-an',
              '-c:v',
              'libx264',
              '-preset',
              'medium',
              '-crf',
              '17',
              '-pix_fmt',
              'yuv420p',
              '-x264-params',
              'keyint=1:min-keyint=1:scenecut=0',
              '-movflags',
              '+faststart',
              out,
            ])
            return json(res, 200, { ok: true, path: `/film/${name}.mp4` })
          }
        } catch (error) {
          return json(res, 500, { ok: false, error: String(error.message || error) })
        }

        return next()
      })
    },
  }
}
