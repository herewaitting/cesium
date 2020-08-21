function YanMo(e,t){e&&t.positions&&(this.viewer=e,this.minHeight=t.minHeight||0,this.maxHeight=t.maxHeight||0,this.currFloodHeight=this.minHeight,this.center=t.center,this.speed=t.speed||0,this.positions=t.positions,this.trans=void 0,this.inverTrans=void 0,this.localPos=[],this.ortCamera=void 0,this.worldPos=[],this.yanmoTex=void 0,this.yanmoFbo=void 0,this.type=t.type,this.init())}YanMo.prototype.init=function(){this.computedCenter(this.positions),this.prepareCamera(),this.prepareFBO(),this.drawPolygon(),this.setFloodMaterial(),this.beginFlood()},YanMo.prototype.beginFlood=function(){Cesium.ExtendBySTC.floodVar=[this.minHeight,this.minHeight,this.maxHeight,this.maxHeight-this.minHeight],Cesium.ExtendBySTC.enableFlood=!0;var e=this;this.floodEvent=function(){e.currFloodHeight+=e.speed,Cesium.ExtendBySTC.floodVar[1]=e.currFloodHeight,e.currFloodHeight>=e.maxHeight&&(e.currFloodHeight=e.maxHeight)},this.viewer.clock.onTick.addEventListener(this.floodEvent)},YanMo.prototype.prepareCamera=function(){this.ortCamera={viewMatrix:Cesium.Matrix4.IDENTITY,inverseViewMatrix:Cesium.Matrix4.IDENTITY,frustum:new Cesium.OrthographicOffCenterFrustum,positionCartographic:{height:0,latitude:0,longitude:0},positionWC:new Cesium.Cartesian3(0,0,0),directionWC:new Cesium.Cartesian3(0,0,1),upWC:new Cesium.Cartesian3(0,1,0),rightWC:new Cesium.Cartesian3(1,0,0),viewProjectionMatrix:Cesium.Matrix4.IDENTITY};var e=Cesium.BoundingRectangle.fromPoints(this.localPos,new Cesium.BoundingRectangle);this.ortCamera.frustum.left=e.x,this.ortCamera.frustum.top=e.y+e.height,this.ortCamera.frustum.right=e.x+e.width,this.ortCamera.frustum.bottom=e.y,this.ortCamera.frustum.near=-12e4,this.ortCamera.frustum.far=12e4,Cesium.ExtendBySTC.floodRect=new Cesium.Cartesian4(e.x,e.y,e.width,e.height)},YanMo.prototype.computedCenter=function(e){if(e){var t,i=this.viewer.scene.context,r=new Cesium.PolygonGeometry({polygonHierarchy:new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(e))}),r=Cesium.PolygonGeometry.createGeometry(r);t=this.center?Cesium.Cartesian3.fromDegrees(this.center.longitude,this.center.latitude):r.boundingSphere.center,this.trans=Cesium.Transforms.eastNorthUpToFixedFrame(t),this.inverTrans=Cesium.Matrix4.inverse(this.trans,new Cesium.Matrix4);for(var o=r.indices,s=r.attributes.position.values,n=s.length,a=[],m=[],h=9999999,u=9999999,C=-9999999,p=-9999999,d=0;d<n;d+=3){var c=s[d],l=s[d+1],y=s[d+2],g=new Cesium.Cartesian3(c,l,y),f=Cesium.Matrix4.multiplyByPoint(this.inverTrans,g,new Cesium.Cartesian3);f.z=0,a.push(f),m.push(f.x),m.push(f.y),m.push(f.z),h>=f.x&&(h=f.x),u>=f.y&&(u=f.y),C<=f.x&&(C=f.x),p<=f.y&&(p=f.y)}this.ratio=(p-u)/(C-h),this.localPos=a;var x=new Float64Array(m),v=Cesium.BoundingSphere.fromVertices(x),w=new Cesium.Geometry({attributes:{position:new Cesium.GeometryAttribute({componentDatatype:Cesium.ComponentDatatype.DOUBLE,componentsPerAttribute:3,values:x})},indices:o,primitiveType:Cesium.PrimitiveType.TRIANGLES,boundingSphere:v}),T=Cesium.ShaderProgram.fromCache({context:i,vertexShaderSource:PolygonVS,fragmentShaderSource:PolygonFS,attributeLocations:{position:0}}),S=Cesium.VertexArray.fromGeometry({context:i,geometry:w,attributeLocations:T._attributeLocations,bufferUsage:Cesium.BufferUsage.STATIC_DRAW,interleave:!0}),F=new Cesium.RenderState;F.depthRange.near=-1e6,F.depthRange.far=1e6,this.drawAreaCommand=new Cesium.DrawCommand({boundingVolume:v,primitiveType:Cesium.PrimitiveType.TRIANGLES,vertexArray:S,shaderProgram:T,renderState:F,pass:Cesium.Pass.TRANSLUCENT})}},YanMo.prototype.prepareFBO=function(){var e=this.viewer.scene.context;this.yanmoTex=new Cesium.Texture({context:e,width:4096,height:4096*this.ratio,pixelFormat:Cesium.PixelFormat.RGBA,pixelDatatype:Cesium.PixelDatatype.FLOAT,flipY:!1}),this.yanmoFbo=new Cesium.Framebuffer({context:e,colorTextures:[this.yanmoTex],destroyAttachments:!1})},YanMo.prototype.drawPolygon=function(){var e=this.viewer.scene.context,t=4096*this.ratio;this._passState=new Cesium.PassState(e),this._passState.viewport=new Cesium.BoundingRectangle(0,0,4096,t);var i=e.uniformState;i.updateCamera(this.ortCamera),i.updatePass(this.drawAreaCommand.pass),this.drawAreaCommand.framebuffer=this.yanmoFbo,this.drawAreaCommand.execute(e,this._passState)},YanMo.prototype.setFloodMaterial=function(){this.viewer.scene.globe.material=Cesium.Material.fromType("FLOOD"),Cesium.ExtendBySTC.inverCenterMat=this.inverTrans,Cesium.ExtendBySTC.floodArea=this.yanmoFbo};var PolygonVS="attribute vec3 position;\nvoid main()\n{\n    vec4 pos = vec4(position.xyz,1.0);\n    gl_Position = czm_projection*pos;\n}",PolygonFS="\n#ifdef GL_FRAGMENT_PRECISION_HIGH\n    precision highp float;\n#else\n    precision mediump float;\n#endif\nvoid main()\n{\n    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}\n";