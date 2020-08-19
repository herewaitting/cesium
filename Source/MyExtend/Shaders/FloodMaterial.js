import Material from "../../Scene/Material.js"


const FloodMaterialTxt = "uniform vec4 floodVar;//（基础淹没高度，当前淹没高度，最大淹没高度,默认高度差(最大淹没高度 - 基础淹没高度)）\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    material.alpha = (materialInput.height < floodVar.y) ? 0.3 : 0.0;\n\
    float rr = (materialInput.height < floodVar.y)?(materialInput.height-floodVar.x)/floodVar.w/2.0:0.0;\n\
    material.diffuse = vec3(1.0-rr,rr,0.0);\n\
    return material;\n\
}";


Material.FloodType = 'FLOOD';
Material._materialCache.addMaterial(Material.FloodType, {
    fabric : {
        type : Material.FloodType,
        source : FloodMaterialTxt
    },
    translucent : false
});

export default FloodMaterialTxt;