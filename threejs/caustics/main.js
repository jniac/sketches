import * as THREE from 'three'
import { onBeforeRender, scene, renderer, camera, orbitcontrols } from '../../common/three/stage.js'
import {
  loadHdrCubeTexture,
  loadTexture,
  shaderTools,
} from '../../common/three/utils.js'
import { mnui } from '@jniac/mnui'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry'

export const createGrid = () => {
  const gridHelper = new THREE.GridHelper(10, 10)
  scene.add(gridHelper)
}

/**
 * @typedef {{ causticsPower: number, causticsUseCameraOrientation: boolean }} CausticsProps
 * @param {THREE.MeshPhysicalMaterialParameters & CausticsProps} parameters
 * @returns
 */
export const createCausticsMaterial = (parameters = {}) => {
  const causticsMap = loadTexture('assets/caustics-2.png')
  causticsMap.wrapS = THREE.RepeatWrapping
  causticsMap.wrapT = THREE.RepeatWrapping

  let {
    causticsPower = 2,
    causticsUseCameraOrientation = false,
    ...superParameters
  } = parameters
  const material = new THREE.MeshPhysicalMaterial(superParameters)

  const transform = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(.5, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
    rotation: new THREE.Euler(0, Math.PI / 4, 0),
    quaternion: new THREE.Quaternion(),
  }

  let shader = null
  material.onBeforeCompile = _shader => {
    shader = _shader

    // #1. defines
    if (causticsPower >= 2 && causticsPower <= 6) {
      shader.defines.CAUSTICS_POWER = causticsPower
    } else {
      delete shader.defines.CAUSTICS_POWER
    }

    if (causticsUseCameraOrientation) {
      shader.defines.CAUSTICS_USE_CAMERA_ORIENTATION = ''
    } else {
      delete shader.defines.CAUSTICS_USE_CAMERA_ORIENTATION
    }

    // #2. uniforms
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uCausticsParams = { value: new THREE.Vector4(1, 1, 1, 1) }
    shader.uniforms.uCausticsColor = { value: new THREE.Color('#fff') }
    shader.uniforms.uCausticsScale = { value: new THREE.Vector3(1.15, 0.95, 1) }
    shader.uniforms.uCausticsDirection = { value: new THREE.Vector3(0, 1, 0) }
    shader.uniforms.uCausticsTransform = { value: new THREE.Matrix4() }
    shader.uniforms.uCausticsTransformInverse = { value: new THREE.Matrix4() }
    shader.uniforms.uCausticsNormalAttenuation = { value: new THREE.Vector2(.75, -.5) }
    shader.uniforms.uCausticsShadowAttenuation = { value: .666 }
    shader.uniforms.uCausticsColorShift = { value: new THREE.Vector4(1, 1, 1, 1.4) }
    shader.uniforms.uCausticsMap = { value: causticsMap }
    shader.uniforms.uCausticsCameraOrientation = { value: new THREE.Matrix3() }

    // #3. program
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
        uniform float uTime;
        uniform vec4 uCausticsParams; // "x" is timeScale, "y" is intensity
        uniform vec2 uCausticsNormalAttenuation; // "x" is attenuation, "y" is "lower" bound
        uniform float uCausticsShadowAttenuation;
        uniform vec3 uCausticsColor;
        uniform vec3 uCausticsScale;
        uniform vec3 uCausticsDirection;
        uniform vec4 uCausticsColorShift;
        uniform sampler2D uCausticsMap;
        uniform mat3 uCausticsCameraOrientation;
        uniform mat4 uCausticsTransform;
        uniform mat4 uCausticsTransformInverse;

        varying vec3 cs_vWorldPosition;
        #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
          varying vec3 cs_vModelPosition; 
        #endif

        vec4 causticsTex(vec2 uv) {
          return texture2D(uCausticsMap, uv);
        }
        float inverseLerp(float a, float b, float t) {
          return saturate((t - a) / (b - a));
        }
        vec3 caustics(vec3 normal) {
          float timeScale = uCausticsParams.x;
          float intensity = uCausticsParams.y;
          #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
            vec3 transformedPosition = (uCausticsTransform * vec4(uCausticsCameraOrientation * (cs_vWorldPosition - cs_vModelPosition), 1.0)).xyz + cs_vModelPosition;
            vec2 p = (transformedPosition).xy;
          #else
            vec2 p = (uCausticsTransform * vec4(cs_vWorldPosition, 1.0)).xz;
          #endif
          
          vec3 scale = uCausticsScale;
          p *= 0.3 / scale.z;
          float time = uTime * timeScale * 0.04;
          vec2 uv1 = (p + time) / scale.x;
          vec2 uv2 = (p - time) / scale.y;
          float s = 0.002;
          vec4 shift = uCausticsColorShift;
          vec2 shiftR = shift.w * shift.x * vec2(-s, s);
          vec2 shiftG = shift.w * shift.y * vec2(-s, -s);
          vec2 shiftB = shift.w * shift.z * vec2(s, -s);

          float r = min(causticsTex(uv1 + shiftR).r, causticsTex(uv2 + shiftR).r);
          float g = min(causticsTex(uv1 + shiftG).g, causticsTex(uv2 + shiftG).g);
          float b = min(causticsTex(uv1 + shiftB).b, causticsTex(uv2 + shiftB).b);
          
          #ifdef CAUSTICS_USE_CAMERA_ORIENTATION
            vec3 up = (uCausticsTransform * vec4(0.0, 0.0, 1.0, 0.0)).xyz;
          #else
            vec3 up = (viewMatrix * uCausticsTransformInverse * vec4(uCausticsDirection, 0.0)).xyz;
          #endif

          float attenuation = uCausticsNormalAttenuation.x;
          float lowerBound = uCausticsNormalAttenuation.y;
          float incidence = inverseLerp(lowerBound, 1.0, dot(normal, up));
          vec3 light = vec3(r, g, b) * intensity * mix(1.0 - uCausticsNormalAttenuation.x, 1.0, incidence);

          #ifdef CAUSTICS_POWER
            #if CAUSTICS_POWER == 6
              light *= light * light * 27.0;
              light *= light;
            #endif
            #if CAUSTICS_POWER == 5
              vec3 tmp = light * 3.0;
              light *= light * 9.0;
              light *= light * tmp;
            #endif
            #if CAUSTICS_POWER == 4
              light *= light * 9.0;
              light *= light;
            #endif
            #if CAUSTICS_POWER == 3
              light *= light * light * 27.0;
            #endif
            #if CAUSTICS_POWER == 2
              light *= light * 9.0;
            #endif
          #endif

          return light;
        }
      `
    )
    shader.fragmentShader = shaderTools.injectAfterChunk(shader.fragmentShader, 'common', /* glsl */`
      vec3 cs_lightBefore, cs_lightAfter;
    `)
    // shader.fragmentShader = shaderTools.injectAfterChunk(shader.fragmentShader, 'lights_fragment_begin', /* glsl */`
    //   cs_lightBefore = directLight.color;
    // `)
    shader.fragmentShader = shaderTools.injectAfterChunk(shader.fragmentShader, 'lights_fragment_begin', /* glsl */`
      cs_lightBefore = material.diffuseColor;
    `)
    shader.fragmentShader = shaderTools.injectAfterChunk(shader.fragmentShader, 'lights_fragment_end', /* glsl */`
      cs_lightAfter = directLight.color;
    `)
    shader.fragmentShader = shaderTools.injectBeforeChunk(
      shader.fragmentShader,
      'output_fragment',
      /* glsl */ `
        float shadow = saturate(dot(cs_lightBefore - cs_lightAfter, vec3(.5)) * .5);
        // outgoingLight.rgb = vec3(shadow);
        outgoingLight.rgb += saturate(caustics(normal)) * mix(1.0, saturate(1.0 - shadow * 8.0), uCausticsShadowAttenuation);
      `
    )

    onBeforeRender(material, ({ camera, deltaTime }) => {
      if (shader) {
        const {
          uTime,
          uCausticsScale,
          uCausticsParams,
          uCausticsColorShift,
          uCausticsNormalAttenuation,
          uCausticsShadowAttenuation,
          uCausticsCameraOrientation,
          uCausticsTransform,
          uCausticsTransformInverse,
          uCausticsColor,
        } = shader.uniforms

        uTime.value += 1 / 60
        const me = camera.matrixWorld.elements
        uCausticsCameraOrientation.value.set(
          me[0], me[1], me[2],
          me[4], me[5], me[6],
          me[8], me[9], me[10])

        {
          transform.position.addScaledVector(transform.velocity, deltaTime)
          transform.quaternion.setFromEuler(transform.rotation)
          // uCausticsTransform.value.makeRotationFromEuler(new THREE.Euler(uTime.value * .1, 0, 0))
          uCausticsTransform.value.compose(transform.position, transform.quaternion, transform.scale)
          uCausticsTransformInverse.value.copy(uCausticsTransform.value).invert()
        }

        mnui.group('caustics/uniforms', () => {
          uCausticsScale.value.copy(mnui.vector('scale', uCausticsScale.value).value)
          uCausticsScale.value.z = mnui.range('scale.z', uCausticsScale.value.z, [0, 4]).value
          uCausticsParams.value.x = mnui.range('params.timeScale', uCausticsParams.value.x, [0, 4]).value
          uCausticsParams.value.y = mnui.range('params.intensity', uCausticsParams.value.y, [0, 4]).value
          uCausticsColorShift.value.copy(mnui.vector('color-shift', uCausticsColorShift.value).value)
          uCausticsColorShift.value.w = mnui.range('color-shift.w', uCausticsColorShift.value.w, [0, 10]).value
          uCausticsNormalAttenuation.value.x = mnui.range('normal-attenuation/attenuation', uCausticsNormalAttenuation.value.x, [0, 1]).value
          uCausticsNormalAttenuation.value.y = mnui.range('normal-attenuation/lower-bound', uCausticsNormalAttenuation.value.y, [-1, 0]).value
          uCausticsShadowAttenuation.value = mnui.range('shadow-attenuation', uCausticsShadowAttenuation.value, [0, 1]).value
        })

        mnui.group('caustics/transform', () => {
          mnui.vector('position', transform.position)
        })
      }
    })

    mnui.group('caustics/uniforms', () => {
      mnui.range('CAUSTICS_POWER', causticsPower, { min: 1, max: 6, step: 1 }).onUserChange(value => {
        causticsPower = value
        shader.defines.update = Math.random()
        material.needsUpdate = true
      })

      mnui.toggle('USE_CAMERA_ORIENTATION', causticsUseCameraOrientation).onUserChange(value => {
        causticsUseCameraOrientation = value
        shader.defines.update = Math.random()
        material.needsUpdate = true
      })
    })

    mnui.group('caustics/transform', () => {
      mnui.vector('position', transform.position, { step: .1 }).onUserChange(value => transform.position.copy(value))
      mnui.vector('velocity', transform.velocity, { step: .1 }).onUserChange(value => transform.velocity.copy(value))
      mnui.vector('rotation', transform.rotation, {
        keys: 'x,y,z',
        step: .05,
        map: [
          x => x * 180 / Math.PI,
          x => x * Math.PI / 180,
        ],
      }).onUserChange(value => transform.rotation.copy(value))
    })

    Object.assign(window, { material, shader })
  }

  return material
}

const createPlasterObjects = () => {
  const material = createCausticsMaterial({
    color: '#9fc7ff',
    map: loadTexture('assets/white_plaster/diff.jpg'),
    normalMap: loadTexture('assets/white_plaster/normal.exr'),
    roughness: 0.33,
    bumpMap: loadTexture('assets/white_plaster/bump.exr'),
    aoMap: loadTexture('assets/white_plaster/ao.jpg'),
  })

  {
    // sphere
    const geometry = new THREE.IcosahedronGeometry(.5, 4)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  }

  {
    // capsusle
    const geometry = new THREE.CapsuleGeometry(.5, 1, 5, 16).rotateY(Math.PI)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(2.5, 0, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  }

  {
    // cube
    const geometry = new RoundedBoxGeometry()
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(1.25, 0, 0)
    onBeforeRender(({ deltaTime }) => {
      mesh.rotation.y += 0.3 * deltaTime
      mesh.rotation.x += 0.3 * deltaTime
    })
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
  }

  {
    // big cube
    const geometry = new RoundedBoxGeometry(8, 1, 8)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, -1.5, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
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
  mesh.castShadow = true
  mesh.receiveShadow = true
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
  mesh.castShadow = true
  mesh.receiveShadow = true
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
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
}

scene.background = new THREE.Color('#95accb')
// scene.background =
scene.environment = loadHdrCubeTexture(
  'https://threejs.org/examples/textures/cube/pisaHDR/'
)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.95
// renderer.outputEncoding = THREE.sRGBEncoding

camera.position.set(-3, 2, 4)
orbitcontrols.update()

createGrid()
createPlasterObjects()
createGolfBall()
createCarbonBall()
createPaintBall()

Object.assign(window, { mnui })
