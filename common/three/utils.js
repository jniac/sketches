import * as THREE from 'three'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader'

Object.assign(window, { THREE })

/**
 * @typedef { 'common' | 'packing' | 'dithering_pars_fragment' | 'color_pars_fragment' | 'uv_pars_fragment' | 'uv2_pars_fragment' | 'map_pars_fragment' | 'alphamap_pars_fragment' | 'alphatest_pars_fragment' | 'aomap_pars_fragment' | 'lightmap_pars_fragment' | 'emissivemap_pars_fragment' | 'bsdfs' | 'iridescence_fragment' | 'cube_uv_reflection_fragment' | 'envmap_common_pars_fragment' | 'envmap_physical_pars_fragment' | 'fog_pars_fragment' | 'lights_pars_begin' | 'normal_pars_fragment' | 'lights_physical_pars_fragment' | 'transmission_pars_fragment' | 'shadowmap_pars_fragment' | 'bumpmap_pars_fragment' | 'normalmap_pars_fragment' | 'clearcoat_pars_fragment' | 'iridescence_pars_fragment' | 'roughnessmap_pars_fragment' | 'metalnessmap_pars_fragment' | 'logdepthbuf_pars_fragment' | 'clipping_planes_pars_fragment' | 'clipping_planes_fragment' | 'logdepthbuf_fragment' | 'map_fragment' | 'color_fragment' | 'alphamap_fragment' | 'alphatest_fragment' | 'roughnessmap_fragment' | 'metalnessmap_fragment' | 'normal_fragment_begin' | 'normal_fragment_maps' | 'clearcoat_normal_fragment_begin' | 'clearcoat_normal_fragment_maps' | 'emissivemap_fragment' | 'lights_physical_fragment' | 'lights_fragment_begin' | 'lights_fragment_maps' | 'lights_fragment_end' | 'aomap_fragment' | 'transmission_fragment' | 'output_fragment' | 'tonemapping_fragment' | 'encodings_fragment' | 'fog_fragment' | 'premultiplied_alpha_fragment' | 'dithering_fragment' } FragmentChunkName
 */

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

  /**
   * @param {string} source 
   * @param {string} pattern 
   * @param {string} injectedCode 
   * @returns {string}
   */
  injectBefore: (source, pattern, injectedCode) => {
    return source.replace(pattern, `${injectedCode}\n${pattern}`)
  },

  /**
   * @param {string} source 
   * @param {FragmentChunkName} chunkName 
   * @param {string} injectedCode 
   * @returns {string}
   */
  injectBeforeChunk: (source, chunkName, injectedCode) => {
    return shaderTools.injectBefore(source, `#include <${chunkName}>`, injectedCode)
  },

  /**
   * @param {string} source 
   * @param {string} pattern 
   * @param {string} injectedCode 
   * @returns {string}
   */
  injectAfter: (source, pattern, injectedCode) => {
    return source.replace(pattern, `${pattern}\n${injectedCode}`)
  },

  /**
   * @param {string} source 
   * @param {FragmentChunkName} chunkName 
   * @param {string} injectedCode 
   * @returns {string}
   */
  injectAfterChunk: (source, chunkName, injectedCode) => {
    return shaderTools.injectAfter(source, `#include <${chunkName}>`, injectedCode)
  },

  /**
   * @param {string} source 
   * @param {string} pattern 
   * @param {string} newCode 
   * @returns {string}
   */
  replace: (source, pattern, newCode) => {
    return source.replaceAll(new RegExp(pattern, 'g'), newCode)
  }
}
