
function YanMo(viewer, option) {
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

YanMo.prototype.init = function() {
    // 根据坐标计算矩阵、局部坐标数据等
    this.computedCenter(this.positions);
    // 创建正交相机
    this.prepareCamera();
    // 准备FBO
    this.prepareFBO();
    // 绘制polygon
    this.drawPolygon();
    this.setFloodMaterial();
    this.beginFlood();
}

YanMo.prototype.beginFlood = function() {
    Cesium.ExtendBySTC.floodVar = [this.minHeight, this.minHeight, this.maxHeight, this.maxHeight - this.minHeight];
    Cesium.ExtendBySTC.enableFlood = true;
    var that = this;
    this.floodEvent = function() {
        that.currFloodHeight += that.speed;
        Cesium.ExtendBySTC.floodVar[1] = that.currFloodHeight;
        if (that.currFloodHeight >= that.maxHeight) {
            that.currFloodHeight = that.maxHeight;
        }
    }
    this.viewer.clock.onTick.addEventListener(this.floodEvent);
}

YanMo.prototype.prepareCamera = function() {
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
    Cesium.ExtendBySTC.floodRect = new Cesium.Cartesian4(bg.x, bg.y, bg.width, bg.height);
}

YanMo.prototype.computedCenter = function(positions) {
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
    console.log(polygon);
    var positionVal = polygon.attributes.position.values;
    var len = positionVal.length;
    var localPos = [];
    var localVertex = [];
    let minX = 9999999;
    let minY = 9999999;
    let maxX = -9999999;
    let maxY = -9999999;
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

YanMo.prototype.prepareFBO = function () {
    var context = this.viewer.scene.context;
    this.yanmoTex = new Cesium.Texture({
        context: context,
        width: 4096,
        height: 4096 * this.ratio,
        pixelFormat : Cesium.PixelFormat.RGBA,
        pixelDatatype : Cesium.PixelDatatype.FLOAT,
        flipY : false
    });
    // var depthStencilTexture = new Cesium.Texture({
    //     context : context,
    //     width : context.drawingBufferWidth,
    //     height : context.drawingBufferWidth * this.ratio,
    //     pixelFormat : Cesium.PixelFormat.DEPTH_STENCIL,
    //     pixelDatatype : Cesium.PixelDatatype.UNSIGNED_INT_24_8
    // });

    this.yanmoFbo = new Cesium.Framebuffer({
        context: context,
        // depthStencilTexture : depthStencilTexture,
        colorTextures: [this.yanmoTex],
        destroyAttachments : false
    });
}

YanMo.prototype.drawPolygon = function() {
    var context = this.viewer.scene.context;
    // var width = context.drawingBufferWidth;
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

YanMo.prototype.setFloodMaterial = function () {
    this.viewer.scene.globe.material = Cesium.Material.fromType("FLOOD");
    Cesium.ExtendBySTC.inverCenterMat = this.inverTrans;
    Cesium.ExtendBySTC.floodArea = this.yanmoFbo;
}

var PolygonVS = 
`
attribute vec3 position;
void main()
{
    vec4 pos = vec4(position.xyz,1.0);
    gl_Position = czm_projection*pos;
    // gl_Position.xy = gl_Position.xy / 2.0 - vec2(0.5);
}`;
var PolygonFS = 
`
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
void main()
{
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
`;

