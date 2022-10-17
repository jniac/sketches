import { THREE } from '../three.js'

export const getDefaultLight = () => {
  const group = new THREE.Group()
  group.name = 'default-light'

  const ambient = new THREE.AmbientLight('#fff', .5)
  group.add(ambient)

  const sun = new THREE.DirectionalLight('#fff', .5)
  sun.position.set(4, 7, 4)
  sun.castShadow = true
  group.add(sun)

  return group
}
