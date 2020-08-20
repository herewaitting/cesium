import Material from "../../Scene/Material.js"


var TailorMaterialTxt = "uniform vec4 floodVar;//（基础淹没高度，当前淹没高度，最大淹没高度,默认高度差(最大淹没高度 - 基础淹没高度)）\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
    czm_material material = czm_getDefaultMaterial(materialInput);\n\
    return material;\n\
}";


Material.FloodType = 'TAILOR';
Material._materialCache.addMaterial(Material.FloodType, {
    fabric : {
        type : Material.FloodType,
        source : TailorMaterialTxt
    },
    translucent : false
});

export default TailorMaterialTxt;