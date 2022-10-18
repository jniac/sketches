# Wind (in the bush)

<img width="400" src="https://user-images.githubusercontent.com/11039919/196478575-81560a45-2572-4f2a-9eb8-1e6002c33cba.jpg">


[Small demo](https://jniac.github.io/sketches/threejs/wind/) about vertex shader, wind and... failing to animate shadows too!

[ThreeJS is saying](https://threejs.org/docs/?q=object#api/en/core/Object3D.customDepthMaterial)
> if you are modifying vertex positions in the vertex shader you must specify a customDepthMaterial for proper shadows. 

But when adding a DepthMeshMaterial to the mesh (instanced or not), the shadows disappear.
