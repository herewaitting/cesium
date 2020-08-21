function Tailor(viewer, option) {
    if (!viewer || !option.positions) {
        return;
    }
    this.viewer = viewer;
    this.minHeight = option.minHeight || 0;
    this.maxHeight = option.maxHeight || 0;
    this.currFloodHeight = this.minHeight;
    this.center = option.center;
    this.speed = option.speed || 0;
    this.positions = option.positions;
    this.trans = undefined;
    this.inverTrans = undefined;
    this.localPos = [];
    this.ortCamera = undefined;
    this.worldPos = [];
    this.yanmoTex = undefined;
    this.yanmoFbo = undefined;
    this.type = option.type;
    this.init();
}

Tailor.prototype.init = function() {
    this.computedCenter(this.positions);
    this.prepareCamera();
    this.prepareFBO();
    this.drawPolygon();
    this.setFloodMaterial();
    this.beginFlood();
}

Tailor.prototype.beginFlood = function() {
    Cesium.ExtendBySTC.enableTailor = true;
}

Tailor.prototype.prepareCamera = function() {
    var maxDis = 120000;
    this.ortCamera = {
        viewMatrix: Cesium.Matrix4.IDENTITY,
        inverseViewMatrix: Cesium.Matrix4.IDENTITY,
        frustum: new Cesium.OrthographicOffCenterFrustum(),
        positionCartographic: {
            height: 0,
            latitude: 0,
            longitude: 0,
        },
        positionWC: new Cesium.Cartesian3(0,0,0),
        directionWC: new Cesium.Cartesian3(0,0,1),
        upWC: new Cesium.Cartesian3(0,1,0),
        rightWC: new Cesium.Cartesian3(1,0,0),
        viewProjectionMatrix: Cesium.Matrix4.IDENTITY,
    };
    var bg = Cesium.BoundingRectangle.fromPoints(this.localPos, new Cesium.BoundingRectangle());
    this.ortCamera.frustum.left = bg.x;
    this.ortCamera.frustum.top = bg.y + bg.height;
    this.ortCamera.frustum.right = bg.x + bg.width;
    this.ortCamera.frustum.bottom = bg.y;
    this.ortCamera.frustum.near = -maxDis;
    this.ortCamera.frustum.far = maxDis;
    Cesium.ExtendBySTC.tailorRect = new Cesium.Cartesian4(bg.x, bg.y, bg.width, bg.height);
}

Tailor.prototype.computedCenter = function(positions) {
    if (!positions) {
        return;
    }
    var context = this.viewer.scene.context;
    var polygon = new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(positions)),
    });
    polygon = Cesium.PolygonGeometry.createGeometry(polygon);
    if (this.center) {
        var center = Cesium.Cartesian3.fromDegrees(this.center.longitude, this.center.latitude);
        this.trans = Cesium.Transforms.eastNorthUpToFixedFrame(center);
    }else {
        var center = polygon.boundingSphere.center;
        this.trans = Cesium.Transforms.eastNorthUpToFixedFrame(center);
    }
    this.inverTrans = Cesium.Matrix4.inverse(this.trans, new Cesium.Matrix4());
    var indexs = polygon.indices;
    var positionVal = polygon.attributes.position.values;
    var len = positionVal.length;
    var localPos = [];
    var localVertex = [];
    var minX = 9999999;
    var minY = 9999999;
    var maxX = -9999999;
    var maxY = -9999999;
    for(var i=0; i<len; i+=3){
        var currx = positionVal[i];
        var curry = positionVal[i+1];
        var currz = positionVal[i+2];
        var currCar = new Cesium.Cartesian3(currx, curry, currz);
        var localp = Cesium.Matrix4.multiplyByPoint(this.inverTrans, currCar, new Cesium.Cartesian3());
        localp.z = 0;
        localPos.push(localp);
        localVertex.push(localp.x);
        localVertex.push(localp.y);
        localVertex.push(localp.z);
        if (minX >= localp.x) {
            minX = localp.x;
        }
        if (minY >= localp.y) {
            minY = localp.y;
        }
        if (maxX <= localp.x) {
            maxX = localp.x;
        }
        if (maxY <= localp.y) {
            maxY = localp.y;
        }
    }
    this.ratio = (maxY - minY) / (maxX - minX);
    this.localPos = localPos;
    var lps = new Float64Array(localVertex);
    var bs = Cesium.BoundingSphere.fromVertices(lps);
    var localGeo = new Cesium.Geometry({
        attributes : {
            position : new Cesium.GeometryAttribute({
                componentDatatype : Cesium.ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : lps,
            }),
        },
        indices : indexs,
        primitiveType : Cesium.PrimitiveType.TRIANGLES,
        boundingSphere : bs,
    });

    var sp = Cesium.ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: PolygonVS,
        fragmentShaderSource: PolygonFS,
        attributeLocations: {
            position: 0,
        },
    });
    var vao = Cesium.VertexArray.fromGeometry({
        context: context,
        geometry: localGeo,
        attributeLocations: sp._attributeLocations,
        bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
        interleave: true,
    });

    var rs = new Cesium.RenderState();
    rs.depthRange.near = -1000000.0;
    rs.depthRange.far = 1000000.0;
    this.drawAreaCommand = new Cesium.DrawCommand({
        boundingVolume: bs,
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        vertexArray: vao,
        shaderProgram: sp,
        renderState: rs,
        pass : Cesium.Pass.TRANSLUCENT,
    });
}

Tailor.prototype.prepareFBO = function () {
    var context = this.viewer.scene.context;
    this.yanmoTex = new Cesium.Texture({
        context: context,
        width: 4096,
        height: 4096 * this.ratio,
        pixelFormat : Cesium.PixelFormat.RGBA,
        pixelDatatype : Cesium.PixelDatatype.FLOAT,
        flipY : false
    });

    this.yanmoFbo = new Cesium.Framebuffer({
        context: context,
        colorTextures: [this.yanmoTex],
        destroyAttachments : false
    });
}

Tailor.prototype.drawPolygon = function() {
    var context = this.viewer.scene.context;
    var width = 4096;
    var height = width * this.ratio;
    this._passState = new Cesium.PassState(context);
    this._passState.viewport = new Cesium.BoundingRectangle(0, 0, width, height);
    var us = context.uniformState;
    us.updateCamera(this.ortCamera);
    us.updatePass(this.drawAreaCommand.pass);
    this.drawAreaCommand.framebuffer = this.yanmoFbo;
    this.drawAreaCommand.execute(context, this._passState);
}

Tailor.prototype.setFloodMaterial = function () {
    this.viewer.scene.globe.material = Cesium.Material.fromType("TAILOR");
    Cesium.ExtendBySTC.inverCenterMat = this.inverTrans;
    Cesium.ExtendBySTC.tailorArea = this.yanmoFbo;
}

var PolygonVS = 
"attribute vec3 position;\n\
void main()\n\
{\n\
    vec4 pos = vec4(position.xyz,1.0);\n\
    gl_Position = czm_projection*pos;\n\
}";
var PolygonFS = 
"\n\
#ifdef GL_FRAGMENT_PRECISION_HIGH\n\
    precision highp float;\n\
#else\n\
    precision mediump float;\n\
#endif\n\
void main()\n\
{\n\
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n\
}\n\
";
