import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

Object.assign(window, { THREE })

export const getDefaultLight = () => {
  const group = new THREE.Group()
  group.name = 'default-light'

  const ambient = new THREE.AmbientLight('#fff', .5)
  group.add(ambient)

  const sun = new THREE.DirectionalLight('#fff', .5)
  sun.position.set(4, 7, 4)
  sun.castShadow = true
  group.add(sun)

  return group
}

export const scene = new THREE.Scene()
export const camera = new THREE.PerspectiveCamera()
export const renderer = new THREE.WebGLRenderer({ antialias: true })

scene.background = new THREE.Color('#ccc')
scene.add(getDefaultLight())

renderer.shadowMap.enabled = true

camera.position.y = 2.5
camera.position.z = 5

document.body.appendChild(renderer.domElement)

export const controls = new OrbitControls(camera, renderer.domElement)

const resize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
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
