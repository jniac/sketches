# Wind (in the bush)

[Small demo](https://jniac.github.io/sketches/threejs/wind/) about vertex shader, wind and... failing to animate shadows too!

[ThreeJS is saying](https://threejs.org/docs/?q=object#api/en/core/Object3D.customDepthMaterial)
> if you are modifying vertex positions in the vertex shader you must specify a customDepthMaterial for proper shadows. 

But when adding a DepthMeshMaterial to the mesh (instanced or not), the shadows disappear.
