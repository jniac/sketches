import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader'

Object.assign(window, { THREE })

const loader = new THREE.TextureLoader()
const exrLoader = new EXRLoader()
export const loadTexture = (url, onLoad) => {
  if (url.endsWith('.exr')) {
    return exrLoader.load(url, onLoad)
  }
  return loader.load(url, onLoad)
}

const hrdCubeLoader = new HDRCubeTextureLoader()
export const loadHdrCubeTexture = (path, onLoad, faces = ['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr']) => {
  return hrdCubeLoader.setPath(path).load(faces, onLoad)
}

export const shaderTools = {

  injectBefore: (source, pattern, injectedCode) => {
    return source.replace(pattern, `${injectedCode}\n${pattern}`)
  }, 

  injectAfter: (source, pattern, injectedCode) => {
    return source.replace(pattern, `${pattern}\n${injectedCode}`)
  },

  /**
   * 
   * @param {string} source 
   * @param {string} pattern 
   * @param {string} newCode 
   * @returns 
   */
  replace: (source, pattern, newCode) => {
    return source.replaceAll(new RegExp(pattern, 'g'), newCode)
  }
}
