# Graphics Glossary

**Dot Product**  
Compares two vectors and returns a scalar equal to the product of their magnitudes times the cosine of the angle between them. Core to Lambertian diffuse lighting and measuring how aligned a surface normal is with a light direction.

**Cross Product**  
Takes two 3D vectors and returns a vector perpendicular to both. Used to compute surface normals, tangents, and torque-like effects in procedural geometry setups.

**Noise (Perlin, Simplex, 4D Noise)**  
Smooth pseudo-random functions used to drive procedural textures and motion. 4D variants add a time axis for seamlessly looping animations such as evolving geometry-node volumes or shader effects.

**Gradient Texture**  
Value ramp across space that can be remapped into shapes or masks. In Blender, the spherical gradient turns a volume cube into a volume sphere before additional distortions are applied.

**Instancing**  
Efficiently reuses geometry across many copies by varying transforms (position, rotation, scale) at render time. Appears in Blender's Instance on Points, Three.js InstancedMesh, and React Three Fiber's `<Instances>` helpers.

**Interpolation**  
Blends between values across time or space. Linear interpolation keeps constant speed; eased curves mimic natural acceleration. In shaders, `smoothstep` offers a soft transition for gradients and masks.

**Normals**  
Vectors perpendicular to a surface that drive lighting, reflection, and many procedural effects. Manipulating normals changes how light interacts with geometry, especially in PBR shading.

**Shading Models**  
Rules for converting material + lighting inputs into rendered color. Lambert handles diffuse response, Phong/Blinn-Phong add specular highlights, and PBR models (like Blender's Principled BSDF) approximate real-world materials via roughness/metallic parameters.

**Volume Rendering**  
Techniques for visualizing participating media such as fog, smoke, or emissive gas. Blender's volume cube + principled volume pair short absorption distances with lighting to create moody atmospherics around procedural meshes.
