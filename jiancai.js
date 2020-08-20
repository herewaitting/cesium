
function Tailor(viewer, option) {
    if (!viewer || !option.positions) {
        return;
    }
    this.viewer = viewer;
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

Tailor.prototype.init = function() {
    this.computedCenter(this.positions);
    this.prepareFBO();
    this.prepareCamera();
    this.drawPolygon();
    this.beginFlood();
}

Tailor.prototype.beginFlood = function() {
    Cesium.ExtendBySTC.enableTailor = true;
    // this.viewer.scene.globe._surface._tileProvider.applyTailor = true;
    this.viewer.scene.globe.material = Cesium.Material.fromType("TAILOR");
}

Tailor.prototype.prepareCamera = function() {
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
        positionWC: new Cesium.Cartesian3(),
        directionWC: Cesium.Cartesian3.UNIT_Z,
        upWC: Cesium.Cartesian3.UNIT_Y,
        rightWC: Cesium.Cartesian3.UNIT_X,
        viewProjectionMatrix: Cesium.Matrix4.IDENTITY,
    };
    var bg = Cesium.BoundingRectangle.fromPoints(this.localPos, new Cesium.BoundingRectangle());
    this.ortCamera.frustum.left = bg.x;
    this.ortCamera.frustum.top = bg.y + bg.height;
    this.ortCamera.frustum.right = bg.x + bg.width;
    this.ortCamera.frustum.bottom = bg.y;
    this.ortCamera.frustum.near = -maxDis;
    this.ortCamera.frustum.far = maxDis;
    this.ortCamera.positionWC = Cesium.Cartesian3.fromDegrees(this.llhCenter.longitude, this.llhCenter.latitude, maxDis);
    this.ortCamera.positionCartographic = Cesium.Cartographic.fromCartesian(this.ortCamera.positionWC);
    this.ortCamera.directionWC = Cesium.Cartesian3.normalize(Cesium.Matrix4.multiplyByPointAsVector(this.trans, new Cesium.Cartesian3(0,0,-1),new Cesium.Cartesian3()), new Cesium.Cartesian3());
    this.ortCamera.upWC = Cesium.Cartesian3.normalize(Cesium.Matrix4.multiplyByPointAsVector(this.trans, new Cesium.Cartesian3(0,1,0),new Cesium.Cartesian3()), new Cesium.Cartesian3());
    this.ortCamera.rightWC = Cesium.Cartesian3.normalize(Cesium.Matrix4.multiplyByPointAsVector(this.trans, new Cesium.Cartesian3(1,0,0),new Cesium.Cartesian3()), new Cesium.Cartesian3());
    this.ortCamera.viewMatrix = Cesium.Matrix4.computeOrthographicOffCenter(
        this.ortCamera.frustum.left,
        this.ortCamera.frustum.right,
        this.ortCamera.frustum.bottom,
        this.ortCamera.frustum.top,
        this.ortCamera.frustum.near,
        this.ortCamera.frustum.far,
        new Cesium.Matrix4()
    );
    this.ortCamera.inverseViewMatrix = Cesium.Matrix4.inverse(this.ortCamera.viewMatrix, new Cesium.Matrix4());
}

Tailor.prototype.computedCenter = function(positions) {
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

Tailor.prototype.prepareFBO = function () {
    var context = this.viewer.scene.context;
    this.yanmoTex = new Cesium.Texture({
        context: context,
        width: context.drawingBufferWidth,
        height: context.drawingBufferHeight,
        pixelFormat : Cesium.PixelFormat.RGBA,
        pixelDatatype : Cesium.PixelDatatype.FLOAT,
        flipY : false
    });

    this.yanmoFbo = new Cesium.Framebuffer({
        context: context,
        colorTextures: [this.yanmoTex],
        destroyAttachments: true,
    });
}

Tailor.prototype.drawPolygon = function() {
    var polygon = new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(this.worldPos),
        }),
    });
    this.polygon =  this.viewer.scene.primitives.add(new Cesium.GroundPrimitive({
        geometryInstances : polygon,
        appearance: new Cesium.MaterialAppearance({
            material : Cesium.Material.fromType("Color"),
            faceForward : true
        })
    }));
    this.polygon.customFramebuffer = this.yanmoFbo;
    Cesium.ExtendBySTC.tailorArea = this.yanmoFbo;
    this.polygon.customCamera = this.ortCamera;
    this.polygon._clearCommand = new Cesium.ClearCommand({
        color: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
    });
    this.polygon._clearCommand.framebuffer = this.yanmoFbo;
}

