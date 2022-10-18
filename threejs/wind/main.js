import { mergeBufferGeometries, THREE } from './three.js'
import { scene } from './stage/stage.js'
import { loadTexture, injectBefore, createGrid, createGround } from './utils/index.js'
import { mnui } from 'https://unpkg.com/@jniac/mnui@1.0.7/dist/mnui.js'

const createInstancedFoliage = ({
  parent = scene,
  count = 10,
  setTransform,
} = {}) => {

  const geometry = mergeBufferGeometries([
    new THREE.PlaneGeometry(1, 1, 1, 4)
      .translate(0, 0.5, 0),
    new THREE.PlaneGeometry(1, 1, 1, 4)
      .translate(0, 0.5, 0)
      .scale(1.1, 1.1, 1.1)
      .rotateY(Math.PI * .25),
      new THREE.PlaneGeometry(1, 1, 1, 4)
      .translate(0, 0.5, 0)
      .rotateY(Math.PI * -.25),
      new THREE.PlaneGeometry(1, 1, 1, 4)
      .translate(0, 0.5, 0)
      .scale(1.15, 1.15, 1.15)
      .rotateY(Math.PI * .5),
  ], false)

  const map = loadTexture("assets/foliage.png")
  const alphaMap = loadTexture("assets/foliage-alpha.png")

  const material = new THREE.MeshPhysicalMaterial({
    map,
    alphaMap,
    alphaTest: .75,
    transparent: true,
    side: THREE.DoubleSide,
  })

  let shader = null
  material.onBeforeCompile = _shader => {
    shader = _shader
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uWindSize = { value: 1 }
    shader.uniforms.uWindFrequence = { value: 1 }
    shader.uniforms.uWindBending = { value: 2 }
    shader.uniforms.uWindDirection = { value: new THREE.Vector3(1, 0, 1) }
    shader.uniforms.uWindNormal = { value: new THREE.Vector3(1, 0, -1) }
    shader.uniforms.uWindAmplitude = { value: .02 }
    shader.uniforms.uWindOctaveSizeRatio = { value: .63209 }
    shader.uniforms.uWindOctaveAmplitudeDecay = { value: .78567 }
    shader.defines.WIND_OCTAVES = 4
    shader.vertexShader = injectBefore(shader.vertexShader, '#include <common>', /* glsl */`
      uniform float uTime;
      uniform float uWindSize;
      uniform float uWindFrequence;
      uniform float uWindBending;
      uniform vec3 uWindDirection;
      uniform vec3 uWindNormal;
      uniform float uWindOctaveSizeRatio;
      uniform float uWindOctaveAmplitudeDecay;
      uniform float uWindAmplitude;
    `)
    // https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderChunk/project_vertex.glsl.js
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', /* glsl */`
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif

      // World coordinates:
      mvPosition = modelMatrix * mvPosition;

      vec3 offset = vec3(0);
      float period = uWindSize, amplitude = uWindAmplitude;
      float time = uTime * uWindFrequence;
      // There is pow here, it's better to avoid it in production, and use the "square" alternative.
      float intensity = pow(vUv.y, uWindBending);
      // float intensity = vUv.y * vUv.y;
      for (int i = 0; i < WIND_OCTAVES; i++) {
        float x1 = intensity * sin(time + mvPosition.x / period + mvPosition.z / period) * amplitude;
        float x2 = intensity * sin(time + mvPosition.x / period / 2.0 + mvPosition.z / period / 2.0) * amplitude;
        offset += 
          uWindDirection * x1 +
          uWindNormal * intensity * x2;
        // Pythagore is here: 
        offset.y *= sqrt(1.0 - x1 * x1);
        period *= uWindOctaveSizeRatio;
        amplitude *= uWindOctaveAmplitudeDecay;
      }
      mvPosition.xyz += offset;
      
      // Camera, then screen coordinates:
      mvPosition = viewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    `)
  }

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count)
  instancedMesh.castShadow = true
  instancedMesh.onBeforeRender = () => {
    if (shader) {
      const { uTime, uWindSize, uWindFrequence, uWindBending, uWindAmplitude, uWindOctaveSizeRatio, uWindOctaveAmplitudeDecay } = shader.uniforms
      uTime.value += 1 / 60
      uWindSize.value = mnui.range('wind/size', uWindSize.value, [0, 20]).value
      uWindFrequence.value = mnui.range('wind/frequence', uWindFrequence.value, [0, 20]).value
      uWindBending.value = mnui.range('wind/bending', uWindBending.value, [.5, 3]).value
      uWindAmplitude.value = mnui.range('wind/amplitude', uWindAmplitude.value, [0, .2]).value
      uWindOctaveSizeRatio.value = mnui.range('wind/octaves size ratio', uWindOctaveSizeRatio.value, [0, 1]).value
      uWindOctaveAmplitudeDecay.value = mnui.range('wind/octaves amp decay', uWindOctaveAmplitudeDecay.value, [0, 1]).value
    }
  }
  parent?.add(instancedMesh)

  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const rotation = new THREE.Euler()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  for (let index = 0; index < count; index++) {
    position.set(0, 0, 0)
    rotation.set(0, 0, 0)
    scale.set(1, 1, 1)
    setTransform(position, rotation, scale, index)
    matrix.compose(position, quaternion.setFromEuler(rotation), scale)
    instancedMesh.setMatrixAt(index, matrix)
  }

  return instancedMesh
}

createGrid()
createGround()

const { seededRandom, lerp } = THREE.MathUtils
seededRandom(2245678)
createInstancedFoliage({
  count: 20,
  setTransform: (position, rotation, scale) => {
    position.x = lerp(-4, 4, seededRandom())
    position.z = lerp(-4, 1, seededRandom())
    rotation.y = Math.PI * 2 * seededRandom()
    scale.setScalar(lerp(1, 1.2, seededRandom()))
  },
})

