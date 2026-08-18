import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls, TransformControls, useProgress } from '@react-three/drei'
import { Euler, Quaternion, Vector3 } from 'three'
import { BOTTLE_BUILD, LaclauBottle } from '../scene/LaclauBottle.jsx'
import { bakeCuveeTake, bakeShiftTake } from './cuveeTake.js'
import { bakePlan01Take } from './heroTake.js'

const LOCKED_TAKES = new Set(['plan-01'])

const FPS = 30
const MAX_SECONDS = 8
const MAX_FRAMES = FPS * MAX_SECONDS
const CAM_HOME = [0.32, 0.16, 0.52]
const LOOK_HOME = [0, 0.15, 0]
const COMPOSITION_REFS = {
  look: { label: 'Regard caméra', bot: null, note: 'Cible orbit — centre vertical du cadre' },
  center: { label: 'Bouteille centre', bot: [0, 0, 0], note: 'Hero, départ spin/shift' },
  right: { label: 'Cuvée droite', bot: [0.12, 0, 0], note: 'Fin spin.mp4' },
  left: { label: 'Schiste gauche', bot: [-0.12, 0, 0], note: 'Fin shift.mp4' },
}
const _euler = new Euler()
const RADIUS_MIN = 0.2
const RADIUS_MAX = 1.55
const EXPORT_W = 1920
const EXPORT_H = 1080

const _qa = new Quaternion()
const _qb = new Quaternion()
const _qm = new Quaternion()

function yawFromQuat(q) {
  _euler.setFromQuaternion(_qa.fromArray(q), 'YXZ')
  return _euler.y
}

function quatFromYaw(yaw) {
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).toArray()
}

function fmt(n) {
  return Number(n).toFixed(4)
}

function parseCoord(value, fallback) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

function dist3(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.hypot(dx, dy, dz)
}

function lerp1(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp1(a[0], b[0], t), lerp1(a[1], b[1], t), lerp1(a[2], b[2], t)]
}

function slerpQ(a, b, t) {
  _qa.fromArray(a)
  _qb.fromArray(b)
  _qm.slerpQuaternions(_qa, _qb, t)
  return _qm.toArray()
}

function centripetal3(p0, p1, p2, p3, t) {
  const knot = (a, b, prev) => prev + Math.pow(Math.max(dist3(a, b), 1e-6), 0.5)
  const t0 = 0
  const t1 = knot(p0, p1, t0)
  const t2 = knot(p1, p2, t1)
  const t3 = knot(p2, p3, t2)
  const u = t1 + (t2 - t1) * t
  const mix = (a, b, ta, tb, x) => lerp3(a, b, Math.abs(tb - ta) < 1e-8 ? 0 : (x - ta) / (tb - ta))
  const a1 = mix(p0, p1, t0, t1, u)
  const a2 = mix(p1, p2, t1, t2, u)
  const a3 = mix(p2, p3, t2, t3, u)
  const b1 = mix(a1, a2, t0, t2, u)
  const b2 = mix(a2, a3, t1, t3, u)
  return mix(b1, b2, t1, t2, u)
}

function easeEnds(t, shoulder = 0.12) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t < shoulder) {
    const s = t / shoulder
    return shoulder * (s * s * (3 - 2 * s))
  }
  if (t > 1 - shoulder) {
    const s = (t - (1 - shoulder)) / shoulder
    return 1 - shoulder + shoulder * (s * s * (3 - 2 * s))
  }
  return t
}

function atPose(poses, index) {
  return poses[Math.min(poses.length - 1, Math.max(0, index))]
}

function capturePose(camera, bottle, controls) {
  const target = (controls?.target ?? new Vector3(...LOOK_HOME)).clone()
  return {
    cam: camera.position.toArray(),
    target: target.toArray(),
    fov: camera.fov,
    bot: bottle.position.toArray(),
    botQ: bottle.quaternion.toArray(),
  }
}

function segmentTime(poses, u) {
  const n = poses.length
  if (n < 2) return { i: 0, t: 0 }
  const spans = []
  let total = 0
  for (let i = 0; i < n - 1; i += 1) {
    const cam = Math.max(dist3(poses[i].cam, poses[i + 1].cam), 0.04)
    const bot = dist3(poses[i].bot, poses[i + 1].bot)
    const len = cam + bot * 0.25
    spans.push(len)
    total += len
  }
  let remain = u * total
  for (let i = 0; i < spans.length; i += 1) {
    if (remain <= spans[i] || i === spans.length - 1) {
      return { i, t: spans[i] < 1e-8 ? 1 : Math.min(1, remain / spans[i]) }
    }
    remain -= spans[i]
  }
  return { i: n - 2, t: 1 }
}

function sampleSpline(poses, u) {
  const n = poses.length
  if (n === 1) return poses[0]
  if (n === 2) {
    return {
      cam: lerp3(poses[0].cam, poses[1].cam, u),
      target: lerp3(poses[0].target, poses[1].target, u),
      fov: lerp1(poses[0].fov, poses[1].fov, u),
      bot: lerp3(poses[0].bot, poses[1].bot, u),
      botQ: slerpQ(poses[0].botQ, poses[1].botQ, u),
    }
  }
  const { i, t } = segmentTime(poses, u)
  const p0 = atPose(poses, i - 1)
  const p1 = atPose(poses, i)
  const p2 = atPose(poses, i + 1)
  const p3 = atPose(poses, i + 2)
  return {
    cam: centripetal3(p0.cam, p1.cam, p2.cam, p3.cam, t),
    target: centripetal3(p0.target, p1.target, p2.target, p3.target, t),
    fov: lerp1(p1.fov, p2.fov, t),
    bot: centripetal3(p0.bot, p1.bot, p2.bot, p3.bot, t),
    botQ: slerpQ(p1.botQ, p2.botQ, t),
  }
}

function finiteNumbers(values) {
  return values.every((value) => Number.isFinite(value))
}

function applyShot(camera, bottle, shot, controls) {
  if (!shot || !finiteNumbers([...shot.cam, ...shot.target, shot.fov, ...shot.bot])) return
  camera.position.fromArray(shot.cam)
  if (!finiteNumbers(camera.position.toArray())) {
    camera.position.set(...CAM_HOME)
    camera.lookAt(...LOOK_HOME)
    return
  }
  if (camera.fov !== shot.fov) {
    camera.fov = shot.fov
    camera.updateProjectionMatrix()
  }
  camera.near = 0.01
  camera.far = 50
  camera.lookAt(shot.target[0], shot.target[1], shot.target[2])
  if (controls?.target) controls.target.fromArray(shot.target)
  bottle.position.fromArray(shot.bot)
  bottle.quaternion.fromArray(shot.botQ)
}

function syncCameraAspect(camera, width, height) {
  if (!width || !height) return
  const aspect = width / height
  if (Math.abs(camera.aspect - aspect) > 0.0005) {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  }
}

function bakePoses(poses) {
  if (poses.length === 0) return []
  if (poses.length === 1) return [poses[0]]
  const count = MAX_FRAMES
  const samples = []
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1)
    samples.push(sampleSpline(poses, easeEnds(t)))
  }
  return samples
}

function CompositionGuides({ visible, exporting }) {
  if (!visible || exporting) return null
  return (
    <group>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.006, 0.008, 32]} />
        <meshBasicMaterial color="#4c1f24" transparent opacity={0.55} />
      </mesh>
      <mesh position={LOOK_HOME}>
        <sphereGeometry args={[0.004, 12, 12]} />
        <meshBasicMaterial color="#4c1f24" transparent opacity={0.35} />
      </mesh>
      {[
        [0.12, 0, 0],
        [-0.12, 0, 0],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.001, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.004, 0.005, 24]} />
          <meshBasicMaterial color="#4c1f24" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  )
}

function Stage({
  bottleRef,
  controlsRef,
  posesRef,
  playOriginRef,
  hudRef,
  poseCount,
  mode,
  gizmo,
  playing,
  exporting,
  orbitOn,
  setOrbitOn,
  setClock,
  setPlaying,
  resetToken,
  onAssetsReady,
  showGuides,
}) {
  const { camera, gl, controls } = useThree()
  const [gizmoObject, setGizmoObject] = useState(null)

  useEffect(() => {
    controlsRef.current = controls ?? null
  }, [controls, controlsRef])

  useEffect(() => {
    camera.position.set(...CAM_HOME)
    camera.near = 0.01
    camera.far = 50
    camera.lookAt(...LOOK_HOME)
    camera.updateProjectionMatrix()
    if (controls?.target) {
      controls.target.set(...LOOK_HOME)
    }
    const bottle = bottleRef.current
    if (bottle) {
      bottle.position.set(0, 0, 0)
      bottle.quaternion.identity()
    }
  }, [resetToken, camera, controls, bottleRef])

  useEffect(() => {
    if (bottleRef.current) setGizmoObject(bottleRef.current)
  }, [bottleRef, resetToken])

  useFrame(() => {
    if (!exporting) {
      syncCameraAspect(camera, gl.domElement.clientWidth, gl.domElement.clientHeight)
    }

    const bottle = bottleRef.current
    if (!bottle || !playing || exporting) return

    const poses = posesRef.current
    if (poses.length < 2) return

    const elapsed = (performance.now() - playOriginRef.current) / 1000
    const duration = MAX_SECONDS
    const u = easeEnds(Math.min(1, elapsed / duration))
    applyShot(camera, bottle, sampleSpline(poses, u), null)

    if (hudRef.current) {
      const frame = Math.min(MAX_FRAMES, Math.round(u * MAX_FRAMES))
      hudRef.current.textContent = `${poseCount} poses · ${String(frame).padStart(3, '0')} / ${String(MAX_FRAMES).padStart(3, '0')} · ${elapsed.toFixed(2)}s`
    }

    if (elapsed >= duration) {
      applyShot(camera, bottle, poses[poses.length - 1], controls)
      setClock(MAX_FRAMES)
      setPlaying(false)
    }
  })

  useEffect(() => {
    gl.preserveDrawingBuffer = true
  }, [gl])

  const showGizmo = mode === 'objet' && !playing && !exporting && gizmoObject

  return (
    <>
      <color attach="background" args={['#d8d3ca']} />
      <ambientLight intensity={0.45} />
      <spotLight position={[0.6, 1.2, 0.8]} intensity={14} angle={0.45} penumbra={0.8} castShadow />
      <directionalLight position={[-0.55, 0.42, 0.12]} intensity={1.8} />
      <group ref={bottleRef}>
        <LaclauBottle />
      </group>
      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>
      <ContactShadows frames={1} position={[0, -0.002, 0]} opacity={0.45} scale={0.9} blur={2.2} far={0.6} />
      <CompositionGuides visible={showGuides} exporting={exporting} />
      <AssetGate onReady={onAssetsReady} />
      {showGizmo && gizmoObject ? (
        <TransformControls
          object={gizmoObject}
          mode={gizmo}
          size={0.7}
          onMouseDown={() => setOrbitOn(false)}
          onMouseUp={() => setOrbitOn(true)}
        />
      ) : null}
      <OrbitControls
        makeDefault
        enableDamping={!playing && !exporting}
        dampingFactor={0.08}
        enabled={orbitOn && !playing && !exporting}
        minDistance={RADIUS_MIN}
        maxDistance={RADIUS_MAX}
        minPolarAngle={0.25}
        maxPolarAngle={1.55}
      />
    </>
  )
}

function AssetGate({ onReady }) {
  const { active, loaded } = useProgress()
  const sent = useRef(false)

  const finish = useCallback(() => {
    if (sent.current) return
    sent.current = true
    onReady()
  }, [onReady])

  useEffect(() => {
    if (!active && loaded > 0) finish()
  }, [active, loaded, finish])

  useEffect(() => {
    const id = window.setTimeout(finish, 2500)
    return () => window.clearTimeout(id)
  }, [finish])

  return null
}

function toBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
  })
}

export function Studio() {
  const bottleRef = useRef(null)
  const controlsRef = useRef(null)
  const samplesRef = useRef([])
  const posesRef = useRef([])
  const playOriginRef = useRef(0)
  const hudRef = useRef(null)
  const glRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const [poses, setPoses] = useState([])
  const [activePoseIndex, setActivePoseIndex] = useState(-1)
  const [showGuides, setShowGuides] = useState(true)
  const [mode, setMode] = useState('camera')
  const [gizmo, setGizmo] = useState('rotate')
  const [name, setName] = useState('hero')
  const [playing, setPlaying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [orbitOn, setOrbitOn] = useState(true)
  const [clock, setClock] = useState(0)
  const poseCount = poses.length
  const [status, setStatus] = useState(
    'Place la caméra (et la bouteille). Pose + fige le plan. Le mouvement est interpolé — pas le geste souris.',
  )
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [resetToken, setResetToken] = useState(0)

  const frames = poseCount >= 2 ? MAX_FRAMES : 0
  const time = (clock / FPS).toFixed(2)

  const rebuild = useCallback((nextPoses = posesRef.current) => {
    samplesRef.current = bakePoses(nextPoses)
    return samplesRef.current.length
  }, [])

  const applyPoseToScene = useCallback((index) => {
    const pose = posesRef.current[index]
    const camera = cameraRef.current
    const bottle = bottleRef.current
    const controls = controlsRef.current
    if (!pose || !camera || !bottle) return
    applyShot(camera, bottle, pose, controls)
    setActivePoseIndex(index)
    setPlaying(false)
  }, [])

  const patchPose = useCallback(
    (index, patch) => {
      setPoses((prev) => {
        const next = prev.map((pose, i) => (i === index ? { ...pose, ...patch } : pose))
        posesRef.current = next
        rebuild(next)
        if (activePoseIndex === index) {
          const camera = cameraRef.current
          const bottle = bottleRef.current
          const controls = controlsRef.current
          const pose = next[index]
          if (camera && bottle && pose) applyShot(camera, bottle, pose, controls)
        }
        return next
      })
    },
    [activePoseIndex, rebuild],
  )

  const updatePoseBot = useCallback(
    (index, axis, value) => {
      const pose = posesRef.current[index]
      if (!pose) return
      const bot = [...pose.bot]
      bot[axis] = value
      patchPose(index, { bot })
    },
    [patchPose],
  )

  const updatePoseYaw = useCallback(
    (index, yaw) => {
      patchPose(index, { botQ: quatFromYaw(yaw) })
    },
    [patchPose],
  )

  const updatePoseCam = useCallback(
    (index, axis, value) => {
      const pose = posesRef.current[index]
      if (!pose) return
      const cam = [...pose.cam]
      cam[axis] = value
      patchPose(index, { cam })
    },
    [patchPose],
  )

  const applyCompositionRef = useCallback(
    (bot) => {
      if (!bot) return
      const bottle = bottleRef.current
      if (!bottle) return
      bottle.position.set(...bot)
      if (activePoseIndex >= 0 && posesRef.current[activePoseIndex]) {
        patchPose(activePoseIndex, { bot: [...bot] })
      }
      setMode('objet')
      setStatus(`Bouteille → ${bot.map((n) => n.toFixed(3)).join(', ')}`)
    },
    [activePoseIndex, patchPose],
  )

  const recapturePose = useCallback(
    (index) => {
      const camera = cameraRef.current
      const bottle = bottleRef.current
      const controls = controlsRef.current
      if (!camera || !bottle) return
      patchPose(index, capturePose(camera, bottle, controls))
      setActivePoseIndex(index)
      setStatus(`Pose ${index + 1} recapturée depuis la scène.`)
    },
    [patchPose],
  )

  const addPose = useCallback(() => {
    const camera = cameraRef.current
    const bottle = bottleRef.current
    const controls = controlsRef.current
    if (!camera || !bottle) {
      setStatus('La scène n’est pas prête.')
      return
    }
    const pose = capturePose(camera, bottle, controls)
    setPoses((prev) => {
      const next = [...prev, pose]
      posesRef.current = next
      setActivePoseIndex(next.length - 1)
      return next
    })
    rebuild()
    setClock(0)
    setPlaying(false)
    const n = posesRef.current.length
    setStatus(
      n === 1
        ? 'Pose 1. Change d’angle, puis Pose + encore.'
        : `${n} poses → travelling continu ${MAX_SECONDS}s. Play pour voir.`,
    )
  }, [rebuild])

  const undoPose = useCallback(() => {
    setPoses((prev) => {
      const next = prev.slice(0, -1)
      posesRef.current = next
      return next
    })
    setActivePoseIndex((index) => Math.min(index, posesRef.current.length - 1))
    rebuild()
    setPlaying(false)
    setClock(0)
    setStatus(posesRef.current.length ? `${posesRef.current.length} pose(s).` : 'Aucune pose.')
  }, [rebuild])

  const play = useCallback(() => {
    if (posesRef.current.length < 2) {
      setStatus('Il faut au moins deux poses.')
      return
    }
    rebuild()
    if (playing) {
      setPlaying(false)
      return
    }
    playOriginRef.current = performance.now()
    setPlaying(true)
    setStatus('Lecture interpolée.')
  }, [playing, rebuild])

  const [assetsReady, setAssetsReady] = useState(false)

  const markAssetsReady = useCallback(() => setAssetsReady(true), [])

  const encodeSamples = useCallback(async (takeName, baked) => {
    const gl = glRef.current
    const scene = sceneRef.current
    const camera = cameraRef.current
    const bottle = bottleRef.current
    if (LOCKED_TAKES.has(takeName)) {
      setStatus('plan-01 est verrouillé. Exporte sous un autre nom.')
      return false
    }
    if (baked.length < 2 || !gl || !scene || !camera || !bottle) {
      setStatus('La scène n’est pas prête.')
      return false
    }

    setPlaying(false)
    setExporting(true)
    setStatus('Export all-intra…')

    const canvas = gl.domElement
    const prevPr = gl.getPixelRatio()
    const prevW = canvas.width
    const prevH = canvas.height

    try {
      const begin = await fetch(`/__studio/begin?name=${encodeURIComponent(takeName)}`, { method: 'POST' })
      const began = await begin.json()
      if (!began.ok) throw new Error(began.error || 'begin')

      gl.setPixelRatio(1)
      gl.setSize(EXPORT_W, EXPORT_H, false)
      syncCameraAspect(camera, EXPORT_W, EXPORT_H)

      for (let i = 0; i < baked.length; i += 1) {
        applyShot(camera, bottle, baked[i], controlsRef.current)
        camera.updateMatrixWorld()
        bottle.updateMatrixWorld()
        gl.render(scene, camera)
        const blob = await toBlob(canvas)
        await fetch(`/__studio/frame?name=${encodeURIComponent(takeName)}&i=${i}`, {
          method: 'POST',
          body: blob,
        })
        setClock(i + 1)
        setStatus(`Export ${i + 1}/${baked.length}`)
      }

      const end = await fetch(`/__studio/end?name=${encodeURIComponent(takeName)}&fps=${FPS}`, { method: 'POST' })
      const done = await end.json()
      if (!done.ok) throw new Error(done.error || 'ffmpeg')
      setStatus(`Prise prête : ${done.path}`)
      return true
    } catch (error) {
      setStatus(`Export impossible : ${error.message}`)
      return false
    } finally {
      gl.setPixelRatio(prevPr)
      const host = canvas.parentElement
      const viewW = host?.clientWidth || prevW / prevPr
      const viewH = host?.clientHeight || prevH / prevPr
      gl.setSize(viewW, viewH, false)
      syncCameraAspect(camera, viewW, viewH)
      setExporting(false)
    }
  }, [])

  const exportTake = useCallback(async () => {
    const baked = bakePoses(posesRef.current)
    samplesRef.current = baked
    if (baked.length < 2) {
      setStatus('Au moins deux poses, puis exporter.')
      return
    }
    await encodeSamples(name, baked)
  }, [encodeSamples, name])

  const exportCuvee = useCallback(async () => {
    const baked = bakeCuveeTake(MAX_FRAMES)
    samplesRef.current = baked
    setName('spin')
    await encodeSamples('spin', baked)
  }, [encodeSamples])

  const exportShift = useCallback(async () => {
    const baked = bakeShiftTake(MAX_FRAMES)
    samplesRef.current = baked
    setName('shift')
    await encodeSamples('shift', baked)
  }, [encodeSamples])

  const exportHero = useCallback(async () => {
    const baked = bakePlan01Take(MAX_FRAMES)
    samplesRef.current = baked
    setName('hero')
    await encodeSamples('hero', baked)
  }, [encodeSamples])

  const filmOnce = useRef(false)

  useEffect(() => {
    if (!ready || !assetsReady || filmOnce.current) return
    const take = new URLSearchParams(window.location.search).get('film')
    if (take !== 'hero' && take !== 'spin' && take !== 'shift' && take !== 'all') return
    filmOnce.current = true
    const id = window.setTimeout(() => {
      if (take === 'all') {
        void (async () => {
          await exportHero()
          await exportCuvee()
          await exportShift()
        })()
      } else if (take === 'shift') {
        void exportShift()
      } else if (take === 'spin') {
        void exportCuvee()
      } else {
        void exportHero()
      }
    }, 900)
    return () => window.clearTimeout(id)
  }, [ready, assetsReady, exportCuvee, exportShift, exportHero])

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.code === 'KeyP' || event.code === 'Space') {
        event.preventDefault()
        addPose()
      }
      if (event.code === 'Backspace') {
        event.preventDefault()
        undoPose()
      }
      if (event.code === 'KeyC') setMode('camera')
      if (event.code === 'KeyB') setMode('objet')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addPose, undoPose])

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="studio">
      <header className="studio-top">
        <div className="studio-id">
          <strong>Studio Fontanille</strong>
          <span>30 fps · 8 s · poses interpolées · {BOTTLE_BUILD}</span>
        </div>
        <div className="seg" role="tablist">
          <button type="button" className={mode === 'camera' ? 'is-on' : ''} onClick={() => setMode('camera')}>
            Caméra
          </button>
          <button type="button" className={mode === 'objet' ? 'is-on' : ''} onClick={() => setMode('objet')}>
            Bouteille
          </button>
        </div>
        {mode === 'objet' ? (
          <div className="seg">
            <button type="button" className={gizmo === 'rotate' ? 'is-on' : ''} onClick={() => setGizmo('rotate')}>
              Tourner
            </button>
            <button type="button" className={gizmo === 'translate' ? 'is-on' : ''} onClick={() => setGizmo('translate')}>
              Déplacer
            </button>
          </div>
        ) : (
          <span className="meta">Place, puis Pose +</span>
        )}
        <input
          className="studio-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Nom du plan"
        />
      </header>

      <div className="gate">
        <div className="gate-viewport">
          <div className="gate-inner">
            {mounted ? (
              <Canvas
                camera={{ position: CAM_HOME, fov: 32, near: 0.01, far: 50 }}
                gl={{ antialias: true, preserveDrawingBuffer: true }}
                shadows
                dpr={[1, 2]}
                onCreated={({ gl, scene, camera }) => {
                  glRef.current = gl
                  sceneRef.current = scene
                  cameraRef.current = camera
                  setReady(true)
                }}
              >
                <Stage
                  bottleRef={bottleRef}
                  controlsRef={controlsRef}
                  posesRef={posesRef}
                  playOriginRef={playOriginRef}
                  hudRef={hudRef}
                  poseCount={poseCount}
                  mode={mode}
                  gizmo={gizmo}
                  playing={playing}
                  exporting={exporting}
                  orbitOn={orbitOn}
                  setOrbitOn={setOrbitOn}
                  setClock={setClock}
                  setPlaying={setPlaying}
                  resetToken={resetToken}
                  onAssetsReady={markAssetsReady}
                  showGuides={showGuides}
                />
              </Canvas>
            ) : null}
            {showGuides ? <div className="composition-cross" aria-hidden /> : null}
            <p className="status">{status}</p>
          </div>
        </div>

        <aside className="pose-panel">
          <div className="pose-panel-head">
            <strong>Poses & repères</strong>
            <label className="guide-toggle">
              <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} />
              Guides
            </label>
          </div>

          <section className="composition-refs">
            <p className="ref-kicker">Milieu du composer</p>
            <p className="ref-note">Croix = centre du cadre 16:9 · sphère = regard {LOOK_HOME.join(', ')}</p>
            <ul className="ref-list">
              {Object.entries(COMPOSITION_REFS).map(([key, ref]) => (
                <li key={key}>
                  <div className="ref-row">
                    <span>{ref.label}</span>
                    {ref.bot ? (
                      <button type="button" className="ref-apply" onClick={() => applyCompositionRef(ref.bot)}>
                        {ref.bot.map((n) => n.toFixed(2)).join(' · ')}
                      </button>
                    ) : (
                      <span className="ref-static">{LOOK_HOME.join(' · ')}</span>
                    )}
                  </div>
                  <span className="ref-note">{ref.note}</span>
                </li>
              ))}
            </ul>
          </section>

          {poses.length === 0 ? (
            <p className="pose-empty">Aucune pose — Pose + pour capturer, puis édite les coordonnées ici.</p>
          ) : (
            <div className="pose-list">
              {poses.map((pose, index) => (
                <article key={index} className={`pose-card${activePoseIndex === index ? ' is-active' : ''}`}>
                  <div className="pose-card-head">
                    <button type="button" className="pose-select" onClick={() => applyPoseToScene(index)}>
                      Pose {index + 1}
                    </button>
                    <div className="pose-actions">
                      <button type="button" className="pose-recap" onClick={() => recapturePose(index)} title="Recapturer depuis la scène">
                        ↻
                      </button>
                      <span className="pose-meta">fov {fmt(pose.fov)}</span>
                    </div>
                  </div>

                  <fieldset className="pose-fields">
                    <legend>Déplacement bot</legend>
                    <div className="coord-row">
                      {['x', 'y', 'z'].map((label, axis) => (
                        <label key={label}>
                          {label}
                          <input
                            type="number"
                            step="0.001"
                            value={fmt(pose.bot[axis])}
                            onFocus={() => setActivePoseIndex(index)}
                            onChange={(event) =>
                              updatePoseBot(index, axis, parseCoord(event.target.value, pose.bot[axis]))
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="pose-fields">
                    <legend>Rotation yaw (rad)</legend>
                    <input
                      className="yaw-input"
                      type="number"
                      step="0.01"
                      value={fmt(yawFromQuat(pose.botQ))}
                      onFocus={() => setActivePoseIndex(index)}
                      onChange={(event) =>
                        updatePoseYaw(index, parseCoord(event.target.value, yawFromQuat(pose.botQ)))
                      }
                    />
                  </fieldset>

                  <details className="pose-details">
                    <summary>Caméra</summary>
                    <div className="coord-row">
                      {['x', 'y', 'z'].map((label, axis) => (
                        <label key={label}>
                          {label}
                          <input
                            type="number"
                            step="0.001"
                            value={fmt(pose.cam[axis])}
                            onFocus={() => setActivePoseIndex(index)}
                            onChange={(event) =>
                              updatePoseCam(index, axis, parseCoord(event.target.value, pose.cam[axis]))
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      <footer className="studio-bar">
        <div className="actions">
          <button type="button" className="primary" onClick={addPose} disabled={exporting || playing}>
            Pose +
          </button>
          <button type="button" onClick={undoPose} disabled={!poseCount || exporting || playing}>
            Annuler
          </button>
          <button type="button" onClick={play} disabled={poseCount < 2 || exporting}>
            {playing ? 'Stop' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false)
              setResetToken((n) => n + 1)
              setStatus('Caméra recadrée.')
            }}
            disabled={exporting}
          >
            Recentrer
          </button>
          <button type="button" onClick={exportTake} disabled={poseCount < 2 || playing || exporting || !ready}>
            {exporting ? 'Export…' : 'Exporter'}
          </button>
          <button type="button" onClick={exportCuvee} disabled={playing || exporting || !ready}>
            Plan 360
          </button>
        </div>
        <div className="meta" ref={hudRef}>
          {poseCount} pose{poseCount > 1 ? 's' : ''} · {String(clock).padStart(3, '0')} / {String(frames).padStart(3, '0')} · {time}s
        </div>
      </footer>
    </div>
  )
}
