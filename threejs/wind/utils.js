import { THREE } from './three.js'

const loader = new THREE.TextureLoader()
export const loadTexture = (url) => {
  return loader.load(url)
}
