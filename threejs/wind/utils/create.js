import { THREE } from '../three.js'
import { scene } from '../stage/stage.js'

export const createGrid = () => {
  const gridHelper = new THREE.GridHelper(10, 10)
  scene.add(gridHelper)
}

export const createGround = () => {
  const geometry = new THREE.PlaneGeometry(100, 100)
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()
  const material = new THREE.ShadowMaterial()
  material.opacity = 0.2
  const plane = new THREE.Mesh(geometry, material)
  plane.receiveShadow = true
  scene.add(plane)
}
