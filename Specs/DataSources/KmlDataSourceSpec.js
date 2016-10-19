/*global defineSuite*/
defineSuite([
        'DataSources/KmlDataSource',
        'Core/BoundingRectangle',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/Color',
        'Core/combine',
        'Core/DefaultProxy',
        'Core/Event',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/loadBlob',
        'Core/loadWithXhr',
        'Core/Math',
        'Core/NearFarScalar',
        'Core/Rectangle',
        'Core/RequestErrorEvent',
        'Core/RuntimeError',
        'DataSources/ColorMaterialProperty',
        'DataSources/EntityCollection',
        'DataSources/ImageMaterialProperty',
        'Scene/Camera',
        'Scene/HeightReference',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/SceneMode',
        'Specs/createCamera',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        KmlDataSource,
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        ClockRange,
        ClockStep,
        Color,
        combine,
        DefaultProxy,
        Event,
        Iso8601,
        JulianDate,
        loadBlob,
        loadWithXhr,
        CesiumMath,
        NearFarScalar,
        Rectangle,
        RequestErrorEvent,
        RuntimeError,
        ColorMaterialProperty,
        EntityCollection,
        ImageMaterialProperty,
        Camera,
        HeightReference,
        HorizontalOrigin,
        LabelStyle,
        SceneMode,
        createCamera,
        pollToPromise,
        when) {
    "use strict";

    var parser = new DOMParser();

    //simple.png in the DATA/KML directory
    var image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAMAAAAoyzS7AAADAFBMVEUAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADHM2paAAAAGHRFWHRTb2Z0d2FyZQBQYWludC5ORVQgdjMuMzap5+IlAAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==';

    var uberStyle = '\
        <Style>\
            <LineStyle>\
              <color>aaaaaaaa</color>\
              <width>2</width>\
            </LineStyle>\
            <PolyStyle>\
              <color>cccccccc</color>\
              <fill>0</fill>\
              <outline>0</outline>\
            </PolyStyle>\
            <IconStyle>\
              <color>dddddddd</color>\
              <scale>3</scale>\
              <heading>45</heading>\
              <Icon>\
                <href>test.png</href>\
              </Icon>\
              <hotSpot x="1"  y="2" xunits="pixels" yunits="pixels"/>\
            </IconStyle>\
            <LabelStyle>\
              <color>eeeeeeee</color>\
              <scale>4</scale>\
            </LabelStyle>\
        </Style>';

    var uberLineColor = Color.fromBytes(0xaa, 0xaa, 0xaa, 0xaa);
    var uberLineWidth = 2;

    var uberPolyColor = Color.fromBytes(0xcc, 0xcc, 0xcc, 0xcc);
    var uberPolyFill = false;
    var uberPolyOutline = false;

    var uberIconColor = Color.fromBytes(0xdd, 0xdd, 0xdd, 0xdd);
    var uberIconScale = 3;
    var uberIconHeading = CesiumMath.toRadians(-45);
    var uberIconHotspot = new Cartesian2(45, -42);

    var uberLabelColor = Color.fromBytes(0xee, 0xee, 0xee, 0xee);
    var uberLabelScale = 4;

    var options = {
        camera : {
            positionWC : new Cartesian3(0.0, 0.0, 0.0),
            directionWC : new Cartesian3(0.0, 0.0, 1.0),
            upWC : new Cartesian3(0.0, 1.0, 0.0),
            pitch : 0.0,
            heading : 0.0,
            frustum : {
                aspectRatio : 1.0,
                fov : CesiumMath.PI_OVER_FOUR
            },
            computeViewRectangle : function() {
                return Rectangle.MAX_VALUE;
            },
            pickEllipsoid : function() {
                return undefined;
            }
        },
        canvas : {
            clientWidth : 512,
            clientHeight : 512
        }
    };

    beforeEach(function() {
        // Reset camera - x value will change during onStop tests
        options.camera.positionWC.x = 0.0;
    });

    it('default constructor has expected values', function() {
        var dataSource = new KmlDataSource(options);
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.isLoading).toBe(false);
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.loadingEvent).toBeInstanceOf(Event);
        expect(dataSource.unsupportedNodeEvent).toBeInstanceOf(Event);
        expect(dataSource.show).toBe(true);
    });

    it('show sets underlying entity collection show.', function() {
        var dataSource = new KmlDataSource(options);

        dataSource.show = false;
        expect(dataSource.show).toBe(false);
        expect(dataSource.show).toEqual(dataSource.entities.show);

        dataSource.show = true;
        expect(dataSource.show).toBe(true);
        expect(dataSource.show).toEqual(dataSource.entities.show);
    });

    it('load throws with undefined KML', function() {
        var dataSource = new KmlDataSource(options);
        expect(function() {
            dataSource.load(undefined);
        }).toThrowDeveloperError();
    });

    it('load works with a KMZ file', function() {
        var dataSource = new KmlDataSource(options);
        return loadBlob('Data/KML/simple.kmz').then(function(blob) {
            return dataSource.load(blob);
        }).then(function(source) {
            expect(source).toBe(dataSource);
            expect(source.entities.values.length).toEqual(1);
        });
    });

    it('load rejects loading non-KMZ file', function() {
        var dataSource = new KmlDataSource(options);
        var spy = jasmine.createSpy('errorEvent');
        dataSource.errorEvent.addEventListener(spy);

        return loadBlob('Data/Images/Blue.png').then(function(blob) {
            return dataSource.load(blob);
        }).otherwise(function(e) {
            expect(e).toBeInstanceOf(RuntimeError);
            expect(spy).toHaveBeenCalled();
        });
    });

    it('load rejects KMZ file with no KML contained', function() {
        return loadBlob('Data/KML/empty.kmz').then(function(blob) {
            return KmlDataSource.load(blob, options);
        }).otherwise(function(e) {
            expect(e).toBeInstanceOf(RuntimeError);
            expect(e.message).toEqual('KMZ file does not contain a KML document.');
        });
    });

    it('load works with a KML URL', function() {
        var dataSource = new KmlDataSource(options);
        return dataSource.load('Data/KML/simple.kml', options).then(function(source) {
            expect(source).toBe(dataSource);
            expect(source.entities.values.length).toEqual(1);
        });
    });

    it('load works with a KMZ URL', function() {
        var dataSource = new KmlDataSource(options);
        return dataSource.load('Data/KML/simple.kmz').then(function(source) {
            expect(source).toBe(dataSource);
            expect(source.entities.values.length).toEqual(1);
        });
    });

    it('load rejects nonexistent URL', function() {
        return KmlDataSource.load('test.invalid', options).otherwise(function(e) {
            expect(e).toBeInstanceOf(RequestErrorEvent);
        });
    });

    it('load rejects loading non-KML URL', function() {
        return KmlDataSource.load('Data/Images/Blue.png', options).otherwise(function(e) {
            expect(e).toBeInstanceOf(RuntimeError);
        });
    });

    it('load rejects valid KMZ zip URL with no KML contained', function() {
        return KmlDataSource.load('Data/KML/empty.kmz', options).otherwise(function(e) {
            expect(e).toBeInstanceOf(RuntimeError);
            expect(e.message).toEqual('KMZ file does not contain a KML document.');
        });
    });

    it('sets DataSource name from Document', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document>\
            <name>NameInKml</name>\
            </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), {
            camera : options.camera,
            canvas : options. canvas,
            sourceUri : 'NameFromUri.kml'
        }).then(function(dataSource) {
            expect(dataSource.name).toEqual('NameInKml', options);
        });
    });

    it('sets DataSource name from Document with KML element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml>\
            <Document>\
            <name>NameInKml</name>\
            </Document>\
            </kml>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), {
            camera : options.camera,
            canvas : options. canvas,
            sourceUri : 'NameFromUri.kml'
        }).then(function(dataSource) {
            expect(dataSource.name).toEqual('NameInKml', options);
        });
    });

    it('sets DataSource name from sourceUri when not in file', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document>\
            </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), {
            camera : options.camera,
            canvas : options.canvas,
            sourceUri : 'NameFromUri.kml'
        }).then(function(dataSource) {
            expect(dataSource.name).toEqual('NameFromUri.kml');
        });
    });

    it('raises changed event when the name changes', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document>\
            <name>NameInKml</name>\
            </Document>';

        var dataSource = new KmlDataSource(options);

        var spy = jasmine.createSpy('changedEvent');
        dataSource.changedEvent.addEventListener(spy);

        return dataSource.load(parser.parseFromString(kml, "text/xml")).then(function() {
            //Initial load
            expect(spy).toHaveBeenCalledWith(dataSource);

            spy.calls.reset();
            return dataSource.load(parser.parseFromString(kml, "text/xml")).then(function() {
                //Loading KML with same name
                expect(spy).not.toHaveBeenCalled();

                kml = kml.replace('NameInKml', 'newName');
                spy.calls.reset();
                return dataSource.load(parser.parseFromString(kml, "text/xml")).then(function() {
                    //Loading KML with different name.
                    expect(spy).toHaveBeenCalledWith(dataSource);
                });
            });
        });
    });

    it('raises loadingEvent event at start and end of load', function() {
        var dataSource = new KmlDataSource(options);

        var spy = jasmine.createSpy('loadingEvent');
        dataSource.loadingEvent.addEventListener(spy);

        var promise = dataSource.load('Data/KML/simple.kml');
        expect(spy).toHaveBeenCalledWith(dataSource, true);
        spy.calls.reset();

        return promise.then(function() {
            expect(spy).toHaveBeenCalledWith(dataSource, false);
        });
    });

    it('raises unsupportedNodeEvent event when parsing an unsupported kml node type', function() {
        var dataSource = new KmlDataSource(options);
        var spy = jasmine.createSpy('unsupportedNodeEvent');
        dataSource.unsupportedNodeEvent.addEventListener(spy);

        return dataSource.load('Data/KML/unsupported.kml').then(function() {
            var nodeNames = ['PhotoOverlay', 'ScreenOverlay', 'Tour'];
            expect(spy.calls.count()).toEqual(3);
            for (var i = 0; i < nodeNames.length; i++) {
                var args = spy.calls.argsFor(i);
                expect(args.length).toEqual(7);
                expect(args[0]).toBe(dataSource);
                expect(args[2].localName).toEqual(nodeNames[i]);
                expect(args[3]).toBeInstanceOf(EntityCollection);
                expect(args[4]).toBeInstanceOf(EntityCollection);
            }
        });
    });

    it('sets DatasourceClock based on feature availability', function() {
        var beginDate = JulianDate.fromIso8601('2000-01-01');
        var endDate = JulianDate.fromIso8601('2000-01-04');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <GroundOverlay>\
            <TimeSpan>\
              <begin>2000-01-01</begin>\
              <end>2000-01-03</end>\
            </TimeSpan>\
          </GroundOverlay>\
          <Placemark>\
            <gx:Track>\
              <when>2000-01-02</when>\
              <gx:coord>1 2 3</gx:coord>\
              <when>2000-01-04</when>\
              <gx:coord>4 5 6</gx:coord>\
            </gx:Track>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var clock = dataSource.clock;
            expect(dataSource.clock).toBeDefined();
            expect(clock.startTime).toEqual(beginDate);
            expect(clock.stopTime).toEqual(endDate);
            expect(clock.currentTime).toEqual(beginDate);
            expect(clock.clockRange).toEqual(ClockRange.LOOP_STOP);
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
            expect(clock.multiplier).toEqual(JulianDate.secondsDifference(endDate, beginDate) / 60);
            return dataSource;
        }).then(function(dataSource) {
            //Loading a static data set should clear the clock.
            kml = '<?xml version="1.0" encoding="UTF-8"?>\
                <Document xmlns="http://www.opengis.net/kml/2.2"\
                          xmlns:gx="http://www.google.com/kml/ext/2.2">\
                  <GroundOverlay>\
                  </GroundOverlay>\
                </Document>';

            return dataSource.load(parser.parseFromString(kml, "text/xml"), options);
        }).then(function(dataSource) {
            expect(dataSource.clock).toBeUndefined();
        });
    });

    it('Feature: id', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark id="Bob">\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.id).toBe('Bob');
        });
    });

    it('Feature: name', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <name>bob</name>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.name).toBe('bob');
            expect(entity.label).toBeDefined();
            expect(entity.label.text.getValue()).toBe('bob');
        });
    });

    it('Feature: address', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <address>1826 South 16th Street</address>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.kml.address).toBe('1826 South 16th Street');
        });
    });

    it('Feature: phoneNumber', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <phoneNumber>555-555-5555</phoneNumber>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.kml.phoneNumber).toBe('555-555-5555');
        });
    });

    it('Feature: Snippet', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <Snippet>Hey!</Snippet>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.kml.snippet).toBe('Hey!');
        });
    });

    it('Feature: atom:author', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark xmlns="http://www.opengis.net/kml/2.2"\
            xmlns:atom="http://www.w3.org/2005/Atom">\
            <atom:author>\
                <atom:name>J.R.R. Tolkien</atom:name>\
                <atom:email>gandalf@greyhavens.invalid</atom:email>\
                <atom:uri>http://greyhavens.invalid</atom:uri>\
            </atom:author>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.kml).toBeDefined();
            expect(entity.kml.author).toBeDefined();
            expect(entity.kml.author.name).toBe('J.R.R. Tolkien');
            expect(entity.kml.author.email).toBe('gandalf@greyhavens.invalid');
            expect(entity.kml.author.uri).toBe('http://greyhavens.invalid');
        });
    });

    it('Feature: atom:link', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                   xmlns:atom="http://www.w3.org/2005/Atom">\
            <atom:link\
                href="http://test.invalid"\
                hreflang="en-US"\
                rel="alternate"\
                type="text/plain"\
                title="Invalid!"\
                length="123"/>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.kml).toBeDefined();
            expect(entity.kml.link).toBeDefined();
            expect(entity.kml.link.href).toEqual('http://test.invalid');
            expect(entity.kml.link.hreflang).toEqual('en-US');
            expect(entity.kml.link.rel).toEqual('alternate');
            expect(entity.kml.link.type).toEqual('text/plain');
            expect(entity.kml.link.title).toEqual('Invalid!');
            expect(entity.kml.link.length).toEqual('123');
        });
    });

    it('Feature: TimeSpan with begin and end', function() {
        var endDate = JulianDate.fromIso8601('1945-08-06');
        var beginDate = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <begin>1945-08-06</begin>\
              <end>1941-12-07</end>\
            </TimeSpan>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeDefined();
            expect(entity.availability.start).toEqual(beginDate);
            expect(entity.availability.stop).toEqual(endDate);
        });
    });

    it('Feature: TimeSpan flips dates when end is earlier', function() {
        var endDate = JulianDate.fromIso8601('1945-08-06');
        var beginDate = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <begin>1941-12-07</begin>\
              <end>1945-08-06</end>\
            </TimeSpan>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeDefined();
            expect(entity.availability.start).toEqual(beginDate);
            expect(entity.availability.stop).toEqual(endDate);
        });
    });

    it('Feature: TimeSpan gracefully handles empty fields', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
            </TimeSpan>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeUndefined();
        });
    });

    it('Feature: TimeSpan works with end only interval', function() {
        var date = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <end>1941-12-07</end>\
            </TimeSpan>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeDefined();
            expect(entity.availability.start).toEqual(Iso8601.MINIMUM_VALUE);
            expect(entity.availability.stop).toEqual(date);
        });
    });

    it('Feature: TimeSpan works with begin only interval', function() {
        var date = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <begin>1941-12-07</begin>\
            </TimeSpan>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeDefined();
            expect(entity.availability.start).toEqual(date);
            expect(entity.availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
        });
    });

    it('Feature: TimeStamp works', function() {
        var date = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeStamp>\
              <when>1941-12-07</when>\
            </TimeStamp>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeDefined();
            expect(entity.availability.start).toEqual(date);
            expect(entity.availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
        });
    });

    it('Feature: visibility works', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <visibility>0</visibility>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.show).toBe(false);
        });
    });

    it('Feature: TimeStamp gracefully handles empty fields', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeStamp>\
            </TimeStamp>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeUndefined();
        });
    });

    it('Feature: TimeStamp gracefully handles empty when field', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeStamp>\
              <when></when>\
            </TimeStamp>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.availability).toBeUndefined();
        });
    });

    it('Feature: ExtendedData <Data> schema', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <ExtendedData>\
                <Data name="prop1">\
                    <displayName>Property 1</displayName>\
                    <value>1</value>\
                </Data>\
                <Data name="prop2">\
                    <value>2</value>\
                </Data>\
                <Data name="prop3">\
                    <displayName>Property 3</displayName>\
                </Data>\
            </ExtendedData>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.kml.extendedData).toBeDefined();

            expect(entity.kml.extendedData.prop1).toBeDefined();
            expect(entity.kml.extendedData.prop1.displayName).toEqual('Property 1');
            expect(entity.kml.extendedData.prop1.value).toEqual('1');

            expect(entity.kml.extendedData.prop2).toBeDefined();
            expect(entity.kml.extendedData.prop2.displayName).toBeUndefined();
            expect(entity.kml.extendedData.prop2.value).toEqual('2');

            expect(entity.kml.extendedData.prop3).toBeDefined();
            expect(entity.kml.extendedData.prop3.displayName).toEqual('Property 3');
            expect(entity.kml.extendedData.prop3.value).toBeUndefined();
        });
    });

    it('GroundOverlay: Sets defaults', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.name).toBeUndefined();
            expect(entity.availability).toBeUndefined();
            expect(entity.description).toBeUndefined();
            expect(entity.rectangle).toBeDefined();
            expect(entity.rectangle.height).toBeUndefined();
            expect(entity.rectangle.rotation).toBeUndefined();
            expect(entity.rectangle.coordinates).toBeUndefined();
            expect(entity.rectangle.material).toBeUndefined();
        });
    });

    it('GroundOverlay: Sets rectangle image material', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
            </Icon>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.rectangle.material).toBeInstanceOf(ImageMaterialProperty);
            expect(entity.rectangle.material.image.getValue()).toEqual('http://test.invalid/image.png');
        });
    });

    it('GroundOverlay: Sets rectangle image material', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <color>7F0000FF</color>\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
            </Icon>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.rectangle.material).toBeInstanceOf(ImageMaterialProperty);
            expect(entity.rectangle.material.image.getValue()).toEqual('http://test.invalid/image.png');
            expect(entity.rectangle.material.color.getValue()).toEqual(new Color(1.0, 0.0, 0.0, 127/255));
        });
    });

    it('GroundOverlay: Sets rectangle color material', function() {
        var color = Color.fromBytes(0xcc, 0xdd, 0xee, 0xff);
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <color>ffeeddcc</color>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.rectangle.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.rectangle.material.color.getValue()).toEqual(color);
        });
    });

    it('GroundOverlay: Sets rectangle coordinates and rotation', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <LatLonBox>\
                <west>3</west>\
                <south>1</south>\
                <east>4</east>\
                <north>2</north>\
                <rotation>45</rotation>\
            </LatLonBox>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon).toBeUndefined();
            expect(entity.rectangle.coordinates.getValue()).toEqualEpsilon(Rectangle.fromDegrees(3, 1, 4, 2), CesiumMath.EPSILON14);
            expect(entity.rectangle.rotation.getValue()).toEqual(Math.PI / 4);
        });
    });

    it('GroundOverlay: Handles wrapping longitude.', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <LatLonBox>\
                <west>-180</west>\
                <south>-90</south>\
                <east>180</east>\
                <north>90</north>\
            </LatLonBox>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon).toBeUndefined();
            expect(entity.rectangle.coordinates.getValue()).toEqual(Rectangle.fromDegrees(-180, -90, 180, 90));
        });
    });

    it('GroundOverlay: Handles out-of-range latitudes.', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <LatLonBox>\
                <west>-180</west>\
                <south>-100</south>\
                <east>180</east>\
                <north>100</north>\
            </LatLonBox>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon).toBeUndefined();
            expect(entity.rectangle.coordinates.getValue()).toEqual(Rectangle.fromDegrees(-180, -90, 180, 90));
        });
    });

    it('GroundOverlay: Sets polygon coordinates for gx:LatLonQuad', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <gx:LatLonQuad>\
                <coordinates>\
                1,2 3,4 5,6 7,8\
                </coordinates>\
            </gx:LatLonQuad>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.rectangle).toBeUndefined();
            expect(entity.polygon.hierarchy.getValue().positions).toEqualEpsilon(Cartesian3.fromDegreesArray([1, 2, 3, 4, 5, 6, 7, 8]), CesiumMath.EPSILON14);
        });
    });

    it('GroundOverlay: Sets polygon image for gx:LatLonQuad', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
            </Icon>\
            <gx:LatLonQuad>\
                <coordinates>\
                1,2 3,4 5,6 7,8\
                </coordinates>\
            </gx:LatLonQuad>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.material).toBeInstanceOf(ImageMaterialProperty);
            expect(entity.polygon.material.image.getValue()).toEqual('http://test.invalid/image.png');
        });
    });

    it('GroundOverlay: Sets rectangle absolute height', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <altitudeMode>absolute</altitudeMode>\
            <altitude>23</altitude>\
        </GroundOverlay>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.rectangle.height.getValue()).toEqual(23);
        });
    });

    it('Styles: supports local styles with styleUrl', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].billboard.scale.getValue()).toEqual(3.0);
        });
    });

    it('Styles: supports local styles with styleUrl missing #', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>testStyle</styleUrl>\
            </Placemark>\
            </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].billboard.scale.getValue()).toEqual(3.0);
        });
    });

    it('Styles: supports external styles with styleUrl', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <styleUrl>Data/KML/externalStyle.kml#testStyle</styleUrl>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].billboard.scale.getValue()).toEqual(3.0);
        });
    });

    it('Styles: supports external style maps with styleUrl', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <styleUrl>Data/KML/externalStyle.kml#testStyleMap</styleUrl>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].billboard.scale.getValue()).toEqual(3.0);
        });
    });

    it('Styles: inline styles take precedance over shared styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
                  <Icon>\
                    <href>http://test.invalid</href>\
                  </Icon>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>#testStyle</styleUrl>\
              <Style>\
                <IconStyle>\
                  <scale>2</scale>\
                  <heading>4</heading>\
                </IconStyle>\
              </Style>\
            </Placemark>\
            </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var billboard = entities[0].billboard;
            expect(billboard.scale.getValue()).toEqual(2.0);
            expect(billboard.rotation.getValue()).toEqual(CesiumMath.toRadians(-4.0));
            expect(billboard.image.getValue()).toEqual('http://test.invalid');
        });
    });

    it('Styles: colorMode random', function() {
        CesiumMath.setRandomNumberSeed(0);

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <Style>\
                  <IconStyle>\
                      <color>ccffffff</color>\
                      <colorMode>random</colorMode>\
                  </IconStyle>\
              </Style>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var generatedColor = dataSource.entities.values[0].billboard.color.getValue();
            expect(generatedColor.red).toBeLessThan(1.0);
            expect(generatedColor.green).toBeLessThan(1.0);
            expect(generatedColor.blue).toBeLessThan(1.0);
            expect(generatedColor.alpha).toEqual(0.8);
        });
    });

    it('Styles: colorMode random black', function() {
        CesiumMath.setRandomNumberSeed(0);

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <Style>\
                  <IconStyle>\
                      <color>cc000000</color>\
                      <colorMode>random</colorMode>\
                  </IconStyle>\
              </Style>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var generatedColor = dataSource.entities.values[0].billboard.color.getValue();
            expect(generatedColor.red).toEqual(0);
            expect(generatedColor.green).toEqual(0);
            expect(generatedColor.blue).toEqual(0);
            expect(generatedColor.alpha).toEqual(0.8);
        });
    });

    it('Styles: Applies expected styles to Point geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <Point>\
              <altitudeMode>absolute</altitudeMode>\
              <coordinates>1,2,3</coordinates>\
            </Point>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.label).toBeDefined();
            expect(entity.label.text.getValue()).toEqual('TheName');
            expect(entity.label.fillColor.getValue()).toEqual(uberLabelColor);
            expect(entity.label.scale.getValue()).toEqual(uberLabelScale);

            expect(entity.billboard.color.getValue()).toEqual(uberIconColor);
            expect(entity.billboard.scale.getValue()).toEqual(uberIconScale);
            expect(entity.billboard.rotation.getValue()).toEqual(uberIconHeading);
            expect(entity.billboard.image.getValue()).toEqual('test.png');
            expect(entity.billboard.pixelOffset.getValue()).toEqual(uberIconHotspot);

            expect(entity.polyline).toBeUndefined();
        });
    });

    it('Styles: Applies expected styles to extruded Point geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <Point>\
              <extrude>1</extrude>\
              <altitudeMode>absolute</altitudeMode>\
              <coordinates>1,2,3</coordinates>\
            </Point>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.label.text.getValue()).toEqual('TheName');
            expect(entity.label.fillColor.getValue()).toEqual(uberLabelColor);
            expect(entity.label.scale.getValue()).toEqual(uberLabelScale);

            expect(entity.billboard.color.getValue()).toEqual(uberIconColor);
            expect(entity.billboard.scale.getValue()).toEqual(uberIconScale);
            expect(entity.billboard.rotation.getValue()).toEqual(uberIconHeading);
            expect(entity.billboard.image.getValue()).toEqual('test.png');
            expect(entity.billboard.pixelOffset.getValue()).toEqual(uberIconHotspot);

            expect(entity.polyline.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.polyline.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.polyline.width.getValue()).toEqual(uberLineWidth);
        });
    });

    it('Styles: Applies expected styles to LineString geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <LineString>\
            <coordinates>1,2,3 \
                         4,5,6 \
            </coordinates>\
            </LineString>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polyline.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.polyline.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.polyline.width.getValue()).toEqual(uberLineWidth);

            expect(entity.label).toBeUndefined();
            expect(entity.wall).toBeUndefined();
        });
    });

    it('Styles: Applies expected styles to extruded LineString geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <LineString>\
            <extrude>1</extrude>\
            <altitudeMode>absolute</altitudeMode>\
            <coordinates>1,2,3 \
                         4,5,6 \
            </coordinates>\
            </LineString>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.wall.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.wall.material.color.getValue()).toEqual(uberPolyColor);
            expect(entity.wall.fill.getValue()).toEqual(uberPolyFill);
            expect(entity.wall.outline.getValue()).toEqual(uberPolyOutline);
            expect(entity.wall.outlineColor.getValue()).toEqual(uberLineColor);
            expect(entity.wall.outlineWidth.getValue()).toEqual(uberLineWidth);

            expect(entity.polyline).toBeUndefined();
            expect(entity.label).toBeUndefined();
        });
    });

    it('Styles: Applies expected styles to Polygon geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
          <Polygon>\
            <extrude>1</extrude>\
            <altitudeMode>absolute</altitudeMode>\
              <outerBoundaryIs>\
                <LinearRing>\
                  <coordinates>\
                    1,2,3\
                    4,5,6\
                    7,8,9\
                   </coordinates>\
                </LinearRing>\
              </outerBoundaryIs>\
            </Polygon>\
            </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.polygon.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.polygon.material.color.getValue()).toEqual(uberPolyColor);
            expect(entity.polygon.fill.getValue()).toEqual(uberPolyFill);
            expect(entity.polygon.outline.getValue()).toEqual(uberPolyOutline);
            expect(entity.polygon.outlineColor.getValue()).toEqual(uberLineColor);
            expect(entity.polygon.outlineWidth.getValue()).toEqual(uberLineWidth);

            expect(entity.label).toBeUndefined();
        });
    });

    it('Styles: Applies expected styles to gx:Track geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <gx:Track>\
              <altitudeMode>absolute</altitudeMode>\
              <when>2000-01-01T00:00:02Z</when>\
            <gx:coord>7 8 9</gx:coord>\
          </gx:Track>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.label).toBeDefined();
            expect(entity.label.text.getValue()).toEqual('TheName');
            expect(entity.label.fillColor.getValue()).toEqual(uberLabelColor);
            expect(entity.label.scale.getValue()).toEqual(uberLabelScale);

            expect(entity.billboard.color.getValue()).toEqual(uberIconColor);
            expect(entity.billboard.scale.getValue()).toEqual(uberIconScale);
            expect(entity.billboard.rotation.getValue()).toEqual(uberIconHeading);
            expect(entity.billboard.image.getValue()).toEqual('test.png');
            expect(entity.billboard.pixelOffset.getValue()).toEqual(uberIconHotspot);

            expect(entity.path).toBeDefined();
            expect(entity.path.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.path.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.path.width.getValue()).toEqual(uberLineWidth);
            expect(entity.path.leadTime.getValue()).toEqual(0);
            expect(entity.path.trailTime).toBeUndefined();

            expect(entity.polyline).toBeUndefined();
        });
    });

    it('Styles: Applies expected styles to extruded gx:Track geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <gx:Track>\
              <extrude>1</extrude>\
              <altitudeMode>absolute</altitudeMode>\
              <when>2000-01-01T00:00:02Z</when>\
              <gx:coord>7 8 9</gx:coord>\
            </gx:Track>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.label.text.getValue()).toEqual('TheName');
            expect(entity.label.fillColor.getValue()).toEqual(uberLabelColor);
            expect(entity.label.scale.getValue()).toEqual(uberLabelScale);

            expect(entity.billboard.color.getValue()).toEqual(uberIconColor);
            expect(entity.billboard.scale.getValue()).toEqual(uberIconScale);
            expect(entity.billboard.rotation.getValue()).toEqual(uberIconHeading);
            expect(entity.billboard.image.getValue()).toEqual('test.png');
            expect(entity.billboard.pixelOffset.getValue()).toEqual(uberIconHotspot);

            expect(entity.path).toBeDefined();
            expect(entity.path.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.path.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.path.width.getValue()).toEqual(uberLineWidth);
            expect(entity.path.leadTime.getValue()).toEqual(0);
            expect(entity.path.trailTime).toBeUndefined();

            expect(entity.polyline.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.polyline.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.polyline.width.getValue()).toEqual(uberLineWidth);
        });
    });

    it('Styles: Applies expected styles to gx:MultiTrack geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <gx:MultiTrack>\
              <gx:Track>\
                <altitudeMode>absolute</altitudeMode>\
                <when>2000-01-01T00:00:02Z</when>\
              <gx:coord>7 8 9</gx:coord>\
              </gx:Track>\
            </gx:MultiTrack>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.label).toBeDefined();
            expect(entity.label.text.getValue()).toEqual('TheName');
            expect(entity.label.fillColor.getValue()).toEqual(uberLabelColor);
            expect(entity.label.scale.getValue()).toEqual(uberLabelScale);

            expect(entity.billboard.color.getValue()).toEqual(uberIconColor);
            expect(entity.billboard.scale.getValue()).toEqual(uberIconScale);
            expect(entity.billboard.rotation.getValue()).toEqual(uberIconHeading);
            expect(entity.billboard.image.getValue()).toEqual('test.png');
            expect(entity.billboard.pixelOffset.getValue()).toEqual(uberIconHotspot);

            expect(entity.path).toBeDefined();
            expect(entity.path.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.path.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.path.width.getValue()).toEqual(uberLineWidth);
            expect(entity.path.leadTime.getValue()).toEqual(0);
            expect(entity.path.trailTime).toBeUndefined();

            expect(entity.polyline).toBeUndefined();
        });
    });

    it('Styles: Applies expected styles to extruded gx:MultiTrack geometry', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>' + uberStyle + '\
            <name>TheName</name>\
            <gx:MultiTrack>\
              <gx:Track>\
                <extrude>1</extrude>\
                <altitudeMode>absolute</altitudeMode>\
                <when>2000-01-01T00:00:02Z</when>\
                <gx:coord>7 8 9</gx:coord>\
              </gx:Track>\
            </gx:MultiTrack>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            expect(entity.label.text.getValue()).toEqual('TheName');
            expect(entity.label.fillColor.getValue()).toEqual(uberLabelColor);
            expect(entity.label.scale.getValue()).toEqual(uberLabelScale);

            expect(entity.billboard.color.getValue()).toEqual(uberIconColor);
            expect(entity.billboard.scale.getValue()).toEqual(uberIconScale);
            expect(entity.billboard.rotation.getValue()).toEqual(uberIconHeading);
            expect(entity.billboard.image.getValue()).toEqual('test.png');
            expect(entity.billboard.pixelOffset.getValue()).toEqual(uberIconHotspot);

            expect(entity.path).toBeDefined();
            expect(entity.path.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.path.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.path.width.getValue()).toEqual(uberLineWidth);
            expect(entity.path.leadTime.getValue()).toEqual(0);
            expect(entity.path.trailTime).toBeUndefined();

            expect(entity.polyline.material).toBeInstanceOf(ColorMaterialProperty);
            expect(entity.polyline.material.color.getValue()).toEqual(uberLineColor);
            expect(entity.polyline.width.getValue()).toEqual(uberLineWidth);
        });
    });

    it('Styles: Applies local StyleMap', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2">\
          <Placemark>\
            <StyleMap>\
              <Pair>\
                <key>normal</key>\
                <Style>\
                  <IconStyle>\
                    <scale>2</scale>\
                  </IconStyle>\
                </Style>\
              </Pair>\
            </StyleMap>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.billboard.scale.getValue()).toBe(2.0);
        });
    });

    it('Styles: Applies normal styleUrl StyleMap', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2">\
          <StyleMap id="styleMapExample">\
            <Pair>\
              <key>normal</key>\
              <Style>\
                <IconStyle>\
                  <scale>2</scale>\
                </IconStyle>\
              </Style>\
            </Pair>\
          </StyleMap>\
          <Placemark>\
            <styleUrl>#styleMapExample</styleUrl>\
          </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.billboard.scale.getValue()).toBe(2.0);
        });
    });

    it('Styles: Applies normal StyleMap containing styleUrl', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2">\
          <Style id="normalStyle">\
            <IconStyle>\
              <scale>2</scale>\
            </IconStyle>\
          </Style>\
          <StyleMap id="styleMapExample">\
            <Pair>\
              <key>normal</key>\
              <styleUrl>#normalStyle</styleUrl>\
            </Pair>\
          </StyleMap>\
          <Placemark>\
            <styleUrl>#styleMapExample</styleUrl>\
            </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.billboard.scale.getValue()).toBe(2.0);
        });
    });

    it('Styles: Applies normal StyleMap containing styleUrl without #', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2">\
          <Style id="normalStyle">\
            <IconStyle>\
              <scale>2</scale>\
            </IconStyle>\
          </Style>\
          <StyleMap id="styleMapExample">\
            <Pair>\
              <key>normal</key>\
              <styleUrl>normalStyle</styleUrl>\
            </Pair>\
          </StyleMap>\
          <Placemark>\
            <styleUrl>#styleMapExample</styleUrl>\
            </Placemark>\
        </Document>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.billboard.scale.getValue()).toBe(2.0);
        });
    });

    it('IconStyle: handles empty element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <IconStyle>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].billboard).toBeDefined();
        });
    });

    it('IconStyle: Sets billboard image absolute path', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
              <Style>\
                  <IconStyle>\
                      <Icon>\
                          <href>http://test.invalid/image.png</href>\
                      </Icon>\
                  </IconStyle>\
              </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var billboard = entities[0].billboard;
            expect(billboard.image.getValue()).toEqual('http://test.invalid/image.png');
        });
    });

    it('IconStyle: Sets billboard with root:// Url', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
              <Style>\
                  <IconStyle>\
                      <Icon>\
                          <href>root://icons/palette-3</href>\
                      </Icon>\
                  </IconStyle>\
              </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var billboard = entities[0].billboard;
            expect(billboard.image.getValue()).toEqual('https://maps.google.com/mapfiles/kml/pal3/icon56.png');
        });
    });

    it('IconStyle: Sets billboard image relative path', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
              <Style>\
                  <IconStyle>\
                      <Icon>\
                          <href>image.png</href>\
                      </Icon>\
                  </IconStyle>\
              </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), {
            camera : options.camera,
            canvas : options.canvas,
            sourceUri : 'http://test.invalid'
        }).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var billboard = entities[0].billboard;
            expect(billboard.image.getValue()).toEqual('http://test.invalid/image.png');
        });
    });

    it('IconStyle: Sets billboard image inside KMZ', function() {
        return KmlDataSource.load('Data/KML/simple.kmz', options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var billboard = entities[0].billboard;
            expect(billboard.image.getValue()).toEqual(image);
        });
    });

    it('IconStyle: Sets billboard image with proxy', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
              <Style>\
                  <IconStyle>\
                      <Icon>\
                          <href>image.png</href>\
                      </Icon>\
                  </IconStyle>\
              </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), {
            camera : options.camera,
            canvas : options.canvas,
            sourceUri : 'http://test.invalid',
            proxy : new DefaultProxy('/proxy/')
        }).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var billboard = entities[0].billboard;
            expect(billboard.image.getValue()).toEqual(dataSource._proxy.getURL('http://test.invalid/image.png'));
        });
    });

    it('IconStyle: Sets billboard image with subregion', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Style>\
              <IconStyle>\
                <Icon>\
                  <href>whiteShapes.png</href>\
                  <gx:x>49</gx:x>\
                  <gx:y>43</gx:y>\
                  <gx:w>18</gx:w>\
                  <gx:h>18</gx:h>\
                </Icon>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var billboard = dataSource.entities.values[0].billboard;
            expect(billboard.image.getValue()).toEqual('whiteShapes.png');
            expect(billboard.imageSubRegion.getValue()).toEqual(new BoundingRectangle(49, 43, 18, 18));
        });
    });

    it('IconStyle: Sets billboard image with hotSpot fractions', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
                  <Placemark>\
                    <Style>\
                      <IconStyle>\
                        <hotSpot x="0.25"  y="0.75" xunits="fraction" yunits="fraction"/>\
                      </IconStyle>\
                    </Style>\
                  </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var billboard = dataSource.entities.values[0].billboard;
            expect(billboard.pixelOffset.getValue()).toEqual(new Cartesian2(8, 8));
        });
    });

    it('IconStyle: Sets billboard image with hotSpot pixels', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
                  <Placemark>\
                    <Style>\
                      <IconStyle>\
                        <hotSpot x="1"  y="2" xunits="pixels" yunits="pixels"/>\
                      </IconStyle>\
                    </Style>\
                  </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var billboard = dataSource.entities.values[0].billboard;
            expect(billboard.pixelOffset.getValue()).toEqual(new Cartesian2(15, -14));
        });
    });

    it('IconStyle: Sets billboard image with hotSpot insetPixels', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
                  <Placemark>\
                    <Style>\
                      <IconStyle>\
                        <hotSpot x="1"  y="2" xunits="insetPixels" yunits="insetPixels"/>\
                      </IconStyle>\
                    </Style>\
                  </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var billboard = dataSource.entities.values[0].billboard;
            expect(billboard.pixelOffset.getValue()).toEqual(new Cartesian2(-15, 14));
        });
    });

    it('IconStyle: Sets color', function() {
        var color = Color.fromBytes(0xcc, 0xdd, 0xee, 0xff);
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <IconStyle>\
                <color>ffeeddcc</color>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].billboard.color.getValue()).toEqual(color);
        });
    });

    it('IconStyle: Sets scale', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <Style>\
              <IconStyle>\
                <scale>2.2</scale>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].billboard.scale.getValue()).toEqual(2.2);
        });
    });

    it('IconStyle: Sets heading', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <Style>\
              <IconStyle>\
                <heading>4</heading>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].billboard.rotation.getValue()).toEqual(CesiumMath.toRadians(-4));
            expect(entities[0].billboard.alignedAxis.getValue()).toEqual(Cartesian3.UNIT_Z);
        });
    });

    it('BalloonStyle: specify all properties', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark id="The ID">\
            <Style>\
            <BalloonStyle>\
                <bgColor>00224466</bgColor>\
                <textColor>66442200</textColor>\
                <text>$[name] $[description] $[address] $[Snippet] $[id] $[prop1/displayName] $[prop1] $[prop2/displayName] $[prop2]</text>\
            </BalloonStyle>\
            </Style>\
            <name>The Name</name>\
            <description>The Description</description>\
            <address>The Address</address>\
            <Snippet>The Snippet</Snippet>\
            <ExtendedData>\
            <Data name="prop1">\
                <displayName>The Property</displayName>\
                <value>The Value</value>\
            </Data>\
            </ExtendedData>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var div = element.firstChild;
            expect(div.style['word-wrap']).toEqual('break-word');
            expect(div.style['background-color']).toEqual('rgba(102, 68, 34, 0)');
            expect(div.style.color).toEqual('rgba(0, 34, 68, 0.4)');
            expect(div.textContent).toEqual('The Name The Description The Address The Snippet The ID The Property The Value $[prop2/displayName] $[prop2]');
        });
    });

    it('BalloonStyle: entity replacement removes missing values', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <Style>\
            <BalloonStyle>\
                <text>$[name] $[description] $[address] $[Snippet]</text>\
            </BalloonStyle>\
            </Style>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var div = element.firstChild;
            expect(div.textContent).toEqual('   ');
        });
    });

    it('BalloonStyle: description without BalloonStyle', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <description>The Description</description>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var div = element.firstChild;
            expect(div.style['word-wrap']).toEqual('break-word');
            expect(div.style['background-color']).toEqual('rgb(255, 255, 255)');
            expect(div.style.color).toEqual('rgb(0, 0, 0)');
            expect(div.textContent).toEqual('The Description');
        });
    });

    it('BalloonStyle: creates table from ExtendedData', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
                <ExtendedData>\
                    <Data name="prop1">\
                        <displayName>Property 1</displayName>\
                        <value>1</value>\
                    </Data>\
                    <Data name="prop2">\
                        <value>2</value>\
                    </Data>\
                    <Data name="prop3">\
                        <displayName>Property 3</displayName>\
                    </Data>\
                </ExtendedData>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var div = element.firstChild;
            expect(div.style['word-wrap']).toEqual('break-word');
            expect(div.style['background-color']).toEqual('rgb(255, 255, 255)');
            expect(div.style.color).toEqual('rgb(0, 0, 0)');

            var table = div.firstChild;
            expect(table.localName).toEqual('table');

            expect(table.rows.length).toBe(3);
            expect(table.rows[0].cells.length).toEqual(2);
            expect(table.rows[1].cells.length).toEqual(2);
            expect(table.rows[2].cells.length).toEqual(2);

            expect(table.rows[0].cells[0].textContent).toEqual('Property 1');
            expect(table.rows[1].cells[0].textContent).toEqual('prop2');
            expect(table.rows[2].cells[0].textContent).toEqual('Property 3');

            expect(table.rows[0].cells[1].textContent).toEqual('1');
            expect(table.rows[1].cells[1].textContent).toEqual('2');
            expect(table.rows[2].cells[1].textContent).toEqual('');
        });
    });

    it('BalloonStyle: does not create a description for empty ExtendedData', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
                <ExtendedData>\
                </ExtendedData>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.description).toBeUndefined();
        });
    });

    it('BalloonStyle: description creates links from text', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <description>http://cesiumjs.org</description>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var a = element.firstChild.firstChild;
            expect(a.localName).toEqual('a');
            expect(a.getAttribute('href')).toEqual('http://cesiumjs.org');
            expect(a.getAttribute('target')).toEqual('_blank');
        });
    });

    it('BalloonStyle: description retargets existing links to _blank', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <description><![CDATA[<a href="http://cesiumjs.org" target="_self">Homepage</a>]]></description>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var a = element.firstChild.firstChild;
            expect(a.localName).toEqual('a');
            expect(a.textContent).toEqual('Homepage');
            expect(a.getAttribute('href')).toEqual('http://cesiumjs.org');
            expect(a.getAttribute('target')).toEqual('_blank');
        });
    });

    it('BalloonStyle: description does not create links from non-explicit urls', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <description>states.id google.com</description>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];

            var element = document.createElement('div');
            element.innerHTML = entity.description.getValue();

            var div = element.firstChild;
            expect(div.innerHTML).toEqual('states.id google.com');
        });
    });

    it('BalloonStyle: description is rewritten for embedded kmz links and images', function() {
        return KmlDataSource.load('Data/KML/simple.kmz', options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            var description = entity.description.getValue();
            var div = document.createElement('div');
            div.innerHTML = description;

            expect(div.textContent).toEqual('image.png image.png');
            var children = div.firstChild.querySelectorAll('*');
            expect(children.length).toEqual(2);

            var link = children[0];
            expect(link.localName).toEqual('a');
            expect(link.getAttribute('href')).toEqual(image);
            expect(link.getAttribute('download')).toEqual('image.png');

            var img = children[1];
            expect(img.localName).toEqual('img');
            expect(img.src).toEqual(image);
        });
    });

    it('LabelStyle: Sets defaults', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <LabelStyle>\
              </LabelStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var label = entities[0].label;
            expect(label).toBeDefined();

            expect(label.text).toBeUndefined();
            expect(label.fillColor).toBeUndefined();
            expect(label.outlineColor).toBeUndefined();
            expect(label.outlineWidth).toBeUndefined();
            expect(label.show).toBeUndefined();
            expect(label.scale).toBeUndefined();
            expect(label.verticalOrigin).toBeUndefined();
            expect(label.eyeOffset).toBeUndefined();
            expect(label.pixelOffsetScaleByDistance).toBeUndefined();

            expect(label.text).toBeUndefined();
            expect(label.fillColor).toBeUndefined();
            expect(label.outlineColor).toBeUndefined();
            expect(label.outlineWidth).toBeUndefined();
            expect(label.show).toBeUndefined();
            expect(label.scale).toBeUndefined();
            expect(label.verticalOrigin).toBeUndefined();
            expect(label.eyeOffset).toBeUndefined();
            expect(label.pixelOffsetScaleByDistance).toBeUndefined();

            expect(label.font.getValue()).toEqual('16px sans-serif');
            expect(label.style.getValue()).toEqual(LabelStyle.FILL_AND_OUTLINE);
            expect(label.horizontalOrigin.getValue()).toEqual(HorizontalOrigin.LEFT);
            expect(label.pixelOffset.getValue()).toEqual(new Cartesian2(17, 0));
            expect(label.translucencyByDistance.getValue()).toEqual(new NearFarScalar(3000000, 1.0, 5000000, 0.0));
        });
    });

    it('LabelStyle: Sets color', function() {
        var color = Color.fromBytes(0xcc, 0xdd, 0xee, 0xff);
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <LabelStyle>\
                <color>ffeeddcc</color>\
              </LabelStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].label.fillColor.getValue()).toEqual(color);
        });
    });

    it('LabelStyle: Sets scale', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <Style>\
                <IconStyle>\
                    <scale>2</scale>\
                </IconStyle>\
                <LabelStyle>\
                </LabelStyle>\
              </Style>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].label.pixelOffset.getValue()).toEqual(new Cartesian2(33, 0));
        });
    });

    it('LabelStyle: Sets pixelOffset when billboard scaled', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <IconStyle>\
                <scale>3</scale>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].label.pixelOffset.getValue()).toEqual(new Cartesian3(3 * 16 + 1, 0));
        });
    });

    it('LabelStyle: Sets pixelOffset when billboard scaled', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <IconStyle>\
                <scale>0</scale>\
              </IconStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities[0].label.pixelOffset).toBeUndefined();
            expect(entities[0].label.horizontalOrigin).toBeUndefined();
        });
    });

    it('LineStyle: Sets defaults', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <LineStyle>\
              </LineStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polyline = entities[0].polyline;
            expect(polyline).toBeDefined();

            expect(polyline.positions).toBeUndefined();
            expect(polyline.followSurface).toBeUndefined();
            expect(polyline.width).toBeUndefined();
            expect(polyline.show).toBeUndefined();
            expect(polyline.material).toBeUndefined();
            expect(polyline.granularity).toBeUndefined();
        });
    });

    it('LineStyle: Sets color', function() {
        var color = Color.fromBytes(0xcc, 0xdd, 0xee, 0xff);
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <LineStyle>\
                <color>ffeeddcc</color>\
              </LineStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polyline = entities[0].polyline;
            expect(polyline.material).toBeInstanceOf(ColorMaterialProperty);
            expect(polyline.material.color.getValue()).toEqual(color);
        });
    });

    it('LineStyle: Sets width', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <LineStyle>\
                <width>2.75</width>\
              </LineStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polyline = entities[0].polyline;
            expect(polyline.width.getValue()).toEqual(2.75);
        });
    });

    it('PolyStyle: Sets defaults', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <PolyStyle>\
              </PolyStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polygon = entities[0].polygon;
            expect(polygon).toBeDefined();

            expect(polygon.hierarchy).toBeUndefined();
            expect(polygon.height).toBeUndefined();
            expect(polygon.extrudedHeight).toBeUndefined();
            expect(polygon.show).toBeUndefined();
            expect(polygon.fill).toBeUndefined();
            expect(polygon.material).toBeUndefined();
            expect(polygon.outlineWidth).toBeUndefined();
            expect(polygon.stRotation).toBeUndefined();
            expect(polygon.granularity).toBeUndefined();
            expect(polygon.perPositionHeight).toBeUndefined();

            expect(polygon.outline.getValue()).toBe(true);
            expect(polygon.outlineColor.getValue()).toEqual(Color.WHITE);
        });
    });

    it('PolyStyle: Sets color', function() {
        var color = Color.fromBytes(0xcc, 0xdd, 0xee, 0xff);
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <PolyStyle>\
                <color>ffeeddcc</color>\
              </PolyStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polygon = entities[0].polygon;
            expect(polygon.material).toBeInstanceOf(ColorMaterialProperty);
            expect(polygon.material.color.getValue()).toEqual(color);
        });
    });

    it('PolyStyle: Sets fill', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <PolyStyle>\
                <fill>0</fill>\
              </PolyStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polygon = entities[0].polygon;
            expect(polygon.fill.getValue()).toEqual(false);
        });
    });

    it('PolyStyle: Sets outline', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Style>\
              <PolyStyle>\
                <outline>0</outline>\
              </PolyStyle>\
            </Style>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            var polygon = entities[0].polygon;
            expect(polygon.outline.getValue()).toEqual(false);
        });
    });

    it('Folder: sets parent property', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Folder id="parent">\
            <Placemark id="child">\
            </Placemark>\
        </Folder>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities;
            var folder = entities.getById('parent');
            var placemark = entities.getById('child');

            expect(entities.values.length).toBe(2);
            expect(folder).toBeDefined();
            expect(placemark.parent).toBe(folder);
        });
    });

    it('Geometry Point: handles empty Point', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(0, 0, 0));
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: handles invalid coordinates', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
            <altitudeMode>absolute</altitudeMode>\
            <coordinates>1,2,3,4</coordinates>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: handles empty coordinates', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
            <coordinates></coordinates>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(0, 0, 0));
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: sets heightReference to clampToGround (the default)', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
              <coordinates>1,2,3</coordinates>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].billboard.heightReference.getValue(Iso8601.MINIMUM_VALUE)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: sets position altitudeMode absolute', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
              <altitudeMode>absolute</altitudeMode>\
              <coordinates>1,2,3</coordinates>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entities[0].billboard.pixelOffset).toBeUndefined();
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: sets position altitudeMode relativeToGround', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
              <altitudeMode>relativeToGround</altitudeMode>\
              <coordinates>1,2,3</coordinates>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entities[0].billboard.pixelOffset).toBeUndefined();
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: does not extrude when altitudeMode is clampToGround', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
              <altitudeMode>clampToGround</altitudeMode>\
              <coordinates>1,2</coordinates>\
              <extrude>1</extrude>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 0));
            expect(entities[0].billboard.pixelOffset).toBeUndefined();
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: does not extrude when gx:altitudeMode is clampToSeaFloor', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Point>\
              <gx:altitudeMode>clampToSeaFloor</gx:altitudeMode>\
              <coordinates>1,2</coordinates>\
              <extrude>1</extrude>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2));
            expect(entities[0].polyline).toBeUndefined();
        });
    });

    it('Geometry Point: extrudes when altitudeMode is relativeToGround', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
              <altitudeMode>relativeToGround</altitudeMode>\
              <coordinates>1,2,3</coordinates>\
              <extrude>1</extrude>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entities[0].polyline).toBeDefined();

            var positions = entities[0].polyline.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(1, 2, 0)], CesiumMath.EPSILON13);
        });
    });

    it('Geometry Point: extrudes when gx:altitudeMode is relativeToSeaFloor', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Point>\
              <gx:altitudeMode>relativeToSeaFloor</gx:altitudeMode>\
              <coordinates>1,2,3</coordinates>\
              <extrude>1</extrude>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entities[0].polyline).toBeDefined();

            var positions = entities[0].polyline.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(1, 2, 0)], CesiumMath.EPSILON13);
        });
    });

    it('Geometry Point: extrudes when altitudeMode is absolute', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Point>\
              <altitudeMode>absolute</altitudeMode>\
              <coordinates>1,2,3</coordinates>\
              <extrude>1</extrude>\
            </Point>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);
            expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entities[0].polyline).toBeDefined();

            var positions = entities[0].polyline.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(1, 2, 0)], CesiumMath.EPSILON13);
        });
    });

    it('Geometry Polygon: handles empty coordinates', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <outerBoundaryIs>\
                <LinearRing>\
                  <coordinates>\
                 </coordinates>\
                </LinearRing>\
              </outerBoundaryIs>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.hierarchy).toBeUndefined();
        });
    });

    it('Geometry Polygon: without holes', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <outerBoundaryIs>\
                <LinearRing>\
                  <coordinates>\
                    1,2,3\
                    4,5,6\
                    7,8,9\
                 </coordinates>\
                </LinearRing>\
              </outerBoundaryIs>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            var coordinates = [Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(4, 5, 6), Cartesian3.fromDegrees(7, 8, 9)];
            expect(entity.polygon.hierarchy.getValue().positions).toEqual(coordinates);
        });
    });

    it('Geometry Polygon: with holes', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
            <outerBoundaryIs>\
            <LinearRing>\
              <coordinates>\
                1,2,3\
                4,5,6\
                7,8,9\
             </coordinates>\
            </LinearRing>\
            </outerBoundaryIs>\
            <innerBoundaryIs>\
            <LinearRing>\
              <coordinates>\
                1.1,2.1,3.1\
                4.1,5.1,6.1\
                7.1,8.1,9.1\
             </coordinates>\
            </LinearRing>\
            </innerBoundaryIs>\
            <innerBoundaryIs>\
            <LinearRing>\
              <coordinates>\
                1.2,2.2,3.2\
                4.2,5.2,6.2\
                7.2,8.2,9.2\
             </coordinates>\
            </LinearRing>\
            </innerBoundaryIs>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            var coordinates = [Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(4, 5, 6), Cartesian3.fromDegrees(7, 8, 9)];
            var holeCoordinates = [Cartesian3.fromDegrees(1.1, 2.1, 3.1), Cartesian3.fromDegrees(4.1, 5.1, 6.1), Cartesian3.fromDegrees(7.1, 8.1, 9.1)];
            var holeCoordinates2 = [Cartesian3.fromDegrees(1.2, 2.2, 3.2), Cartesian3.fromDegrees(4.2, 5.2, 6.2), Cartesian3.fromDegrees(7.2, 8.2, 9.2)];

            var hierarchy = entity.polygon.hierarchy.getValue();
            expect(hierarchy.positions).toEqual(coordinates);
            expect(hierarchy.holes.length).toEqual(2);

            expect(hierarchy.holes[0].positions).toEqual(holeCoordinates);
            expect(hierarchy.holes[0].holes).toEqual([]);

            expect(hierarchy.holes[1].positions).toEqual(holeCoordinates2);
            expect(hierarchy.holes[1].holes).toEqual([]);
        });
    });

    it('Geometry Polygon: altitudeMode relativeToGround and can extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>relativeToGround</altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight.getValue()).toEqual(true);
            expect(entity.polygon.extrudedHeight.getValue()).toEqual(0);
        });
    });

    it('Geometry Polygon: altitudeMode absolute and can extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>absolute</altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight.getValue()).toEqual(true);
            expect(entity.polygon.extrudedHeight.getValue()).toEqual(0);
        });
    });

    it('Geometry Polygon: altitudeMode clampToGround and cannot extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Polygon>\
              <altitudeMode>clampToGround</altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight).toBeUndefined();
            expect(entity.polygon.extrudedHeight).toBeUndefined();
        });
    });

    it('Geometry Polygon: gx:altitudeMode relativeToSeaFloor and can extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Polygon>\
              <gx:altitudeMode>relativeToSeaFloor</gx:altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight.getValue()).toEqual(true);
            expect(entity.polygon.extrudedHeight.getValue()).toEqual(0);
        });
    });

    it('Geometry Polygon: gx:altitudeMode clampToSeaFloor and can extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Polygon>\
              <gx:altitudeMode>clampToSeaFloor</gx:altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight).toBeUndefined();
            expect(entity.polygon.extrudedHeight).toBeUndefined();
        });
    });

    it('Geometry LineString: handles empty element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <LineString>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.wall).toBeUndefined();
            expect(entity.polyline).toBeDefined();
            expect(entity.polyline.followSurface.getValue()).toEqual(false);
        });
    });

    it('Geometry LineString: sets positions (clampToGround default)', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <LineString>\
              <coordinates>1,2,3 \
                           4,5,6 \
              </coordinates>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.wall).toBeUndefined();
            expect(entity.polyline).toBeDefined();

            var positions = entity.polyline.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2), Cartesian3.fromDegrees(4, 5)], CesiumMath.EPSILON10);
            expect(entity.polyline.followSurface.getValue()).toEqual(false);
        });
    });

    it('Geometry LineString: sets wall positions when extruded', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <LineString>\
              <altitudeMode>absolute</altitudeMode>\
              <extrude>1</extrude>\
              <coordinates>1,2,3 \
                           4,5,6 \
              </coordinates>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.polyline).toBeUndefined();
            expect(entity.wall).toBeDefined();

            var positions = entity.wall.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(4, 5, 6)], CesiumMath.EPSILON10);
        });
    });

    it('Geometry LineString: sets positions altitudeMode clampToGround, cannot extrude, can tessellate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <LineString>\
                <altitudeMode>clampToGround</altitudeMode>\
                <extrude>1</extrude>\
                <tessellate>1</tessellate>\
                <coordinates>1,2,3 4,5,6</coordinates>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.polyline.followSurface).toBeUndefined();
            var positions = entity.polyline.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2), Cartesian3.fromDegrees(4, 5)], CesiumMath.EPSILON10);
        });
    });

    it('Geometry LineString: sets positions altitudeMode gx:clampToSeaFloor, cannot extrude, can tessellate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <LineString>\
                <gx:altitudeMode>clampToSeaFloor</gx:altitudeMode>\
                <extrude>1</extrude>\
                <tessellate>1</tessellate>\
                <coordinates>1,2,3 4,5,6</coordinates>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.polyline.followSurface).toBeUndefined();
            var positions = entity.polyline.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2), Cartesian3.fromDegrees(4, 5)], CesiumMath.EPSILON10);
        });
    });

    it('Geometry LineString: sets positions altitudeMode gx:relativeToSeaFloor, can extrude, cannot tessellate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                   xmlns:gx="http://www.google.com/kml/ext/2.2">\
        <LineString>\
            <gx:altitudeMode>relativeToSeaFloor</gx:altitudeMode>\
            <extrude>1</extrude>\
            <tessellate>1</tessellate>\
            <coordinates>1,2,3 4,5,6</coordinates>\
        </LineString>\
        </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.polyline).toBeUndefined(true);
            expect(entity.wall).toBeDefined();
            var positions = entity.wall.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(4, 5, 6)], CesiumMath.EPSILON10);
        });
    });

    it('Geometry LineString: sets positions altitudeMode relativeToGround, can extrude, cannot tessellate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <LineString>\
                <altitudeMode>relativeToGround</altitudeMode>\
                <extrude>1</extrude>\
                <tessellate>1</tessellate>\
                <coordinates>1,2,3 4,5,6</coordinates>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.polyline).toBeUndefined();
            expect(entity.wall).toBeDefined();
            var positions = entity.wall.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(4, 5, 6)], CesiumMath.EPSILON10);
        });
    });

    it('Geometry LineString: sets positions altitudeMode absolute, can extrude, cannot tessellate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
            <LineString>\
                <altitudeMode>absolute</altitudeMode>\
                <extrude>1</extrude>\
                <tessellate>1</tessellate>\
                <coordinates>1,2,3 4,5,6</coordinates>\
            </LineString>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(1);

            var entity = entities[0];
            expect(entity.polyline).toBeUndefined();
            expect(entity.wall).toBeDefined();
            var positions = entity.wall.positions.getValue(Iso8601.MINIMUM_VALUE);
            expect(positions).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(4, 5, 6)], CesiumMath.EPSILON10);
        });
    });

    it('Geometry gx:Track: sets position and availability (clampToGround default)', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:Track>\
                <when>2000-01-01T00:00:00Z</when>\
                <gx:coord>1 2 3</gx:coord>\
                <when>2000-01-01T00:00:01Z</when>\
                <gx:coord>4 5 6</gx:coord>\
                <when>2000-01-01T00:00:02Z</when>\
                <gx:coord>7 8 9</gx:coord>\
              </gx:Track>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');

            var entity = dataSource.entities.values[0];
            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2, 3), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5, 6), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toEqualEpsilon(Cartesian3.fromDegrees(7, 8, 9), CesiumMath.EPSILON12);
            expect(entity.billboard.heightReference.getValue(time1)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.billboard.heightReference.getValue(time2)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.billboard.heightReference.getValue(time3)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.polyline).toBeUndefined();

            expect(entity.availability.start).toEqual(time1);
            expect(entity.availability.stop).toEqual(time3);
        });
    });

    it('Geometry gx:Track: sets position clampToGround, cannot extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:Track>\
                <altitudeMode>clampToGround</altitudeMode>\
                <extrude>1</extrude>\
                <when>2000-01-01T00:00:00Z</when>\
                <gx:coord>1 2 3</gx:coord>\
                <when>2000-01-01T00:00:01Z</when>\
                <gx:coord>4 5 6</gx:coord>\
                <when>2000-01-01T00:00:02Z</when>\
                <gx:coord>7 8 9</gx:coord>\
              </gx:Track>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');

            var entity = dataSource.entities.values[0];
            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2, 3), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5, 6), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toEqualEpsilon(Cartesian3.fromDegrees(7, 8, 9), CesiumMath.EPSILON12);
            expect(entity.billboard.heightReference.getValue(time1)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.billboard.heightReference.getValue(time2)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.billboard.heightReference.getValue(time3)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.polyline).toBeUndefined();
        });
    });

    it('Geometry gx:Track: sets position altitudeMode absolute, can extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:Track>\
                <altitudeMode>absolute</altitudeMode>\
                <extrude>1</extrude>\
                <when>2000-01-01T00:00:00Z</when>\
                <gx:coord>1 2 3</gx:coord>\
                <when>2000-01-01T00:00:01Z</when>\
                <gx:coord>4 5 6</gx:coord>\
                <when>2000-01-01T00:00:02Z</when>\
                <gx:coord>7 8 9</gx:coord>\
              </gx:Track>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');

            var entity = dataSource.entities.values[0];
            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2, 3), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5, 6), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toEqualEpsilon(Cartesian3.fromDegrees(7, 8, 9), CesiumMath.EPSILON12);

            expect(entity.polyline.positions.getValue(time1)).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(1, 2)], CesiumMath.EPSILON12);
            expect(entity.polyline.positions.getValue(time2)).toEqualEpsilon([Cartesian3.fromDegrees(4, 5, 6), Cartesian3.fromDegrees(4, 5)], CesiumMath.EPSILON12);
            expect(entity.polyline.positions.getValue(time3)).toEqualEpsilon([Cartesian3.fromDegrees(7, 8, 9), Cartesian3.fromDegrees(7, 8)], CesiumMath.EPSILON12);
        });
    });

    it('Geometry gx:Track: sets position altitudeMode relativeToGround, can extrude', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:Track>\
                <altitudeMode>relativeToGround</altitudeMode>\
                <extrude>1</extrude>\
                <when>2000-01-01T00:00:00Z</when>\
                <gx:coord>1 2 3</gx:coord>\
                <when>2000-01-01T00:00:01Z</when>\
                <gx:coord>4 5 6</gx:coord>\
                <when>2000-01-01T00:00:02Z</when>\
                <gx:coord>7 8 9</gx:coord>\
              </gx:Track>\
            </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');

            var entity = dataSource.entities.values[0];
            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2, 3), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5, 6), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toEqualEpsilon(Cartesian3.fromDegrees(7, 8, 9), CesiumMath.EPSILON12);

            expect(entity.polyline.positions.getValue(time1)).toEqualEpsilon([Cartesian3.fromDegrees(1, 2, 3), Cartesian3.fromDegrees(1, 2)], CesiumMath.EPSILON12);
            expect(entity.polyline.positions.getValue(time2)).toEqualEpsilon([Cartesian3.fromDegrees(4, 5, 6), Cartesian3.fromDegrees(4, 5)], CesiumMath.EPSILON12);
            expect(entity.polyline.positions.getValue(time3)).toEqualEpsilon([Cartesian3.fromDegrees(7, 8, 9), Cartesian3.fromDegrees(7, 8)], CesiumMath.EPSILON12);
        });
    });

    it('Geometry gx:Track: sets position and availability when missing values', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
                <gx:Track>\
                    <when>2000-01-01T00:00:00Z</when>\
                    <gx:coord>1 2 3</gx:coord>\
                    <when>2000-01-01T00:00:01Z</when>\
                    <gx:coord>4 5 6</gx:coord>\
                    <when>2000-01-01T00:00:02Z</when>\
                </gx:Track>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');

            var entity = dataSource.entities.values[0];
            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2, 3), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5, 6), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toBeUndefined();

            // heightReference should be constant so its available all the time
            expect(entity.billboard.heightReference.getValue(time1)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.billboard.heightReference.getValue(time2)).toEqual(HeightReference.CLAMP_TO_GROUND);
            expect(entity.billboard.heightReference.getValue(time3)).toEqual(HeightReference.CLAMP_TO_GROUND);

            expect(entity.availability.start).toEqual(time1);
            expect(entity.availability.stop).toEqual(time2);
        });
    });

    it('Geometry gx:MultiTrack: sets position and availability without interpolate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:MultiTrack>\
                  <gx:Track>\
                    <when>2000-01-01T00:00:00Z</when>\
                    <gx:coord>1 2 3</gx:coord>\
                    <when>2000-01-01T00:00:01Z</when>\
                    <gx:coord>4 5 6</gx:coord>\
                  </gx:Track>\
                  <gx:Track>\
                    <when>2000-01-01T00:00:02Z</when>\
                    <gx:coord>6 5 4</gx:coord>\
                    <when>2000-01-01T00:00:03Z</when>\
                    <gx:coord>3 2 1</gx:coord>\
                  </gx:Track>\
              </gx:MultiTrack>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');
            var time4 = JulianDate.fromIso8601('2000-01-01T00:00:03Z');

            var entity = dataSource.entities.values[0];
            expect(entity.availability.length).toEqual(2);
            expect(entity.availability.get(0).start).toEqual(time1);
            expect(entity.availability.get(0).stop).toEqual(time2);
            expect(entity.availability.get(1).start).toEqual(time3);
            expect(entity.availability.get(1).stop).toEqual(time4);

            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toEqualEpsilon(Cartesian3.fromDegrees(6, 5), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time4)).toEqualEpsilon(Cartesian3.fromDegrees(3, 2), CesiumMath.EPSILON12);
        });
    });

    it('Geometry gx:MultiTrack: sets position and availability with interpolate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:MultiTrack>\
                  <gx:interpolate>1</gx:interpolate>\
                  <gx:Track>\
                    <when>2000-01-01T00:00:00Z</when>\
                    <gx:coord>1 2 3</gx:coord>\
                    <when>2000-01-01T00:00:01Z</when>\
                    <gx:coord>4 5 6</gx:coord>\
                  </gx:Track>\
                  <gx:Track>\
                    <when>2000-01-01T00:00:02Z</when>\
                    <gx:coord>6 5 4</gx:coord>\
                    <when>2000-01-01T00:00:03Z</when>\
                    <gx:coord>3 2 1</gx:coord>\
                  </gx:Track>\
              </gx:MultiTrack>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');
            var time4 = JulianDate.fromIso8601('2000-01-01T00:00:03Z');

            var entity = dataSource.entities.values[0];
            expect(entity.availability.length).toEqual(1);
            expect(entity.availability.get(0).start).toEqual(time1);
            expect(entity.availability.get(0).stop).toEqual(time4);

            expect(entity.position.getValue(time1)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time2)).toEqualEpsilon(Cartesian3.fromDegrees(4, 5), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time3)).toEqualEpsilon(Cartesian3.fromDegrees(6, 5), CesiumMath.EPSILON12);
            expect(entity.position.getValue(time4)).toEqualEpsilon(Cartesian3.fromDegrees(3, 2), CesiumMath.EPSILON12);
        });
    });

    it('Geometry gx:MultiTrack: sets position and availability altitudeMode absolute, extrude, with interpolate', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                     xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:MultiTrack>\
                  <gx:interpolate>1</gx:interpolate>\
                  <gx:Track>\
                    <altitudeMode>absolute</altitudeMode>\
                    <extrude>1</extrude>\
                    <when>2000-01-01T00:00:00Z</when>\
                    <gx:coord>1 2 3</gx:coord>\
                    <when>2000-01-01T00:00:01Z</when>\
                    <gx:coord>4 5 6</gx:coord>\
                  </gx:Track>\
                  <gx:Track>\
                    <altitudeMode>absolute</altitudeMode>\
                    <extrude>1</extrude>\
                    <when>2000-01-01T00:00:02Z</when>\
                    <gx:coord>6 5 4</gx:coord>\
                    <when>2000-01-01T00:00:03Z</when>\
                    <gx:coord>3 2 1</gx:coord>\
                  </gx:Track>\
              </gx:MultiTrack>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var time1 = JulianDate.fromIso8601('2000-01-01T00:00:00Z');
            var time2 = JulianDate.fromIso8601('2000-01-01T00:00:01Z');
            var time3 = JulianDate.fromIso8601('2000-01-01T00:00:02Z');
            var time4 = JulianDate.fromIso8601('2000-01-01T00:00:03Z');

            var entity = dataSource.entities.values[0];
            expect(entity.availability.length).toEqual(1);
            expect(entity.availability.get(0).start).toEqual(time1);
            expect(entity.availability.get(0).stop).toEqual(time4);

            expect(entity.position.getValue(time1)).toEqual(Cartesian3.fromDegrees(1, 2, 3));
            expect(entity.position.getValue(time2)).toEqual(Cartesian3.fromDegrees(4, 5, 6));
            expect(entity.position.getValue(time3)).toEqual(Cartesian3.fromDegrees(6, 5, 4));
            expect(entity.position.getValue(time4)).toEqual(Cartesian3.fromDegrees(3, 2, 1));
        });
    });

    it('Geometry MultiGeometry: sets expected properties', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark id="testID">\
          <MultiGeometry>\
            <name>TheName</name>\
            <description>TheDescription</description>\
              <Point id="point1">\
                <coordinates>1,2</coordinates>\
              </Point>\
              <Point id="point2">\
                <coordinates>3,4</coordinates>\
              </Point>\
          </MultiGeometry>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities;
            expect(entities.values.length).toEqual(3);

            var multi = entities.getById('testID');
            expect(multi).toBeDefined();

            var point1 = entities.getById('testIDpoint1');
            expect(point1).toBeDefined();
            expect(point1.parent).toBe(multi);
            expect(point1.name).toBe(multi.name);
            expect(point1.description).toBe(multi.description);
            expect(point1.kml).toBe(multi.kml);
            expect(point1.position.getValue(Iso8601.MINIMUM_VALUE)).toEqualEpsilon(Cartesian3.fromDegrees(1, 2), CesiumMath.EPSILON13);

            var point2 = entities.getById('testIDpoint2');
            expect(point2).toBeDefined();
            expect(point2.parent).toBe(multi);
            expect(point2.name).toBe(multi.name);
            expect(point2.description).toBe(multi.description);
            expect(point2.kml).toBe(multi.kml);
            expect(point2.position.getValue(Iso8601.MINIMUM_VALUE)).toEqualEpsilon(Cartesian3.fromDegrees(3, 4), CesiumMath.EPSILON13);
        });
    });

    it('NetworkLink: Loads data', function() {
        return KmlDataSource.load('Data/KML/networkLink.kml', options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(2);
            expect(entities[0].id).toEqual('link');
            expect(entities[1].parent).toBe(entities[0]);
        });
    });

    it('NetworkLink: onInterval', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <refreshMode>onInterval</refreshMode>\
              <refreshInterval>1</refreshInterval>\
            </Link>\
          </NetworkLink>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(3);
            var link1 = entities[0];
            var folder1 = entities[1];
            var placemark1 = entities[2];
            expect(link1.id).toEqual('link');
            expect(folder1.parent).toBe(link1);
            expect(placemark1.parent).toBe(folder1);

            var spy = jasmine.createSpy('refreshEvent');
            dataSource.refreshEvent.addEventListener(spy);

            return pollToPromise(function() {
                dataSource.update(0);
                return (spy.calls.count() > 0);
            }).then(function() {
                expect(spy).toHaveBeenCalledWith(dataSource, './Data/KML/refresh.kml');

                expect(entities.length).toEqual(3);
                var link2 = entities[0];
                var folder2 = entities[1];
                var placemark2 = entities[2];
                expect(link2.id).toEqual('link');
                expect(folder2.parent).toBe(link2);
                expect(placemark2.parent).toBe(folder2);
                expect(link2).toEqual(link2);
                expect(folder2).not.toEqual(folder1);
                expect(placemark2).not.toEqual(placemark1);
            });
        });
    });

    it('NetworkLink: onExpire', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <refreshMode>onExpire</refreshMode>\
            </Link>\
          </NetworkLink>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(3);
            var link1 = entities[0];
            var folder1 = entities[1];
            var placemark1 = entities[2];
            expect(link1.id).toEqual('link');
            expect(folder1.parent).toBe(link1);
            expect(placemark1.parent).toBe(folder1);

            var spy = jasmine.createSpy('refreshEvent');
            dataSource.refreshEvent.addEventListener(spy);

            dataSource.update(0); // Document is already expired so call once
            return pollToPromise(function() {
                return (spy.calls.count() > 0);
            }).then(function() {
                expect(spy).toHaveBeenCalledWith(dataSource, './Data/KML/refresh.kml');

                expect(entities.length).toEqual(3);
                var link2 = entities[0];
                var folder2 = entities[1];
                var placemark2 = entities[2];
                expect(link2.id).toEqual('link');
                expect(folder2.parent).toBe(link2);
                expect(placemark2.parent).toBe(folder2);
                expect(link2).toEqual(link2);
                expect(folder2).not.toEqual(folder1);
                expect(placemark2).not.toEqual(placemark1);
            });
        });
    });

    it('NetworkLink: onStop', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onStop</viewRefreshMode>\
            </Link>\
          </NetworkLink>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(3);
            var link1 = entities[0];
            var folder1 = entities[1];
            var placemark1 = entities[2];
            expect(link1.id).toEqual('link');
            expect(folder1.parent).toBe(link1);
            expect(placemark1.parent).toBe(folder1);

            var spy = jasmine.createSpy('refreshEvent');
            dataSource.refreshEvent.addEventListener(spy);

            // Move the camera and call update to set the last camera view
            options.camera.positionWC.x = 1.0;
            dataSource.update(0);

            return pollToPromise(function() {
                return (spy.calls.count() > 0);
            }).then(function() {
                expect(spy).toHaveBeenCalledWith(dataSource, './Data/KML/refresh.kml?BBOX=-180,-90,180,90');

                expect(entities.length).toEqual(3);
                var link2 = entities[0];
                var folder2 = entities[1];
                var placemark2 = entities[2];
                expect(link2.id).toEqual('link');
                expect(folder2.parent).toBe(link2);
                expect(placemark2.parent).toBe(folder2);
                expect(link2).toEqual(link2);
                expect(folder2).not.toEqual(folder1);
                expect(placemark2).not.toEqual(placemark1);
            });
        });
    });

    it('NetworkLink: Url is correct on initial load', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml');
        });
    });

    it('NetworkLink can accept invalid but common URL tag instead of Link', function(){
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Url>\
              <href>./Data/KML/refresh.kml</href>\
            </Url>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml');
        });
    });

    it('NetworkLink: Url is correct on initial load with onStop defaults', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onStop</viewRefreshMode>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml?BBOX=-180,-90,180,90');
        });
    });

    it('NetworkLink: Url is correct on initial load with httpQuery without a ?', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onInterval</viewRefreshMode>\
              <httpQuery>client=[clientName]-v[clientVersion]&amp;v=[kmlVersion]&amp;lang=[language]</httpQuery>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml?client=Cesium-v1&v=2.2&lang=English');
        });
    });

    it('NetworkLink: Url is correct on initial load with httpQuery with a ?', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onInterval</viewRefreshMode>\
              <httpQuery>?client=[clientName]-v[clientVersion]&amp;v=[kmlVersion]&amp;lang=[language]</httpQuery>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml?client=Cesium-v1&v=2.2&lang=English');
        });
    });

    it('NetworkLink: Url is correct on initial load with viewFormat without a ?', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onInterval</viewRefreshMode>\
              <viewFormat>BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth];CAMERA=\
[lookatLon],[lookatLat],[lookatRange],[lookatTilt],[lookatHeading];VIEW=\
[horizFov],[vertFov],[horizPixels],[vertPixels],[terrainEnabled]</viewFormat>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml?BBOX=-180,-90,180,90;CAMERA=0,0,6378137,0,0;VIEW=45,45,512,512,1');
        });
    });

    it('NetworkLink: Url is correct on initial load with viewFormat with a ?', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onInterval</viewRefreshMode>\
              <viewFormat>?BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth];CAMERA=\
[lookatLon],[lookatLat],[lookatRange],[lookatTilt],[lookatHeading];VIEW=\
[horizFov],[vertFov],[horizPixels],[vertPixels],[terrainEnabled]</viewFormat>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml?BBOX=-180,-90,180,90;CAMERA=0,0,6378137,0,0;VIEW=45,45,512,512,1');
        });
    });

    it('NetworkLink: Url is correct on initial load with viewFormat and httpQuery', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onInterval</viewRefreshMode>\
              <viewFormat>vf=1</viewFormat>\
              <httpQuery>hq=1</httpQuery>\
            </Link>\
          </NetworkLink>';

        var requestNetworkLink = when.defer();
        spyOn(loadWithXhr, 'load').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            requestNetworkLink.resolve(url);
            deferred.reject();
        });

        KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options);

        return requestNetworkLink.promise.then(function(url) {
            expect(url).toEqual('./Data/KML/refresh.kml?vf=1&hq=1');
        });
    });

    it('NetworkLink: onStop when no globe is in view', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/refresh.kml</href>\
              <viewRefreshMode>onStop</viewRefreshMode>\
            </Link>\
          </NetworkLink>';

        var ourOptions = {
            camera : {
                positionWC : new Cartesian3(0.0, 0.0, 0.0),
                directionWC : new Cartesian3(0.0, 0.0, 1.0),
                upWC : new Cartesian3(0.0, 1.0, 0.0),
                pitch : 0.0,
                heading : 0.0,
                frustum : {
                    aspectRatio : 1.0,
                    fov : CesiumMath.PI_OVER_FOUR
                },
                computeViewRectangle : function() {
                    return undefined;
                },
                pickEllipsoid : function() {
                    return undefined;
                }
            },
            canvas : options.canvas
        };

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), ourOptions).then(function(dataSource) {
            var entities = dataSource.entities.values;
            expect(entities.length).toEqual(3);
            var link1 = entities[0];
            var folder1 = entities[1];
            var placemark1 = entities[2];
            expect(link1.id).toEqual('link');
            expect(folder1.parent).toBe(link1);
            expect(placemark1.parent).toBe(folder1);

            var spy = jasmine.createSpy('refreshEvent');
            dataSource.refreshEvent.addEventListener(spy);

            // Move the camera and call update to set the last camera view
            ourOptions.camera.positionWC.x = 1.0;
            dataSource.update(0);

            return pollToPromise(function() {
                return (spy.calls.count() > 0);
            }).then(function() {
                expect(spy).toHaveBeenCalledWith(dataSource, './Data/KML/refresh.kml?BBOX=0,0,0,0');

                expect(entities.length).toEqual(3);
                var link2 = entities[0];
                var folder2 = entities[1];
                var placemark2 = entities[2];
                expect(link2.id).toEqual('link');
                expect(folder2.parent).toBe(link2);
                expect(placemark2.parent).toBe(folder2);
                expect(link2).toEqual(link2);
                expect(folder2).not.toEqual(folder1);
                expect(placemark2).not.toEqual(placemark1);
            });
        });
    });

    it('can load a KML file with explicit namespaces', function() {
        return KmlDataSource.load('Data/KML/namespaced.kml', options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toBe(3);
        });
    });

	it('can load styles from a KML file with namespaces', function() {
		return KmlDataSource.load('Data/KML/namespaced.kml', options).then(function(dataSource) {
			console.debug(dataSource.entities.values[2]);
			var polyline = dataSource.entities.values[2].polyline;
			var expectedColor = Color.fromBytes(0xff, 0x00, 0xff, 0x00);
			var polylineColor = polyline.material.color.getValue();
			expect(polylineColor).toEqual(expectedColor);
			expect(polyline.width.getValue()).toEqual(10);
		});
	});

    it('Boolean values can use true string', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>relativeToGround</altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight.getValue()).toEqual(true);
        });
    });

    it('Boolean values can use false string', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>relativeToGround</altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight.getValue()).toEqual(true);
        });
    });

    it('Properly finds the root feature node when it is not the first child of the KML node', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <NetworkLinkControl>\
            </NetworkLinkControl>\
            <Placemark>\
            <name>bob</name>\
            </Placemark>\
            </kml>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.name).toBe('bob');
            expect(entity.label).toBeDefined();
            expect(entity.label.text.getValue()).toBe('bob');
        });
    });

    it('Has entity collection with link to data source', function() {
        var dataSource = new KmlDataSource(options);
        var entityCollection = dataSource.entities;
        expect(entityCollection.owner).toEqual(dataSource);
    });

    it('Has entity with link to entity collection', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>relativeToGround</altitudeMode>\
              <extrude>1</extrude>\
            </Polygon>\
          </Placemark>';
        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.entityCollection).toEqual(entityCollection);
        });
    });

    it('GroundOverly Icon with refreshMode shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
                <refreshMode>onInterval</refreshMode>\
            </Icon>\
        </GroundOverlay>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported Icon refreshMode: onInterval');
        });
    });

    it('GroundOverly Icon with viewRefreshMode shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
                <viewRefreshMode>onStop</viewRefreshMode>\
            </Icon>\
        </GroundOverlay>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported Icon viewRefreshMode: onStop');
        });
    });

    it('GroundOverly Icon with gx:x, gx:y, gx:w, gx:h shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <GroundOverlay>\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
                <gx:x>1</gx:x>\
            </Icon>\
          </GroundOverlay>\
        </Document>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - gx:x, gx:y, gx:w, gx:h aren\'t supported for GroundOverlays');
        });
    });

    it('LineStyle with gx extensions show warnings', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
          <Placemark>\
            <Style>\
              <LineStyle>\
                <gx:outerColor>dddddddd</gx:outerColor>\
                <gx:outerWidth>0.0</gx:outerWidth>\
                <gx:physicalWidth>0.0</gx:physicalWidth>\
                <gx:labelVisibility>0</gx:labelVisibility>\
              </LineStyle>\
            </Style>\
            <LineString>\
            <coordinates>1,2,3 \
                         4,5,6 \
            </coordinates>\
            </LineString>\
          </Placemark>\
        </Document>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(4);
            expect(console.log).toHaveBeenCalledWith('KML - gx:outerColor is not supported in a LineStyle');
            expect(console.log).toHaveBeenCalledWith('KML - gx:outerWidth is not supported in a LineStyle');
            expect(console.log).toHaveBeenCalledWith('KML - gx:physicalWidth is not supported in a LineStyle');
            expect(console.log).toHaveBeenCalledWith('KML - gx:labelVisibility is not supported in a LineStyle');
        });
    });

    it('Folder with radioFolder listItemType shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Folder>\
            <Style>\
                <ListStyle>\
                  <listItemType>radioFolder</listItemType>\
                </ListStyle>\
            </Style>\
        </Folder>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported ListStyle with listItemType: radioFolder');
        });
    });

    it('StyleMap with highlighted key shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
          <StyleMap>\
            <Pair>\
              <key>normal</key>\
              <Style>\
              </Style>\
            </Pair>\
            <Pair>\
              <key>highlighted</key>\
              <Style>\
              </Style>\
            </Pair>\
          </StyleMap>\
        </Placemark>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported StyleMap key: highlighted');
        });
    });

    it('Linestrings with gx:drawOrder shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Document xmlns="http://www.opengis.net/kml/2.2"\
                  xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Placemark>\
            <LineString>\
                <gx:drawOrder>1</gx:drawOrder>\
                <coordinates>1,2,3 \
                         4,5,6 \
            </coordinates>\
            </LineString>\
            </Placemark>\
          </Document>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - gx:drawOrder is not supported in LineStrings');
        });
    });

    it('gx:Track with gx:angles shows warning)', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:Track>\
                <when>2000-01-01T00:00:00Z</when>\
                <gx:coord>1 2 3</gx:coord>\
                <gx:angles>4 5 6</gx:angles>\
              </gx:Track>\
            </Placemark>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - gx:angles are not supported in gx:Tracks');
        });
    });

    it('Model geometry shows warning)', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <Model></Model>\
            </Placemark>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported geometry: Model');
        });
    });

    it('ExtendedData with SchemaData or custom XML show warnings', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <LineString>\
                <coordinates>1,2,3 \
                         4,5,6 \
                </coordinates>\
              </LineString>\
              <ExtendedData xmlns:prefix="test">\
                <SchemaData></SchemaData>\
              </ExtendedData>\
            </Placemark>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(2);
            expect(console.log).toHaveBeenCalledWith('KML - SchemaData is unsupported');
            expect(console.log).toHaveBeenCalledWith('KML - ExtendedData with xmlns:prefix is unsupported');
        });
    });

    it('Features with an AbstractView show warnings', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <LineString>\
                <coordinates>1,2,3 \
                         4,5,6 \
                </coordinates>\
              </LineString>\
              <Camera></Camera>\
              <LookAt></LookAt>\
            </Placemark>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(2);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported view: Camera');
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported view: LookAt');
        });
    });

    it('Features with a Region shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
              <LineString>\
                <coordinates>1,2,3 \
                         4,5,6 \
                </coordinates>\
              </LineString>\
              <Region></Region>\
            </Placemark>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(1);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Placemark Regions are unsupported');
        });
    });

    it('NetworkLink with a viewRefreshMode=onRegion shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/simple.kml</href>\
              <viewRefreshMode>onRegion</viewRefreshMode>\
            </Link>\
          </NetworkLink>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(2);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported viewRefreshMode: onRegion');
        });
    });

    it('Having a gx:Tour shows warning)', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Document xmlns="http://www.opengis.net/kml/2.2"\
                       xmlns:gx="http://www.google.com/kml/ext/2.2">\
              <gx:Tour>\
              </gx:Tour>\
            </Document>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(0);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - Unsupported feature: Tour');
        });
    });

    it('NetworkLink: onExpire without an expires shows warning', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/simple.kml</href>\
              <refreshMode>onExpire</refreshMode>\
            </Link>\
          </NetworkLink>';

        spyOn(console, 'log').and.callThrough();

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(2);
            expect(console.log.calls.count()).toEqual(1);
            expect(console.log).toHaveBeenCalledWith('KML - refreshMode of onExpire requires the NetworkLinkControl to have an expires element');
        });
    });

    it('NetworkLink: Heading and pitch can be undefined if the camera is in morphing mode', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <NetworkLink id="link">\
            <Link>\
              <href>./Data/KML/simple.kml</href>\
              <refreshMode>onExpire</refreshMode>\
            </Link>\
          </NetworkLink>';

        var camera = createCamera({
            offset: Cartesian3.fromDegrees(-110, 30, 1000)
        });
        Camera.clone(options.camera, camera);

        var kmlOptions = {
            camera: camera,
            canvas: options.canvas
        };

        camera._mode = SceneMode.MORPHING;

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), kmlOptions).then(function(dataSource) {
            expect(dataSource.entities.values.length).toEqual(2);
        });
    });

    it('when clampToGround is false, height isn\'t set if the polygon is extrudable' , function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>relativeToGround</altitudeMode>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight.getValue()).toEqual(true);
            expect(entity.polygon.height).toBeUndefined();
        });
    });

    it('when clampToGround is false, height is set to 0 if polygon isn\'t extrudable' , function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
          <Placemark>\
            <Polygon>\
              <altitudeMode>clampToGround</altitudeMode>\
            </Polygon>\
          </Placemark>';

        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), options).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.polygon.perPositionHeight).toBeUndefined();
            expect(entity.polygon.height.getValue()).toEqual(0);
        });
    });

    it('when a LineString is clamped to ground and tesselated, entity has a corridor geometry and ColorProperty', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <Placemark>\
                <Style>\
                    <LineStyle>\
                        <color>FFFF0000</color>\
                    </LineStyle>\
                </Style>\
                <LineString>\
                    <altitudeMode>clampToGround</altitudeMode>\
                    <tessellate>true</tessellate>\
                    <coordinates>1,2,3\
                                4,5,6\
                    </coordinates>\
                </LineString>\
            </Placemark>';
        var clampToGroundOptions = combine(options, { clampToGround : true });
        return KmlDataSource.load(parser.parseFromString(kml, "text/xml"), clampToGroundOptions).then(function(dataSource) {
            var entity = dataSource.entities.values[0];
            expect(entity.corridor).toBeDefined();
            expect(entity.corridor.material).toBeInstanceOf(ColorMaterialProperty);
        });
    });
});
