//encapsulate all code within a IIFE (Immediately-invoked-function-expression) to avoid polluting global namespace
//global object three3d will contain functions and variables that must be accessible from elsewhere
var ThreeDMap = {

    three3dFunction: function three3dFunction(id, indx) {
        "use strict";
        var naColor = "#ffffff"; //white
        var region = abmviz_utilities.GetURLParameter("region");
        var dataLocation = localStorage.getItem(region);
        var fileName = "3DAnimatedMapData.csv";
        var scenario = abmviz_utilities.GetURLParameter("scenario");
        var url = dataLocation + scenario;
        var colors = ["red", "red", "red", "red"]; //these will be replaced by default palette/ramp colors
        var selectedColorRampIndex = 0;
        var allTimeSqrtScale;
        var allTimeLinearScale;
        var palette = [
            ["rgb(0, 0, 0)", "rgb(67, 67, 67)", "rgb(102, 102, 102)"
                , "rgb(204, 204, 204)", "rgb(217, 217, 217)", "rgb(255, 255, 255)"]
            , ["rgb(152, 0, 0)", "rgb(255, 0, 0)", "rgb(255, 153, 0)", "rgb(255, 255, 0)", "rgb(0, 255, 0)"
                , "rgb(0, 255, 255)", "rgb(74, 134, 232)", "rgb(0, 0, 255)", "rgb(153, 0, 255)", "rgb(255, 0, 255)"]
            , ["rgb(230, 184, 175)", "rgb(244, 204, 204)", "rgb(252, 229, 205)", "rgb(255, 242, 204)", "rgb(217, 234, 211)"
                , "rgb(208, 224, 227)", "rgb(201, 218, 248)", "rgb(207, 226, 243)", "rgb(217, 210, 233)", "rgb(234, 209, 220)"
                , "rgb(221, 126, 107)", "rgb(234, 153, 153)", "rgb(249, 203, 156)", "rgb(255, 229, 153)", "rgb(182, 215, 168)"
                , "rgb(162, 196, 201)", "rgb(164, 194, 244)", "rgb(159, 197, 232)", "rgb(180, 167, 214)", "rgb(213, 166, 189)"
                , "rgb(204, 65, 37)", "rgb(224, 102, 102)", "rgb(246, 178, 107)", "rgb(255, 217, 102)", "rgb(147, 196, 125)"
                , "rgb(118, 165, 175)", "rgb(109, 158, 235)", "rgb(111, 168, 220)", "rgb(142, 124, 195)", "rgb(194, 123, 160)"
                , "rgb(166, 28, 0)", "rgb(204, 0, 0)", "rgb(230, 145, 56)", "rgb(241, 194, 50)", "rgb(106, 168, 79)"
                , "rgb(69, 129, 142)", "rgb(60, 120, 216)", "rgb(61, 133, 198)", "rgb(103, 78, 167)", "rgb(166, 77, 121)"
                , "rgb(91, 15, 0)", "rgb(102, 0, 0)", "rgb(120, 63, 4)", "rgb(127, 96, 0)", "rgb(39, 78, 19)"
                , "rgb(12, 52, 61)", "rgb(28, 69, 135)", "rgb(7, 55, 99)", "rgb(32, 18, 77)", "rgb(76, 17, 48)"]
        ];
        //slider
        var handlers = [25, 50, 75];

        var drawCentroids = true;
        var showControls = true;
        var map;
        var periodData = {}; //map of periods with array of all zone quantities - does not need zone ids since used for geostats
        var currentPeriod = 19; //12 noon
        var periods;
        //use Map instead of vanilla object because wish to preserve insertion order
        var marginTop = 0;
        var marginBottom = 50;
        var marginLeft = 110;
        var marginRight = 50;
        var CSS_UPDATE_PAUSE = 150; //milliseconds to pause before redrawing map
        var interval;
        var currentCyclePeriodIndex = 0;
        var cycleGoing = false;
        var breakUp;
        var cycleIncrement = 2;
        var headers = [];
        var zoneData = {}; //map of zoneIds with secondary map for period quantities
        var zoneDataLayer;
        var zoneGeoJSON;
        var paletteRamps = d3.selectAll("#" + id + "-div .ramp");
        var periodNames = [];
        var ZONE_COLUMN = 0;
        var PERIOD_COLUMN = 1;
        var QUANTITY_COLUMN = 2;
        var geoStatsObject;
        var ZONE_FILE_LOC = "";
        var CENTER_MAP = [];
        var showPeriodsAsDropdown;
        var DataHasPeriods;
        var zonefilters = {};
        var ZONE_FILTER_LOC = "";
        var zoneFilterData;
        var zonefiles;
        var zoneheaders = [];
        var zonefilterlabel = "";
        var centroidsOff;
        var addChartToPage = $('#'+id+'-map').children().length ==0;
        //start off chain of initialization by reading in the data

        getTheConfigFile(function () {
            readInFilterData(function () {
                readInData(function () {
                    if (addChartToPage ) {
                        "use strict";

                        createMap(function () {
                            console.log("createMap callback")
                        });
                        setDataSpecificDOM();
                        initializeMuchOfUI();
                        updateCurrentPeriodOrClassification();
                        if (periods.length == 1) {
                            $('#three3d-start-cycle-map').click();
                        }
                    }
                })
            })
        }); //end call to readInData and its follwing callback

        function getTheConfigFile(callback) {

            $.getJSON(dataLocation + "region.json", function (data) {
                var configName = "Default";
                if (data["scenarios"][scenario].visualizations != undefined) {
                    if (data["scenarios"][scenario].visualizations["3DMap"][indx].file) {
                        fileName = data["scenarios"][scenario].visualizations["3DMap"][indx].file;

                    }
                    if (data["scenarios"][scenario].visualizations["3DMap"][indx].info) {
                        var infoBox;
                        infoBox = data["scenarios"][scenario].visualizations["3DMap"][indx].info;
                        $('#' + id + '-div span.glyphicon-info-sign').attr("title", infoBox);
                        $('#' + id + '-div [data-toggle="tooltip"]').tooltip();


                    }
                    if (data["scenarios"][scenario].visualizations["3DMap"][indx].datafilecolumns) {
                        var datacols = data["scenarios"][scenario].visualizations["3DMap"][indx].datafilecolumns;
                        $.each(datacols, function (key, value) {
                            $('#' + id + '-datatable-columns').append("<p>" + key + ": " + value + "</p>");
                        })
                    }
                }
                url += "/" + fileName;
                //go through region level config settings
                $.each(data, function (key, val) {

                    if (key == "ZoneFile")
                        zonefiles = val;
                    if (key == "CenterMap" && CENTER_MAP.length == 0)
                        CENTER_MAP = val;

                });
                if (data["scenarios"] != undefined && data["scenarios"][scenario] != undefined) {
                    if (data["scenarios"][scenario]["CenterMap"] != undefined) {
                        CENTER_MAP = data["scenarios"][scenario]["CenterMap"];
                    }

                }

                var configSettings = data["3DMap"][configName];

                if (configSettings != undefined) {

                    $.each(configSettings, function (opt, value) {
                        if (opt == "ShowPeriodsAsDropdown")
                            showPeriodsAsDropdown = value;
                        if (opt == "ZoneFilterLabel")
                            zonefilterlabel = value;
                        if (opt == "DataHasPeriods")
                            DataHasPeriods = value;
                        if (opt == "ZoneFilterFile" && value != "") {
                            ZONE_FILTER_LOC = value;
                        }
                        if(opt=="ZoneFile"){
                            zonefiles = value;
                        }
                        if (opt == "ZoneFilters") {
                            $.each(value, function (filtercolumn, filtername) {
                                zonefilters[filtercolumn] = filtername;
                            })
                        }
                        if (opt == "CentroidsOff" && centroidsOff == undefined) {
                            centroidsOff = value;
                            drawCentroids = !centroidsOff;
                        }
                    })
                }
            }).complete(function () {
                ZONE_FILE_LOC = zonefiles;
                ZONE_FILTER_LOC = ZONE_FILTER_LOC;
                callback();
            });
        }

        function readInFilterData(callback) {
            if (Object.keys(zonefilters).length > 1 && ZONE_FILTER_LOC != '') {
                var zonecsv;
                d3.text(dataLocation + abmviz_utilities.GetURLParameter("scenario") + "/" + ZONE_FILTER_LOC, function (error, filterdata) {
                    zonecsv = d3.csv.parseRows(filterdata).slice(1);
                    zoneheaders = d3.csv.parseRows(filterdata)[0];
                    $('#' + id + '-filter-label').append(zonefilterlabel);
                    zoneFilterData = d3.nest().key(function (d) {
                        return "filters";
                    }).map(zonecsv);
                    $('#' + id + '-filter-checkboxes').append("<ul>");
                    for (var i = 0; i < zoneheaders.length; i++) {
                        if (zoneheaders[i] in zonefilters) {
                            $('#' + id + '-filter-checkboxes').append('<li><label > <input type="checkbox" colname="' + zoneheaders[i] + '" id="' + zoneheaders[i] + '_id" checked>' + zonefilters[zoneheaders[i]] + '</input></label></li>')
                        }
                    }
                    $('#' + id + '-filter-checkboxes').append("</ul>");
                });
                callback();

            } else {
                $('#' + id + '-filter-label').hide();
                callback();
            }
        }

        function readInData(callback) {
            "use strict";

            d3.text(url, function (error, data) {
                var zonecsv;
                "use strict";
                if (error) {
                    $('#' + id + '-div').html("<div class='container'><h3><span class='alert alert-danger'>Error: An error occurred while loading the 3D Map data.</span></h3></div>");
                    throw error;
                }
                //CHART ALREADY SET
                if(zoneDataLayer != undefined){
                    return;
                }
                var csv = d3.csv.parseRows(data).slice(1);
                headers = d3.csv.parseRows(data)[0];
                if (headers[1] == undefined) {
                    $('#' + id + '-div').html("<div class='container'><h3><span class='alert alert-danger'>Error: An error occurred while loading the 3D Map data.</span></h3></div>");
                    return;
                }
            if(! $.fn.DataTable.isDataTable('#'+id+'-datatable-table')) {
                var columnsDT = [];
                $.each(headers, function (d, i) {
                    columnsDT.push({title: i});
                    $('#' + id + '-datatable-div table thead tr').append("<th>" + i + "</th>")
                });

                $('#' + id + '-datatable-table').DataTable({
                    dom: 'Bfrtip',
                            buttons: {
                                dom: {
                                    button: {
                                        tag: 'button',
                                        className: ''
                                    }
                                },

                                buttons: [
                                    {
                                        extend: 'csv',
                                        className: 'btn',
                                        text: '<span class="glyphicon glyphicon-save"></span>',
                                        titleAttr: 'Download CSV'
                                    }
                                ],
                            },
                    data: csv,
                    columns: columnsDT
                });
            }
                //setDataSpecificDOM();
                data = null; //allow memory to be GC'ed
                var allData = [];
                var periodNames = [];
                zoneData = {};
                var zoneDatum;
                var rolledUpMap = d3.nest().key(function (d) {
                    //convert quantity to a number
                    var quantity = d[QUANTITY_COLUMN] = +d[QUANTITY_COLUMN];
                    //convert periods to integers by removing all non-numeric characters
                    var periodName = d[PERIOD_COLUMN];
                    if ($.inArray(periodName, periodNames) === -1) {
                        periodNames.push(periodName);
                    }
                    var period;
                    if (DataHasPeriods) {
                        period = d[PERIOD_COLUMN] = parseInt(d[PERIOD_COLUMN].replace(/\D/g, ''));
                    }
                    else {
                        period = d[PERIOD_COLUMN] = $.inArray(d[PERIOD_COLUMN], periodNames) + 1;
                    }

                    var zone = d[ZONE_COLUMN] = +d[ZONE_COLUMN];
                    if (zoneData[zone] == undefined) {
                        zoneDatum = zoneData[zone] = {
                            min: 100000000,
                            max: -100000000,
                            minPeriod: -1,
                            maxPeriod: -1,
                            periods: {},
                            filters: {}
                        };
                    }
                    zoneData[zone].periods[period] = quantity;
                    if (Object.keys(zonefilters).length > 1) {
                        for (var i in zonefilters) {

                            zoneData[zone].filters[i] = zoneFilterData.filters[zone - 1][zoneheaders.indexOf(i)];
                        }
                    }

                    if (periodData[period] == undefined) {
                        periodData[period] = [] //array of all quantities during this period for use with geostats
                    }
                    if (!isNaN(quantity)) {
                        periodData[period].push(quantity);
                        if (zoneDatum.min > quantity) {
                            zoneDatum.min = quantity;
                            zoneDatum.minPeriod = period;
                        }
                        if (zoneDatum.max < quantity) {
                            zoneDatum.max = quantity;
                            zoneDatum.maxPeriod = period;
                        }
                    }
                    return zone;
                }).sortKeys(d3.ascending).key(function (d) {
                    return d[PERIOD_COLUMN];
                }).sortKeys(d3.ascending).rollup(function (d) {
                    var quantity = d[0][QUANTITY_COLUMN];
                    if (!isNaN(quantity)) {
                        allData.push(quantity);
                    }
                    return quantity;
                }).map(csv);

                periods = Object.keys(periodData);
                $('#' + id + '-period').empty();

                var selectList =
                    periodNames.forEach(function (d, i) {
                        var perList = $('#' + id + '-period');
                        perList.append($("<option />").val(i + 1).text("" + d));
                    })

                $('#' + id + '-period').val($("#"+id+"-period option:first").val());
                geoStatsObject = new geostats(allData);
                geoStatsObject.min = function () {
                    if (this._nodata())
                        return;

                    this.stat_min = d3.min(this.serie);

                    return this.stat_min;
                };

                geoStatsObject.max = function () {
                    if (this._nodata())
                        return;

                    this.stat_max = d3.max(this.serie);

                    return this.stat_max;
                };

                var minMaxRange = [geoStatsObject.min(), geoStatsObject.max()];
                allTimeLinearScale = d3.scale.linear().domain(minMaxRange).range([0, 1]);
                allTimeSqrtScale = d3.scale.sqrt().domain(minMaxRange).range([0, 1]);
                zoneFilterData = null;
                callback();


            }); //end d3.text
        }; //end readInData

        function setDataSpecificDOM() {
            "use strict";
            $('#' + id + '-div .three3d-purpose').text(headers[2]);
            if (showPeriodsAsDropdown) {
                if (DataHasPeriods == false) {
                    $('#' + id + '-classification-label').hide();
                    $('#' + id + '-classification').hide();
                    $('#' + id + '-current-period').hide();
                    $('#' + id + '-slider-time').hide();
                    $('#' + id + '-slider').hide();
                    $('#' + id + '-redraw').hide();
                    $('#' + id + '-start-cycle-map').hide();
                }
                $('#' + id + '-period-id').show();
            } else {
                $('#' + id + '-period-id').hide();
            }
            $('#'+id+'_id .spinner').remove();
        } //end setDataSpecificDOM

        function addZoneGeoJSONToMap() {
            zoneDataLayer = VIZI.geoJSONLayer(zoneGeoJSON, {
                interactive: false,
                output: true,
                style: styleZoneGeoJSONLayer,
                filter: function (feature, layer) {


                    var isZoneVisible = true;
                    var checkedfilters = $('#' + id + '-filter-checkboxes input[type=checkbox]:checked');
                    var cnttrue = 0;
                    var featureId = feature.properties.id;
                    var zoneDatum = zoneData[featureId];
                    if (zoneDatum != undefined) {
                        checkedfilters.each(function () {
                            var filtername = this.attributes["colname"];
                            cnttrue += parseFloat(zoneDatum.filters[filtername.value]);
                            isZoneVisible = cnttrue > 0;
                        });
                    }
                    return isZoneVisible;
                },
                onEachFeature: function (feature, layer) {
                    if (drawCentroids) {
                        //replace polygon with smaller rect in middle
                        var currentPolygon = layer._coordinates[0];


                    }
                }, //end onEachFeature
            });
            //console.log(zoneDataLayer )
            map.addLayer(zoneDataLayer);

        } //end addZoneGeoJSONToMap

        function redrawMap() {
            "use strict";
            if (zoneDataLayer != undefined) {
                zoneDataLayer.destroy();
                addZoneGeoJSONToMap();
            }
        } //end redrawMap

        function styleZoneGeoJSONLayer(feature) {
            "use strict";
            var color = naColor;
            var periodQuantity = 0;
            var featureId = feature.properties.id;

            if (zoneData[featureId] != undefined) {
                var zoneDatum = zoneData[featureId];
                //possible that even if data for zone exists, could be missing this particular period
                if (zoneDatum.periods[currentPeriod] != undefined) {
                    periodQuantity = zoneDatum.periods[currentPeriod];
                    if (isNaN(periodQuantity)) {
                        color = naColor;
                    } else if (periodQuantity >= breakUp[3]) {
                        color = colors[3];
                    } else if (periodQuantity >= breakUp[2]) {
                        color = colors[2];
                    } else if (periodQuantity >= breakUp[1]) {
                        color = colors[1];
                    } else {
                        color = colors[0];
                    }
                } //end if we have data for this period
            } //end if we have data for this zone
            color = color.toString(); //convert from d3 color to generic since vizicities does not use d3 color object
            //the allowed options are described here: http://leafletjs.com/reference.html#path-options

            var slider = document.getElementById(id + "-opacityRange");

            var returnStyle = {
                height: allTimeSqrtScale(periodQuantity) * 5000,
                color: color,
                transparent: true,
                opacity: slider.value / 100
            };

            return (returnStyle);
        } //end styleZoneGeoJSONLayer function

        function createMap(callback) {
            "use strict";
            $('#' + id + '-map').empty();

            map = VIZI.world(id + "-map");
            map.setView(CENTER_MAP); //centered at CENTER_MAP

            var logEvents = false;
            if (logEvents) {
                var oldEmitter = map.emit;

                map.emit = function () {
                    var eventName = arguments[0];
                    if (['preUpdate', 'postUpdate', 'layerAdded'].indexOf(eventName) == -1) {
                        console.log('got event: ' + eventName + ": " + arguments[1]);
                        //var camera = map.getCamera();
                        //console.log('camera: ' + JSON.stringify(camera))
                    }
                    oldEmitter.apply(oldEmitter, arguments);
                };
            }

            var controls = VIZI.Controls.orbit().addTo(map);

            VIZI.imageTileLayer('//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
            }).addTo(map);


            $.getJSON(dataLocation + "/" + ZONE_FILE_LOC, function (zoneTiles) {
                "use strict";
                //there should be at least as many zones as the number we have data for.
                if (zoneTiles.features.length < Object.keys(zoneData).length) {
                    throw ("Something is wrong! zoneTiles.features.length(" + zoneTiles.features.length + ") < Object.keys(zoneData).length(" + Object.keys(zoneData).length + ").");
                }
                zoneGeoJSON = zoneTiles;

                zoneGeoJSON.features.forEach(function (feature) {
                    var id = feature.properties.id;
                    var zoneDatum = zoneData[id];
                    var latLngs = feature.geometry.coordinates[0];
                    var centroid = L.latLngBounds(latLngs).getCenter();
                    var squareLength = 0.001;

                    //make alternate polygon so user can see just centroid square column
                    feature.perimeterCoordinates = feature.geometry.coordinates;
                    feature.centroidCoordinates = [[
                        [centroid.lat - squareLength, centroid.lng - squareLength],
                        [centroid.lat - squareLength, centroid.lng + squareLength],
                        [centroid.lat + squareLength, centroid.lng + squareLength],
                        [centroid.lat + squareLength, centroid.lng - squareLength],
                        [centroid.lat - squareLength, centroid.lng - squareLength]
                    ]];
                    if (drawCentroids) {
                        feature.geometry.coordinates = feature.centroidCoordinates;
                    }
                }); //end zoneGeoJSON forEach
                addZoneGeoJSONToMap();
                //don't know how to set initiali zoom or tile in vizicities so kluge away!
                for (var zoomCtr = 0; zoomCtr < 30; zoomCtr++) {
                    zoomOut();
                }
                for (var tiltCtr = 0; tiltCtr < 5; tiltCtr++) {
                    tiltUp();
                }

            }); //end getJSON of zoneTiles

            function zoomOut() {
                controls._controls.dollyIn(controls._controls.getZoomScale());

            }

            var defaultAngleMovement = 0.05;

            function tiltUp() {
                controls._controls.rotateUp(-defaultAngleMovement);
            }

            var controlButtons = document.querySelectorAll('.control button');
            for (var i = 0; i < controlButtons.length; i++) {
                controlButtons[i].addEventListener('click', function (e) {
                    var button = this;
                    var title = button.title;
                    var classList = button.classList
                    var increment = classList.contains('forward') || classList.contains('right') || classList.contains('in') || classList.contains('down');
                    var direction = increment ? 1 : -1;
                    var angle = direction * defaultAngleMovement;
                    if (classList.contains('move')) {
                        var distance = direction * 20;
                        if (classList.contains('back') || classList.contains('forward')) {
                            controls._controls.pan(0, distance);
                        } else {
                            controls._controls.pan(distance, 0);
                        }
                    } else if (classList.contains('tilt')) {
                        if (increment) {
                            controls._controls.rotateUp(defaultAngleMovement);
                        } else {
                            tiltUp();
                        }
                        controls._controls.rotateUp(angle);
                    } else if (classList.contains('rotate')) {
                        controls._controls.rotateLeft(angle)
                    } else if (classList.contains('zoom')) {
                        if (increment) {
                            controls._controls.dollyOut(controls._controls.getZoomScale());
                        } else {
                            zoomOut();
                        }
                    }
                });
            } //end for loop over controls
        } //end createMap

        function updateColors(values, themax) {
            "use strict";
            var colorStops = colors[0] + ", "; // start left with the first color
            for (var i = 0; i < values.length; i++) {
                colorStops += colors[i] + " " + (values[i] / (themax / 100.0)) + "%,";
                colorStops += colors[i + 1] + " " + (values[i] / (themax / 100.0)) + "%,";
            }
            // end with the last color to the right
            colorStops += colors[colors.length - 1];
            var css = "";
            if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
                //mozilla
                css = '-moz-linear-gradient(left,' + colorStops + ')';
            } else if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1 || navigator.userAgent.toLowerCase().indexOf('safari') > -1) {
                // Safari 5.1, Chrome 10+
                css = '-webkit-linear-gradient(left,' + colorStops + ')';
            } else {
                //ie
                css = '-ms-linear-gradient(left,' + colorStops + ')';
            }
            $('#' + id + '-slider').css('background-image', css);
        } //end updateColors

        function setColorPalette(clickedIndex) {
            selectedColorRampIndex = clickedIndex;
            var currentPalette = paletteRamps[0][selectedColorRampIndex];
            var rects = d3.select(currentPalette).selectAll("rect");
            rects.each(function (d, i) {
                var paletteColor = d3.rgb(d3.select(this).attr("fill"));
                colors[i] = paletteColor;
            });
            d3.selectAll("#" + id + "-div .ramp").classed("selected", function (d, tempColorRampIndex) {
                return tempColorRampIndex == selectedColorRampIndex;
            });
        }; //end setColorPalette

        function initializeMuchOfUI() {
            console.log("three3d initializeMuchOfUI");
            $("#" + id + "-filter-checkboxes").change(function () {
                redrawMap();
            });
            $("#" + id + "-centroids").change(function () {
                drawCentroids = this.checked;
                zoneGeoJSON.features.forEach(function (feature) {
                    feature.geometry.coordinates = drawCentroids ? feature.centroidCoordinates : feature.perimeterCoordinates;
                }); //end zoneGeoJSON forEach
                redrawMap();
            }); //end change handler
            $("#" + id + "-controls").change(function () {
                showControls = this.checked;
                if (showControls)
                    $('.control button').show();
                else
                    $('.control button').hide();
            });
            $("#" + id + "-centroids").attr('checked', drawCentroids);
            $("#" + id + "-controls").attr('checked', showControls);

            function updateTimeSliderTooltip(value) {
                var timeString = abmviz_utilities.halfHourTimePeriodToTimeString(value);
                $('#' + id + '-slider-time .ui-slider-handle:first').html('<div class="tooltip top slider-tip"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + timeString + '</div></div>');

            }

            var doesntexist = $('#' + id + '-period-id option[value=' + currentPeriod + ']').val() === undefined;
            $("#" + id + "-slider-time").slider({
                range: false,
                min: 1,
                max: periods.length,
                step: 1,
                value: doesntexist ? 1 : currentPeriod,
                create: function (e, ui) {

                    var doesntexist = $('#' + id + '-period-id option[value=' + currentPeriod + ']').val() === undefined;
                    updateTimeSliderTooltip(doesntexist ? 1 : currentPeriod);
                    $('#' + id + '-period').val(doesntexist ? 1 : currentPeriod);
                },
                change: function (e, ui) {
                    currentPeriod = ui.value;
                    updateTimeSliderTooltip(currentPeriod);
                    updateCurrentPeriodOrClassification();
                    var doesntexist = $('#' + id + '-period-id option[value=' + currentPeriod + ']').val() === undefined;
                    $('#' + id + '-period').val(doesntexist ? 1 : currentPeriod);
                },
                slide: function (e, ui) {
                    currentPeriod = ui.value;
                    updateTimeSliderTooltip(currentPeriod);
                    updateCurrentPeriodOrClassification();
                    var doesntexist = $('#' + id + '-period-id option[value=' + currentPeriod + ']').val() === undefined;
                    $('#' + id + '-period').val(doesntexist ? 1 : currentPeriod);
                }
            });
            var doesntexist = $('#' + id + '-period-id option[value=' + currentPeriod + ']').val() === undefined;
            $('#' + id + '-slider-time').slider('option', 'value', doesntexist ? 1 : currentPeriod);
            var colorRamps = paletteRamps.on('click', function (d, i) {
                setColorPalette(i);
                updateColors($("#" + id + "-slider").slider("values"));
                //add delay to redrawMap so css has change to updates
                setTimeout(redrawMap, CSS_UPDATE_PAUSE);
            }); //end on click for ramp/palette
            if ($("#" + id + "-classification").val() == "custom") {
                $("#" + id + "-update-map").css("display", "inline");
            }
            ;
            //Logic for cycling through the maps
            $("#" + id + "-start-cycle-map").click(function () {
                $("#" + id + "-stop-cycle-map").css("display", "inline");
                $("#" + id + "-start-cycle-map").css("display", "none");
                cycleGoing = true;
                currentCyclePeriodIndex = -cycleIncrement;
                cyclePeriod();
            });
            $("#" + id + "-stop-cycle-map").click(function () {
                cycleGoing = false;
                $("#" + id + "-stop-cycle-map").css("display", "none");
                //after clicking button if there is only one period, do not reshow the cycle button
                $("#" + id + "-start-cycle-map").css("display", DataHasPeriods == false ? "none" : "inline");
            });

            var slider = document.getElementById(id + "-opacityRange");
            var output = document.getElementById(id + "-opacityval");
            output.innerHTML = slider.value;
            slider.oninput = function () {
                output.innerHTML = this.value;
                setTimeout(redrawMap, CSS_UPDATE_PAUSE);
            };

            var lastCycleStartTime;

            function cyclePeriod() {
                lastCycleStartTime = new Date().getTime();
                currentCyclePeriodIndex += cycleIncrement;
                if (currentCyclePeriodIndex >= (periods.length - 1)) {
                    currentCyclePeriodIndex = periods.length - 1;
                    $("#" + id + "-stop-cycle-map").click();
                }
                $("#" + id + "-slider-time").slider({
                    value: periods[currentCyclePeriodIndex]
                });
                if (cycleGoing) {
                    var timeInterval = parseInt($("#" + id + "-cycle-frequency").val()) * 1000;
                    var elapsedTimeSinceCycle = new Date().getTime() - lastCycleStartTime;
                    console.log('elapsedTimeSinceCycle: ' + elapsedTimeSinceCycle);
                    setTimeout(cyclePeriod, Math.max(0, timeInterval - elapsedTimeSinceCycle));
                } //end if cycleGoing
            } //end cyclePeriod
            $("#" + id + "-cycle-frequency").change(function () {
                //no need to do anything since cyclePeriod always reads the current #cycle-frequency
            });
            $("#" + id + "-update-map").click(function () {
                var sliderValues = $("#" + id + "-slider").slider("values");
                breakUp[1] = sliderValues[0];
                breakUp[2] = sliderValues[1];
                breakUp[3] = sliderValues[2];
                redrawMap();
            });

            function updateSliderTooltip(values) {
                $('#' + id + '-slider .ui-slider-handle:first').html('<div class="tooltip top slider-tip"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + values[0] + '</div></div>');
                $('#' + id + '-slider .ui-slider-handle:eq(1)').html('<div class="tooltip top slider-tip"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + values[1] + '</div></div>');
                $('#' + id + '-slider .ui-slider-handle:last').html('<div class="tooltip top slider-tip"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + values[2] + '</div></div>');
            } //end updateSliderValues
            $("#" + id + "-slider").slider({
                range: false,
                disabled: ($("#" + id + "-classification").val() != "custom"),
                min: 0,
                max: 100,
                values: handlers,
                create: function (event, ui) {
                    updateSliderTooltip(handlers);
                },
                change: function (event, ui) {
                    updateSliderTooltip(ui.values);
                    var themax = $("#" + id + "-slider").slider("option", "max");
                    updateColors(ui.values, themax);
                }
            });
            updateColors(handlers, $("#" + id + "-slider").slider("option", "max"));
            $("#" + id + "-classification").change(function () {
                updateCurrentPeriodOrClassification();
            });
            $("#" + id + "-naColor").spectrum({
                color: naColor,
                showInput: true,
                className: "full-spectrum",
                showInitial: false,
                showPalette: true,
                showAlpha: true,
                showSelectionPalette: true,
                maxSelectionSize: 10,
                preferredFormat: "hex",
                localStorageKey: "spectrum.demo",
                palette: palette,
                change: function (color) {
                    naColor = color;
                    redrawMap();
                    updateColors($("#" + id + "-slider").slider("values"));
                }
            });
            //initialize the map palette
            setColorPalette(selectedColorRampIndex);
        } //end initializeMuchOfUI
        //hex to rgb for handling transparancy
        function hexToRgb(hex) {
            "use strict";
            var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, function (m, r, g, b) {
                return r + r + g + g + b + b;
            });
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : undefined;
        } //end hexToRgb

        function updateCurrentPeriodOrClassification() {
            "use strict";
            $('#' + id + '-current-period').html(abmviz_utilities.halfHourTimePeriodToTimeString(currentPeriod));
            //console.log('updateCurrentPeriodOrClassification: #three3d-period.val()=' + currentPeriod);
            //handle the different classifications
            var classification = $("#" + id + "-classification").val();
            $("#" + id + "-slider").slider({
                range: false,
                disabled: ($("#" + id + "-classification").val() != "custom")
            });

            if (classification == "custom") {
                $("#" + id + "-update-map").css("display", "inline");
            } else {
                $("#" + id + "-update-map").css("display", "none");
                if (classification == "even-interval") {
                    breakUp = geoStatsObject.getClassEqInterval(4);
                } else if (classification == "quartiles") {
                    breakUp = geoStatsObject.getClassQuantile(4);
                } else {
                    throw ("Unhandled classification: " + classification);
                }
                var newValues = [parseInt(breakUp[1]), parseInt(breakUp[2]), parseInt(breakUp[3])];
                //update the slider
                $("#" + id + "-slider").slider({
                    values: newValues
                });
                updateColors(newValues, breakUp[4]);
            } //end if !custom
            redrawMap();
        }; //end updateCurrentPeriodOrClassification
        $('#' + id + '-period').change(function (d) {
                $('#' + id + '-slider-time').slider('option', 'value', $(this).val())
            }
        );
        $('#' + id + '-geography').change(function (d) {


            "use strict";
            ZONE_FILE_LOC = $('#' + id + '-geography option:selected').text();
            redrawMap();
            setDataSpecificDOM();
            initializeMuchOfUI();
            updateCurrentPeriodOrClassification();
            if (periods.length == 1) {
                $('#' + id + '-start-cycle-map').click();
            }
        });


        //return only the parts that need to be global
        return {
            //nothing neededyet
        };
    }
}; //end encapsulating IIFE
