import { Quaternion, Vector3 } from 'three'

const UP = new Vector3(0, 1, 0)
const _q = new Quaternion()
const LABEL_AZIMUTH = Math.atan2(0.28, 0.52)

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function smooth(t) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function quatYaw(yaw) {
  return _q.setFromAxisAngle(UP, yaw).toArray()
}

const CAM = [
  0.62 * Math.sin(LABEL_AZIMUTH),
  0.165,
  0.62 * Math.cos(LABEL_AZIMUTH),
]
const LOOK = [0, 0.15, 0]
const FOV = 32
const HOLD_IN = 0.1
const REST = 0.82
const RIGHT = [0.12, 0, 0]
const LEFT = [-0.12, 0, 0]

function spinAmount(t) {
  if (t <= HOLD_IN) return 0
  if (t >= REST) return 1
  return smooth((t - HOLD_IN) / (REST - HOLD_IN))
}

export function cuveeShot(t) {
  const u = spinAmount(t)
  return {
    cam: CAM,
    target: LOOK,
    fov: FOV,
    bot: lerp3([0, 0, 0], RIGHT, u),
    botQ: quatYaw(u * Math.PI * 2),
  }
}

export function bakeCuveeTake(frames) {
  const n = Math.max(2, frames)
  return Array.from({ length: n }, (_, i) => cuveeShot(i / (n - 1)))
}

export function shiftShot(t) {
  const u = spinAmount(t)
  return {
    cam: CAM,
    target: LOOK,
    fov: FOV,
    bot: lerp3(RIGHT, LEFT, u),
    botQ: quatYaw(u * Math.PI * 2),
  }
}

export function bakeShiftTake(frames) {
  const n = Math.max(2, frames)
  return Array.from({ length: n }, (_, i) => shiftShot(i / (n - 1)))
}
