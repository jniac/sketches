import * as THREE from 'three'
import { onBeforeRender, scene, renderer } from '../../common/three/stage.js'
import {
  loadHdrCubeTexture,
  loadTexture,
  shaderTools,
} from '../../common/three/utils.js'
import { mnui } from '@jniac/mnui'

export const createGrid = () => {
  const gridHelper = new THREE.GridHelper(10, 10)
  scene.add(gridHelper)
}

/**
 *
 * @param {THREE.MeshPhysicalMaterialParameters} parameters
 * @returns
 */
export const createCausticsMaterial = parameters => {
  const causticsMap = loadTexture('assets/caustics-2.png')
  causticsMap.wrapS = THREE.RepeatWrapping
  causticsMap.wrapT = THREE.RepeatWrapping

  const material = new THREE.MeshPhysicalMaterial(parameters)

  let shader = null
  material.onBeforeCompile = _shader => {
    shader = _shader

    shader.defines.USE_UV = ''
    shader.defines.CAUSTICS_SQUARE = ''
    // shader.defines.CAUSTICS_USE_CAMERA_ORIENTATION = ''

    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uCausticsScale = { value: new THREE.Vector3(1.15, 0.95, 1) }
    shader.uniforms.uCausticsDirection = { value: new THREE.Vector3(0, 1, 0) }
    shader.uniforms.uCausticsNormalAttenuation = { value: .5 }
    shader.uniforms.uCausticsRGBShift = { value: new THREE.Vector4(1, 1, 1, 1) }
    shader.uniforms.uCausticsIntensity = { value: 1.3 }
    shader.uniforms.uCausticsMap = { value: causticsMap }
    shader.uniforms.uCausticsCameraOrientation = { value: new THREE.Matrix3() }

    shader.vertexShader = shaderTools.injectAfter(
      shader.vertexShader,
      '#include <common>',
      /* glsl */`
        varying vec3 cs_vWorldPosition;
        #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
          varying vec3 cs_vModelPosition;
        #endif
      `,
    )

    shader.vertexShader = shaderTools.injectAfter(
      shader.vertexShader,
      '#include <worldpos_vertex>',
      /* glsl */`
        cs_vWorldPosition = worldPosition.xyz;
        #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
          cs_vModelPosition = modelMatrix[3].xyz;
        #endif
      `,
    )

    shader.fragmentShader = shaderTools.injectAfter(
      shader.fragmentShader,
      '#include <common>',
      /* glsl */ `
        varying vec3 cs_vWorldPosition;
        uniform float uTime;
        uniform float uCausticsIntensity;
        uniform float uCausticsNormalAttenuation;
        uniform vec3 uCausticsScale;
        uniform vec3 uCausticsDirection;
        uniform vec4 uCausticsRGBShift;
        uniform sampler2D uCausticsMap;
        uniform mat3 uCausticsCameraOrientation;

        #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
          varying vec3 cs_vModelPosition; 
        #endif

        vec4 causticsTex(vec2 uv) {
          return texture2D(uCausticsMap, uv);
        }
        vec3 caustics(vec3 normal) {

          #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
            vec2 p = (uCausticsCameraOrientation * (cs_vWorldPosition - cs_vModelPosition) + cs_vModelPosition).xy;
          #else
            vec2 p = cs_vWorldPosition.xz;
          #endif
          
          vec3 scale = uCausticsScale;
          p *= 0.3 * scale.z;
          vec2 uv1 = (p + uTime * 0.02) * scale.x;
          vec2 uv2 = (p - uTime * 0.01) * scale.y;
          float s = 0.002 * scale.z;
          vec4 shift = uCausticsRGBShift;
          vec2 shiftR = shift.w * shift.x * vec2(-s, s);
          vec2 shiftG = shift.w * shift.y * vec2(-s, -s);
          vec2 shiftB = shift.w * shift.z * vec2(s, -s);

          float r = min(causticsTex(uv1 + shiftR).r, causticsTex(uv2 + shiftR).r);
          float g = min(causticsTex(uv1 + shiftG).g, causticsTex(uv2 + shiftG).g);
          float b = min(causticsTex(uv1 + shiftB).b, causticsTex(uv2 + shiftB).b);
          
          #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
            vec3 up = vec3(0.0, 0.0, 1.0);
          #else
            vec3 up = (viewMatrix * vec4(uCausticsDirection, 0.0)).xyz;
          #endif

          float incidence = clamp(dot(normal, up), 0.0, 1.0);
          vec3 light = vec3(r, g, b) * uCausticsIntensity * mix(1.0 - uCausticsNormalAttenuation, 1.0, incidence);

          #ifdef CAUSTICS_SQUARE
            return light * light * 4.0;
          #else
            return light;
          #endif
        }
      `
    )
    shader.fragmentShader = shaderTools.injectAfter(
      shader.fragmentShader,
      '#include <normal_fragment_maps>',
      /* glsl */ `
        diffuseColor.rgb += caustics(normal);
      `
    )

    onBeforeRender(({ camera }) => {
      if (shader) {
        const { 
          uTime,
          uCausticsScale,
          uCausticsIntensity,
          uCausticsRGBShift,
          uCausticsNormalAttenuation,
          uCausticsCameraOrientation,
        } = shader.uniforms
        
        uTime.value += 1 / 60
        uCausticsCameraOrientation.value.set(
          camera.matrixWorld.elements[0],
          camera.matrixWorld.elements[1],
          camera.matrixWorld.elements[2],
          camera.matrixWorld.elements[4],
          camera.matrixWorld.elements[5],
          camera.matrixWorld.elements[6],
          camera.matrixWorld.elements[8],
          camera.matrixWorld.elements[9],
          camera.matrixWorld.elements[10],
        )

        mnui.group('caustics', () => {
          uCausticsScale.value.copy(mnui.vector('scale', uCausticsScale.value).value)
          uCausticsScale.value.z = mnui.range('scale.z', uCausticsScale.value.z, [0, 4]).value
          uCausticsIntensity.value = mnui.range('intensity', uCausticsIntensity.value, [0, 4]).value
          uCausticsRGBShift.value.copy(mnui.vector('shift', uCausticsRGBShift.value).value)
          uCausticsRGBShift.value.w = mnui.range('shift.w',uCausticsRGBShift.value.w,[0, 10]).value
          uCausticsNormalAttenuation.value = mnui.range('normal attenuation', uCausticsNormalAttenuation.value, [0, 1]).value
        })
      }
    })
  
    mnui.group('caustics', () => {
      mnui.toggle('SQUARE', 'CAUSTICS_SQUARE' in shader.defines).onUserChange(value => {
        if (value) {
          shader.defines.CAUSTICS_SQUARE = ''
        } else {
          delete shader.defines.CAUSTICS_SQUARE
        }
        material.needsUpdate = true
      })
      
      mnui.toggle('USE_CAMERA_ORIENTATION', 'CAUSTICS_USE_CAMERA_ORIENTATION' in shader.defines).onUserChange(value => {        
        if (value) {
          shader.defines.CAUSTICS_USE_CAMERA_ORIENTATION = ''
        } else {
          delete shader.defines.CAUSTICS_USE_CAMERA_ORIENTATION
        }
        material.needsUpdate = true
      })
    })
  }


  return material
}

const createPlasterObjects = () => {
  const material = createCausticsMaterial({
    map: loadTexture('assets/white_plaster/diff.jpg'),
    normalMap: loadTexture('assets/white_plaster/normal.exr'),
    roughness: 0.33,
    bumpMap: loadTexture('assets/white_plaster/bump.exr'),
    aoMap: loadTexture('assets/white_plaster/ao.jpg'),
  })

  {
    const geometry = new THREE.CapsuleGeometry(0.5, 1, 5, 16).rotateY(Math.PI)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
  }

  {
    const geometry = new THREE.BoxGeometry()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(1.25, 0, 0)
    onBeforeRender(({ deltaTime }) => {
      mesh.rotation.y += 0.3 * deltaTime
      mesh.rotation.x += 0.3 * deltaTime
    })
    scene.add(mesh)
  }
}

const createPaintBall = () => {
  const geometry = new THREE.SphereGeometry(0.5, 64, 32)
  const material = createCausticsMaterial({
    clearcoat: 1,
    metalness: 0,
    roughness: 0.1,
    color: 'red',
    clearcoatNormalMap: loadTexture(
      'https://threejs.org/examples/textures/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png'
    ),
    clearcoatNormalScale: new THREE.Vector2(2.0, -2.0),
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-1.25, 0, 0)
  scene.add(mesh)
}

const createGolfBall = () => {
  const geometry = new THREE.SphereGeometry(0.5, 64, 32)
  const material = createCausticsMaterial({
    clearcoat: 1,
    metalness: 0,
    roughness: 0.1,
    color: '#da0',
    normalMap: loadTexture(
      'https://threejs.org/examples/textures/golfball.jpg'
    ),
    clearcoatNormalMap: loadTexture(
      'https://threejs.org/examples/textures/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png'
    ),
    clearcoatNormalScale: new THREE.Vector2(2.0, -2.0),
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-1.25, 0, -1.25)
  scene.add(mesh)
}

const createCarbonBall = () => {
  const geometry = new THREE.SphereGeometry(0.5, 64, 32)
  const diffuse = loadTexture(
    'https://threejs.org/examples/textures/carbon/Carbon.png'
  )
  diffuse.encoding = THREE.sRGBEncoding
  diffuse.wrapS = THREE.RepeatWrapping
  diffuse.wrapT = THREE.RepeatWrapping
  const normal = loadTexture(
    'https://threejs.org/examples/textures/carbon/Carbon_Normal.png'
  )
  normal.wrapS = THREE.RepeatWrapping
  normal.wrapT = THREE.RepeatWrapping
  const material = createCausticsMaterial({
    roughness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    map: diffuse,
    normalMap: normal,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-1.25, 0, 1.25)
  scene.add(mesh)
}

// scene.background =
scene.environment = loadHdrCubeTexture(
  'https://threejs.org/examples/textures/cube/pisaHDR/'
)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.95
// renderer.outputEncoding = THREE.sRGBEncoding

createGrid()
createPlasterObjects()
createGolfBall()
createCarbonBall()
createPaintBall()
