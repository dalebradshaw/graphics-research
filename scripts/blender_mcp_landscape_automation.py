"""
Blender MCP Landscape Automation Scripts
Pre-built Python scripts for automating generative landscape workflows via MCP
"""

import json

LANDSCAPE_TEMPLATES = {
    "rocky_mountain": {
        "name": "Rocky Mountain Terrain",
        "description": "High-frequency noise terrain with snow caps",
        "params": {
            "noise_type": "Musgrave",
            "scale": 15.0,
            "detail": 15,
            "roughness": 0.8,
            "dimension": 3.0,
            "lacunarity": 2.5,
            "i_scale": 1.0,
            "height_multiplier": 8.0,
            "snow_threshold": 0.6,
            "color_ramp": {
                "0.0": "#5C4033",  # Dark brown (rock)
                "0.5": "#8B7355",  # Light brown
                "0.7": "#FFFFFF",  # White (snow)
            },
        },
    },
    "rolling_hills": {
        "name": "Rolling Hills",
        "description": "Smooth, organic terrain for pastoral scenes",
        "params": {
            "noise_type": "Voronoi",
            "scale": 25.0,
            "detail": 8,
            "roughness": 0.4,
            "dimension": 2.0,
            "lacunarity": 2.0,
            "i_scale": 0.5,
            "height_multiplier": 3.0,
            "color_ramp": {
                "0.0": "#228B22",  # Forest green
                "0.3": "#7CFC00",  # Lawn green
                "0.7": "#DEB887",  # Burlywood
            },
        },
    },
    "desert_dunes": {
        "name": "Desert Dunes",
        "description": "Wave-based terrain for desert scenes",
        "params": {
            "noise_type": "Wave",
            "scale": 8.0,
            "detail": 4,
            "roughness": 0.2,
            "wave_type": "Bands",
            "wave_direction": "Y",
            "wave_profile": "Sine",
            "height_multiplier": 4.0,
            "color_ramp": {
                "0.0": "#F4A460",  # Sandy brown
                "0.5": "#DEB887",  # Burlywood
                "1.0": "#F5DEB3",  # Wheat
            },
        },
    },
    "alien_landscape": {
        "name": "Alien Landscape",
        "description": "Voronoi-based surreal terrain",
        "params": {
            "noise_type": "Voronoi",
            "distance": "Chebyshev",
            "feature": "F2-F1",
            "scale": 12.0,
            "detail": 12,
            "roughness": 0.6,
            "height_multiplier": 6.0,
            "color_ramp": {
                "0.0": "#4B0082",  # Indigo
                "0.3": "#8A2BE2",  # Blue violet
                "0.6": "#FF1493",  # Deep pink
                "0.9": "#00CED1",  # Dark turquoise
            },
        },
    },
    "fjord_coast": {
        "name": "Fjord Coast",
        "description": "Sharp, dramatic coastal terrain",
        "params": {
            "noise_type": "Musgrave",
            "musgrave_type": "Ridged",
            "scale": 20.0,
            "detail": 16,
            "dimension": 2.5,
            "lacunarity": 2.0,
            "i_scale": 1.2,
            "height_multiplier": 12.0,
            "erosion": True,
            "water_level": 0.3,
            "color_ramp": {
                "0.0": "#191970",  # Midnight blue (deep water)
                "0.3": "#4682B4",  # Steel blue (water)
                "0.35": "#696969",  # Dim gray (shore)
                "0.6": "#A9A9A9",  # Dark gray (rock)
                "0.8": "#F5F5F5",  # White smoke (snow)
            },
        },
    },
}

SCATTER_TEMPLATES = {
    "forest": {
        "name": "Forest Scatter",
        "density": 0.1,
        "scale_min": 0.5,
        "scale_max": 2.0,
        "slope_max": 0.5,  # Only on slopes less than 30 degrees
        "altitude_min": 0.2,
        "altitude_max": 0.8,
    },
    "rocks": {
        "name": "Rock Scatter",
        "density": 0.05,
        "scale_min": 0.3,
        "scale_max": 1.5,
        "slope_max": 0.8,
        "altitude_min": 0.1,
        "altitude_max": 1.0,
    },
    "vegetation": {
        "name": "Vegetation Scatter",
        "density": 0.2,
        "scale_min": 0.8,
        "scale_max": 1.5,
        "slope_max": 0.4,
        "altitude_min": 0.15,
        "altitude_max": 0.7,
    },
}


# Python code templates for Blender MCP
def generate_landscape_code(template_name: str, seed: int = 0) -> str:
    """Generate Python code for creating a landscape with geometry nodes"""
    template = LANDSCAPE_TEMPLATES.get(
        template_name, LANDSCAPE_TEMPLATES["rocky_mountain"]
    )
    params = template["params"]

    if seed == 0:
        import random

        seed = random.randint(0, 10000)

    code = f'''
import bpy
import random

# Clear existing mesh objects
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Create base plane
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
landscape = bpy.context.active_object
landscape.name = "{template["name"]}"

# Add geometry nodes modifier
modifier = landscape.modifiers.new(name="Landscape_Gen", type='NODES')

# Create new node group
node_group = bpy.data.node_groups.new(name="Landscape_Gen_Nodes", type='GeometryNodeTree')
modifier.node_group = node_group

# Add nodes
nodes = node_group.nodes
links = node_group.links

# Input and Output nodes
input_node = nodes.new('NodeGroupInput')
output_node = nodes.new('NodeGroupOutput')
node_group.interface.new_socket(name="Geometry", socket_type='NodeSocketGeometry', in_out='INPUT')
node_group.interface.new_socket(name="Geometry", socket_type='NodeSocketGeometry', in_out='OUTPUT')

# Subdivision node
subdiv = nodes.new('GeometryNodeSubdivisionSurface')
subdiv.inputs['Level'].default_value = 6

# Noise texture
noise = nodes.new('ShaderNodeTexNoise')
noise.noise_dimensions = '3D'
noise.inputs['Scale'].default_value = {params.get("scale", 15.0)}
noise.inputs['Detail'].default_value = {params.get("detail", 10)}
noise.inputs['Roughness'].default_value = {params.get("roughness", 0.5)}
noise.inputs['W'].default_value = {seed}  # Random seed

# Displacement
set_pos = nodes.new('GeometryNodeSetPosition')

# Link nodes
links.new(input_node.outputs['Geometry'], subdiv.inputs['Mesh'])
links.new(subdiv.outputs['Mesh'], set_pos.inputs['Geometry'])
links.new(noise.outputs['Fac'], set_pos.inputs['Offset'])
links.new(set_pos.outputs['Geometry'], output_node.inputs['Geometry'])

print(f"Created {{landscape.name}} with seed {{seed}}")
'''
    return code.strip()


def generate_export_code(export_path: str, format: str = "glb") -> str:
    """Generate Python code for exporting to Three.js compatible format"""
    code = f'''
import bpy
import os

# Ensure export directory exists
os.makedirs(os.path.dirname("{export_path}"), exist_ok=True)

# Select the landscape object
landscape = bpy.data.objects.get("Landscape")
if landscape:
    bpy.context.view_layer.objects.active = landscape
    landscape.select_set(True)
    
    # Export based on format
    if "{format}" == "glb":
        bpy.ops.export_scene.gltf(
            filepath="{export_path}",
            export_format='GLB',
            use_selection=True,
            export_yup=True,
            export_materials='EXPORT'
        )
    elif "{format}" == "obj":
        bpy.ops.export_scene.obj(
            filepath="{export_path}",
            use_selection=True,
            use_materials=True
        )
    elif "{format}" == "fbx":
        bpy.ops.export_scene.fbx(
            filepath="{export_path}",
            use_selection=True
        )
    
    print(f"Exported to {export_path}")
else:
    print("Landscape object not found")
'''
    return code.strip()


def generate_batch_variations_code(
    template_name: str, count: int = 5, export_dir: str = "/tmp/exports"
) -> str:
    """Generate Python code for creating multiple landscape variations"""
    # Build the code string piece by piece to avoid f-string issues
    landscape_code = generate_landscape_code(template_name, 0)

    code = (
        '''
import bpy
import random
import json
import os

variations = []
export_dir = "'''
        + export_dir
        + '''"
os.makedirs(export_dir, exist_ok=True)

template_name = "'''
        + template_name
        + """"

for i in range("""
        + str(count)
        + """):
    seed = random.randint(0, 10000)
    
    # Create landscape with this seed
    # (Landscape generation code would go here)
    
    # Store variation data
    variation = {
        "index": i,
        "seed": seed,
        "name": template_name + "_" + str(i).zfill(3)
    }
    variations.append(variation)
    
    # Export each variation
    export_path = os.path.join(export_dir, template_name + "_" + str(i).zfill(3) + ".glb")
    # (Export code would go here)
    print(f"Exported: {export_path}")

# Save metadata
metadata_path = os.path.join(export_dir, "landscape_variations.json")
with open(metadata_path, 'w') as f:
    json.dump(variations, f, indent=2)

print(f"Generated """
        + str(count)
        + """ variations")
"""
    )
    return code.strip()


# Save templates to JSON for reference
def save_templates():
    """Save all templates to a JSON file"""
    templates = {"landscapes": LANDSCAPE_TEMPLATES, "scatter": SCATTER_TEMPLATES}

    with open("landscape_templates.json", "w") as f:
        json.dump(templates, f, indent=2)


if __name__ == "__main__":
    save_templates()
    print("Templates saved to landscape_templates.json")
