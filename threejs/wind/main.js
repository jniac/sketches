import { THREE } from "./three.js"
import { renderer, scene } from "./stage/stage.js"
import { loadTexture } from "./utils.js"

const initShadow = () => {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
}

const createGrid = () => {
  const gridHelper = new THREE.GridHelper(10, 10)
  scene.add(gridHelper)
}

const createGround = () => {
  const geometry = new THREE.PlaneGeometry(100, 100)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  const material = new THREE.ShadowMaterial()
  material.opacity = 0.2
  const plane = new THREE.Mesh(geometry, material)
  plane.receiveShadow = true
  scene.add(plane)
}

const createFoliage = () => {
  const geometry = new THREE.PlaneGeometry()
  geometry.translate(0, 0.5, 0)
  const material = new THREE.MeshPhysicalMaterial({
    map: loadTexture("assets/foliage.png"),
    alphaMap: loadTexture("assets/foliage-alpha.png"),
    alphaTest: .5,
    transparent: true,
    side: THREE.DoubleSide,
  })
  const plane = new THREE.Mesh(geometry, material)
  plane.castShadow = true
  scene.add(plane)
}

initShadow()
createGrid()
createGround()
createFoliage()
