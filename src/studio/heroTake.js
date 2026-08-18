import { Quaternion, Vector3 } from 'three'

const UP = new Vector3(0, 1, 0)
const _q = new Quaternion()
const LOOK = [0, 0.148, 0]
const SPLIT = 0.38

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smooth(t) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function camFrom(theta, phi, radius, target) {
  const s = Math.sin(phi)
  return [
    target[0] + radius * s * Math.sin(theta),
    target[1] + radius * Math.cos(phi),
    target[2] + radius * s * Math.cos(theta),
  ]
}

function quatYaw(yaw) {
  return _q.setFromAxisAngle(UP, yaw).toArray()
}

export function heroShot(t) {
  const restYaw = -0.22

  if (t < SPLIT) {
    const u = smooth(t / SPLIT)
    const theta = lerp(1.18, 0.46, u)
    const phi = lerp(1.4, 1.08, u)
    const radius = lerp(1.08, 0.45, u)
    return {
      cam: camFrom(theta, phi, radius, LOOK),
      target: LOOK,
      fov: lerp(40, 30, u),
      bot: [0, 0, 0],
      botQ: quatYaw(restYaw),
    }
  }

  const u = smooth((t - SPLIT) / (1 - SPLIT))
    const theta = 0.46
    const phi = 1.08
    const radius = 0.45
  return {
    cam: camFrom(theta, phi, radius, LOOK),
    target: LOOK,
    fov: 30,
    bot: [0, 0, 0],
    botQ: quatYaw(restYaw + u * Math.PI * 2),
  }
}

export function bakeHeroTake(frames) {
  const n = Math.max(2, frames)
  return Array.from({ length: n }, (_, i) => heroShot(i / (n - 1)))
}

const PLAN01_CAM = [0.32, 0.16, 0.52]
const PLAN01_LOOK = [0, 0.15, 0]
const PLAN01_YAW = -0.22

export function plan01Shot() {
  return {
    cam: PLAN01_CAM,
    target: PLAN01_LOOK,
    fov: 32,
    bot: [0, 0, 0],
    botQ: quatYaw(PLAN01_YAW),
  }
}

export function bakePlan01Take(frames) {
  const shot = plan01Shot()
  const n = Math.max(2, frames)
  return Array.from({ length: n }, () => shot)
}
