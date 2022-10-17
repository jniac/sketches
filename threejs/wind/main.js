import { THREE } from './three.js'
import { scene } from './stage/stage.js'

const cubeTest = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshPhysicalMaterial({ color: '#fc0' }),
)

cubeTest.onUpdate = ({ deltaTime }) => {
  cubeTest.rotation.y += deltaTime * 1
}

scene.add(cubeTest)
