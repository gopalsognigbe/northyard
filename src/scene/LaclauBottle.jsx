import { forwardRef, Suspense, useLayoutEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { BackSide, ClampToEdgeWrapping, SRGBColorSpace, Vector2 } from 'three'

const BODY_RADIUS = 0.0381
const LABEL_HEIGHT = 0.118
const LABEL_ASPECT = 1024 / 1536
const LABEL_Y = 0.104
const CAPSULE = '#4c1f24'
export const BOTTLE_BUILD = 'nocork-3'

function bordeauxProfile() {
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
  ]
}

function Glass() {
  const points = useMemo(() => bordeauxProfile(), [])
  return (
    <>
      <mesh name="glass" castShadow>
        <latheGeometry args={[points, 64]} />
        <meshStandardMaterial color="#1a2e22" roughness={0.22} metalness={0.06} envMapIntensity={0.85} />
      </mesh>
      <mesh name="wine" position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.0354, 0.0354, 0.164, 48]} />
        <meshStandardMaterial color="#2a0c12" roughness={0.55} metalness={0} />
      </mesh>
    </>
  )
}

function FontanilleLabel() {
  const map = useTexture('/labels/fontanille.png?v=print3')

  useLayoutEffect(() => {
    map.colorSpace = SRGBColorSpace
    map.anisotropy = 16
    map.wrapS = ClampToEdgeWrapping
    map.wrapT = ClampToEdgeWrapping
    map.needsUpdate = true
  }, [map])

  const { radiusPrint, radiusBack, thetaStart, thetaLength } = useMemo(() => {
    const width = LABEL_HEIGHT * LABEL_ASPECT
    const thetaLength = width / BODY_RADIUS
    const towardCamera = Math.atan2(0.28, 0.52)
    return {
      radiusPrint: BODY_RADIUS + 0.00022,
      radiusBack: BODY_RADIUS - 0.00015,
      thetaStart: towardCamera - thetaLength / 2,
      thetaLength,
    }
  }, [])

  return (
    <group position={[0, LABEL_Y, 0]}>
      <mesh>
        <cylinderGeometry args={[radiusBack, radiusBack, LABEL_HEIGHT, 96, 1, true, thetaStart, thetaLength]} />
        <meshStandardMaterial color="#e6dccb" roughness={0.95} metalness={0} side={BackSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[radiusPrint, radiusPrint, LABEL_HEIGHT, 96, 1, true, thetaStart, thetaLength]} />
        <meshBasicMaterial map={map} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Capsule() {
  const foil = useMemo(
    () => ({ color: CAPSULE, roughness: 0.62, metalness: 0.1, envMapIntensity: 0.12 }),
    [],
  )

  return (
    <group>
      <mesh position={[0, 0.281, 0]} castShadow>
        <cylinderGeometry args={[0.0158, 0.0153, 0.048, 48]} />
        <meshStandardMaterial {...foil} />
      </mesh>
      <mesh position={[0, 0.3052, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={10}>
        <circleGeometry args={[0.0158, 48]} />
        <meshBasicMaterial color={CAPSULE} toneMapped={false} depthWrite depthTest />
      </mesh>
    </group>
  )
}

export const LaclauBottle = forwardRef(function LaclauBottle(props, ref) {
  return (
    <group ref={ref} {...props}>
      <Glass />
      <Capsule />
      <Suspense fallback={null}>
        <FontanilleLabel />
      </Suspense>
    </group>
  )
})
