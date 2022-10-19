import * as THREE from 'three'

const loader = new THREE.TextureLoader()
export const loadTexture = (url) => {
  return loader.load(url)
}
