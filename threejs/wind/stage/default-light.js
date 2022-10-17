import { THREE } from '../three.js'

export const getDefaultLight = () => {
  const group = new THREE.Group()
  group.name = 'default-light'

  const ambient = new THREE.AmbientLight('#fff', .5)
  group.add(ambient)

  const sun = new THREE.DirectionalLight('#fff', .5)
  sun.position.set(4, 1, 7)
  group.add(sun)

  return group
}
