import { Group, AmbientLight, DirectionalLight, Scene, PerspectiveCamera, WebGLRenderer, Color } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export const getDefaultLight = () => {
  const group = new Group()
  group.name = 'default-light'

  const ambient = new AmbientLight('#fff', .5)
  group.add(ambient)

  const sun = new DirectionalLight('#fff', .5)
  sun.position.set(4, 7, 4)
  sun.castShadow = true
  group.add(sun)

  return group
}

export const scene = new Scene()
export const camera = new PerspectiveCamera()
export const renderer = new WebGLRenderer({ antialias: true })

scene.background = new Color('#ccc')
scene.add(getDefaultLight())

renderer.shadowMap.enabled = true

camera.position.y = 2.5
camera.position.z = 5

document.body.appendChild(renderer.domElement)

export const orbitcontrols = new OrbitControls(camera, renderer.domElement)

const resize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

const MAX_DELTA_TIME = 1 / 20

/**
 * State of time.
 * @typedef {{ time: number, deltaTime: number, frame: number, camera: PerspectiveCamera }} RenderState
 */

/**
 * @type {RenderState}
 */
const renderState = {
  time: 0,
  deltaTime: 0,
  frame: 0,
  camera,
}

const onBeforeRenderStack = new Set()
/**
 * 
 * @param {(timeState: RenderState) => void} cb 
 * @returns 
 */
export const onBeforeRender = (cb) => {
  onBeforeRenderStack.add(cb)
  const destroy = () => onBeforeRenderStack.delete(cb)
  return { destroy }
} 

let oldMs = -1
const animate = ms => {

  const deltaTime = Math.min((ms - oldMs) / 1e3, MAX_DELTA_TIME)
  oldMs = ms

  renderState.deltaTime = deltaTime
  renderState.time += deltaTime
  renderState.frame++

  try {
    // update for everyone
    scene.traverse(child => {
      child.onBeforeRender?.(renderState)
    })
  
    for (const cb of onBeforeRenderStack) {
      cb(renderState)
    }

    requestAnimationFrame(animate)
  } catch (error) {
    console.error('An error happened inside the animate loop. Breaking the loop.')
    console.error(error)
  }

  renderer.render(scene, camera)
}

requestAnimationFrame(animate)

window.addEventListener('resize', resize)
resize()
