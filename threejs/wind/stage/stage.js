import { OrbitControls, THREE } from '../three.js'
import { getDefaultLight } from './default-light.js'

Object.assign(window, { THREE })

export const scene = new THREE.Scene()
export const camera = new THREE.PerspectiveCamera()
export const renderer = new THREE.WebGLRenderer({ antialias: true })

scene.background = new THREE.Color('#ccc')
scene.add(getDefaultLight())

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true

camera.position.y = 2.5
camera.position.z = 5

document.body.appendChild(renderer.domElement)

export const controls = new OrbitControls(camera, renderer.domElement)

const resize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}

const MAX_DELTA_TIME = 1 / 20

const timeState = {
  time: 0,
  deltaTime: 0,
  frame: 0
}

let oldMs = -1
const animate = ms => {

  const deltaTime = Math.min((ms - oldMs) / 1e3, MAX_DELTA_TIME)
  oldMs = ms

  timeState.deltaTime = deltaTime
  timeState.time += deltaTime
  timeState.frame++

  requestAnimationFrame(animate)

  // update for everyone
  scene.traverse(child => {
    child.onUpdate?.(timeState)
  })

  renderer.render(scene, camera)
}

requestAnimationFrame(animate)

window.addEventListener('resize', resize)
resize()
