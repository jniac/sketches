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
  const injectBefore = (source, pattern, injectedCode) => {
    return source.replace(pattern, `${injectedCode}\n${pattern}`)
  }
  const injectAfter = (source, pattern, injectedCode) => {
    return source.replace(pattern, `${pattern}\n${injectedCode}`)
  }

  const geometry = new THREE.PlaneGeometry()
  geometry.translate(0, 0.5, 0)

  const material = new THREE.MeshPhysicalMaterial({
    map: loadTexture("assets/foliage.png"),
    alphaMap: loadTexture("assets/foliage-alpha.png"),
    alphaTest: .5,
    transparent: true,
    side: THREE.DoubleSide,
  })

  let shader = null
  material.onBeforeCompile = _shader => {
    shader = _shader
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uWindDirection = { value: new THREE.Vector3(1, 0, 1) }
    shader.uniforms.uWindStrength = { value: .1 }
    shader.vertexShader = injectBefore(shader.vertexShader, '#include <common>', `
      uniform float uTime;
      uniform vec3 uWindDirection;
      uniform float uWindStrength;
    `)
    // https://github.com/mrdoob/three.js/blob/master/src/renderers/shaders/ShaderChunk/project_vertex.glsl.js
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelMatrix * mvPosition;
      mvPosition.xyz += uWindDirection * vUv.y * sin(uTime) * uWindStrength;
      mvPosition = viewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;
    `)
  }

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.onBeforeRender = () => {
    if (shader) {
      shader.uniforms.uTime.value += 1 / 60
    }
  }
  scene.add(mesh)

  return mesh
}

initShadow()
createGrid()
createGround()
createFoliage()
createFoliage().rotation.set(0, Math.PI * .25, 0)
createFoliage().rotation.set(0, Math.PI * -.25, 0)
