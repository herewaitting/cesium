
function YanMo(viewer, option) {
    if (!viewer || !option.positions) {
        return;
    }
    this.viewer = viewer;
    this.minHeight = option.minHeight || 0;
    this.maxHeight = option.maxHeight || 0;
    this.currFloodHeight = this.minHeight;
    this.speed = option.speed || 0;
    this.positions = option.positions;
    this.center = undefined;
    this.trans = undefined;
    this.inverTrans = undefined;
    this.localPos = [];
    this.ortCamera = undefined;
    this.worldPos = [];
    this.yanmoTex = undefined;
    this.yanmoFbo = undefined;
    this.init();
}

YanMo.prototype.init = function() {
    // 根据坐标计算矩阵、局部坐标数据等
    this.computedCenter(this.positions);
    // 准备FBO
    this.prepareFBO();
    // 创建正交相机
    this.prepareCamera();
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
    var maxDis = 12000;
    this.ortCamera = {
        viewMatrix: Cesium.Matrix4.IDENTITY,
        inverseViewMatrix: Cesium.Matrix4.IDENTITY,
        frustum: new Cesium.OrthographicOffCenterFrustum(),
        positionCartographic: {
            height: 0,
            latitude: 0,
            longitude: 0,
        },
        positionWC: new Cesium.Cartesian3(0,0,10000),
        directionWC: new Cesium.Cartesian3(0,0,-1),
        upWC: new Cesium.Cartesian3(0,1,0),
        rightWC: new Cesium.Cartesian3(1,0,0),
        viewProjectionMatrix: Cesium.Matrix4.IDENTITY,
    };
    var bg = Cesium.BoundingRectangle.fromPoints(this.localPos, new Cesium.BoundingRectangle());
    this.ortCamera.frustum.left = bg.x;
    this.ortCamera.frustum.top = bg.y + bg.height;
    this.ortCamera.frustum.right = bg.x + bg.width;
    this.ortCamera.frustum.bottom = bg.y;
    // this.ortCamera.frustum.near = -maxDis;
    // this.ortCamera.frustum.far = maxDis;
    // this.ortCamera.positionWC = Cesium.Cartesian3.fromDegrees(this.llhCenter.longitude, this.llhCenter.latitude, maxDis);
    // this.ortCamera.positionCartographic = Cesium.Cartographic.fromCartesian(this.ortCamera.positionWC);
    // this.ortCamera.directionWC = Cesium.Cartesian3.normalize(Cesium.Matrix4.multiplyByPointAsVector(this.trans, new Cesium.Cartesian3(0,0,-1),new Cesium.Cartesian3()), new Cesium.Cartesian3());
    // this.ortCamera.upWC = Cesium.Cartesian3.normalize(Cesium.Matrix4.multiplyByPointAsVector(this.trans, new Cesium.Cartesian3(0,1,0),new Cesium.Cartesian3()), new Cesium.Cartesian3());
    // this.ortCamera.rightWC = Cesium.Cartesian3.normalize(Cesium.Matrix4.multiplyByPointAsVector(this.trans, new Cesium.Cartesian3(1,0,0),new Cesium.Cartesian3()), new Cesium.Cartesian3());
    // this.ortCamera.viewMatrix = Cesium.Matrix4.computeOrthographicOffCenter(
    //     this.ortCamera.frustum.left,
    //     this.ortCamera.frustum.right,
    //     this.ortCamera.frustum.bottom,
    //     this.ortCamera.frustum.top,
    //     this.ortCamera.frustum.near,
    //     this.ortCamera.frustum.far,
    //     new Cesium.Matrix4()
    // );
    // this.ortCamera.inverseViewMatrix = Cesium.Matrix4.inverse(this.ortCamera.viewMatrix, new Cesium.Matrix4());
}

YanMo.prototype.computedCenter = function(positions) {
    if (!positions) {
        return;
    }
    var totalLon = 0;
    var totalLat = 0;
    var len = positions.length;
    positions.forEach(function(pos) {
        var lon = pos.longitude;
        var lat = pos.latitude;
        totalLon += lon;
        totalLat += lat;
    });
    this.llhCenter = {
        longitude: totalLon/len,
        latitude: totalLat/len
    }
    this.center = Cesium.Cartesian3.fromDegrees(totalLon/len, totalLat/len);
    this.trans = Cesium.Transforms.eastNorthUpToFixedFrame(this.center);
    this.inverTrans = Cesium.Matrix4.inverse(this.trans, new Cesium.Matrix4());

    var minX = 999999;
    var minY = 999999;
    var maxX = -999999;
    var maxY = -999999;

    var that = this;
    positions.forEach(function(pos, index) {
        var lon = pos.longitude;
        var lat = pos.latitude;
        var currPos = Cesium.Cartesian3.fromDegrees(lon, lat);
        that.worldPos.push(currPos);
        var lpoint = Cesium.Matrix4.multiplyByPoint(that.inverTrans, currPos, new Cesium.Cartesian3());
        that.localPos.push(lpoint);
        if (minX >= lpoint.x) {
            minX = lpoint.x;
        }
        if (minY >= lpoint.y) {
            minY = lpoint.y;
        }
        if (maxX <= lpoint.x) {
            maxX = lpoint.x;
        }
        if (maxY <= lpoint.y) {
            maxY = lpoint.y;
        }
    });
    var llb = new Cesium.Cartesian3(minX, minY, 0);
    var llt = new Cesium.Cartesian3(minX, maxY, 0);
    var lrt = new Cesium.Cartesian3(maxX, maxY, 0);
    var lrb = new Cesium.Cartesian3(maxX, minY, 0);
    var wlb = Cesium.Matrix4.multiplyByPoint(this.trans, llb, new Cesium.Cartesian3());
    var wlt = Cesium.Matrix4.multiplyByPoint(this.trans, llt, new Cesium.Cartesian3());
    var wrt = Cesium.Matrix4.multiplyByPoint(this.trans, lrt, new Cesium.Cartesian3());
    var wrb = Cesium.Matrix4.multiplyByPoint(this.trans, lrb, new Cesium.Cartesian3());
    that.carps = [wlb, wlt, wrt, wrb];
    that.ratio = (maxY - minY) / (maxX - minX);
}

YanMo.prototype.prepareFBO = function () {
    var context = this.viewer.scene.context;
    this.yanmoTex = new Cesium.Texture({
        context: context,
        width: context.drawingBufferWidth,
        height: context.drawingBufferHeight,
        pixelFormat : Cesium.PixelFormat.RGBA,
        pixelDatatype : Cesium.PixelDatatype.FLOAT,
        flipY : false
    });
    var depthStencilTexture = new Cesium.Texture({
        context : context,
        width : context.drawingBufferWidth,
        height : context.drawingBufferHeight,
        pixelFormat : Cesium.PixelFormat.DEPTH_STENCIL,
        pixelDatatype : Cesium.PixelDatatype.UNSIGNED_INT_24_8
    });

    this.yanmoFbo = new Cesium.Framebuffer({
        context: context,
        // depthStencilTexture : depthStencilTexture,
        colorTextures: [this.yanmoTex],
        destroyAttachments : false
    });
}

YanMo.prototype.drawPolygon = function() {
    // 使用局部坐标数据绘制polygon
    var polygon = new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(this.localPos),
            // polygonHierarchy: new Cesium.PolygonHierarchy(this.worldPos),
        }),
    });
    // GroundPrimitive
    this.polygon =  this.viewer.scene.primitives.add(new Cesium.Primitive({
        geometryInstances : polygon,
        appearance: new Cesium.MaterialAppearance({
            material : Cesium.Material.fromType("Color"),
            faceForward : true
        })
    }));
    this.polygon.customFramebuffer = this.yanmoFbo;
    // 向cesium代码传FBO
    Cesium.ExtendBySTC.floodArea = this.yanmoFbo;
    this.polygon.customCamera = this.ortCamera;
    this.polygon._clearCommand = new Cesium.ClearCommand({
        color: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
        depth: 1.0,
        stencil: 0,
    });
    this.polygon._clearCommand.framebuffer = this.yanmoFbo;
    this.polygon.stc = true;
    this.polygon.customViewport = new Cesium.BoundingRectangle(0, 0, 2048, 2048 * this.ratio);
}

YanMo.prototype.setFloodMaterial = function () {
    this.viewer.scene.globe.material = Cesium.Material.fromType("FLOOD");
}

