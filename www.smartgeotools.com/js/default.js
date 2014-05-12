// JavaScript Document
var map;
var taxiMarkers = {};
var nairobi_center = new google.maps.LatLng(-1.284778, 36.824772);

function clearAllTaxiMarkers() {
    for (i in taxiMarkers) {
        try {
            taxiMarkers[i].setMap(null);
        } catch (e) {
            console.log("problem with taxi-marker " + i, taxiMarkers[i]);
        }
    }
}

/**
 * The HomeControl adds a control to the map that simply
 * returns the user to Chicago. This constructor takes
 * the control DIV as an argument.
 * @constructor
 */
function HomeControl(controlDiv, map) {

    // Set CSS styles for the DIV containing the control
    // Setting padding to 5 px will offset the control
    // from the edge of the map
    controlDiv.style.padding = '5px';

    // Set CSS for the control border
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = 'transparent';
    controlUI.style.borderStyle = 'none';
    controlUI.style.marginTop = '40px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to recenter map';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.style.fontFamily = 'Arial,sans-serif';
    controlText.style.fontSize = '100px';
    controlText.style.paddingLeft = '4px';
    controlText.style.paddingRight = '4px';
    controlText.style.borderRadius = '10px';
    controlText.innerHTML = '<img src="images/icons/gps.png" class="thumbnail img-responsive">';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to
    // Chicago
    google.maps.event.addDomListener(controlUI, 'click', function () {
        map.setCenter(nairobi_center)
    });

}

var geocoder;
var myLocation, bluelocation, myDestination;
var mapBounds; //Current Map bounds
var orign;
var destn;

var getLocation = function () {
    if (navigator.geolocation) {
        $('body').addClass('loading');
        $('#hwait').html('Please wait as we determine your location. <br/>Make sure you have enabled location sharing in your browser');
        navigator.geolocation.watchPosition(showMap, showError);
    }

    var defaultPos = {
      'coords': {
            'latitude': -1.284778,
            'longitude': 36.824772
       }
    };

    setTimeout(function () {
        console.log('setting default location');
        $('body').removeClass('loading');
        showMap(defaultPos);
    }, 12000);
};

var showMap = function (position) {
    var point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
    createMap(point);
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'latLng': point
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            if (results[0]) {
                var address = results[0].formatted_address;
                document.getElementById('pickup').value = address;
            }
        }
    });
}

var showError = function (error) {
    createMap(new google.maps.LatLng(-1.284778, 36.824772));
}

var createMap = function (latLng) {
    if (window.map) {
        //window.map.setCenter(latLng);
        return;
    } else {
        window.map = new google.maps.Map(document.getElementById('map'), {
            center: latLng,
            zoom: 12,
            disableDefaultUI: true,
            mapTypeControl: true,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_BOTTOM,
            },
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.BOTTOM_CENTER,
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            },
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
    }
    // Create the DIV to hold the control and
    // call the HomeControl() constructor passing
    // in this DIV.
    var homeControlDiv = document.createElement('div');
    var homeControl = new HomeControl(homeControlDiv, window.map);

    homeControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(homeControlDiv);

    bluelocation = new google.maps.Marker({
        position: latLng,
        draggable: false,
        map: map,
        optimized: false,
        icon: "./images/markers/blue.png"
    });

    myLocation = new google.maps.Marker({
        position: latLng,
        draggable: true,
        map: map,
        optimized: false,
        icon: "./images/markers/marker.png"
    });


    myDestination = new google.maps.Marker({
        position: latLng,
        optimized: false,
        icon: "./images/markers/destination.png"
    });

    google.maps.event.addListener(map, 'center_changed', function (event) {
        mapBounds = {
            sw: map.getBounds().getSouthWest().lat() + "," + map.getBounds().getSouthWest().lng(),
            ne: map.getBounds().getNorthEast().lat() + "," + map.getBounds().getNorthEast().lng()
        }

    });

    google.maps.event.addListener(map, 'tilesloaded', function (event) {
        mapBounds = {
            sw: map.getBounds().getSouthWest().lat() + "," + map.getBounds().getSouthWest().lng(),
            ne: map.getBounds().getNorthEast().lat() + "," + map.getBounds().getNorthEast().lng()
        }
    });
    getAdressLocation('pickup', myLocation);
    getAdressLocation('dropoff', myDestination);
    loadTaxi(2); // 2 is the default selected taxi-type, and map should load with those taxis on the map
}

var lastTaxiType = -1;
var bookingCheckRunning = false;
var loadTaxi = function (taxi_type) {
    if (isNaN(taxi_type) || taxi_type == -1) return;
    if (lastTaxiType != taxi_type) {
        // a new taxi type was selected. Show loading thingy
        $('#hwait').html('Please wait as we find taxis of that type');
        $('body').addClass('loading');
    }
    lastTaxiType = taxi_type;
    $.ajax({
        url: "./php/getData.php?data=taxi&type=" + taxi_type,
        dataType: 'json',
        error: function () {
            setTimeout(function () {
                loadTaxi(lastTaxiType)
            }, 3000);
            for (i in taxiMarkers) {
                try {
                    taxiMarkers[i].setMap(null);
                    delete taxiMarkers[i];
                    break;
                } catch (e) {
                    console.log("problem with taxi-marker " + i, taxiMarkers[i]);
                }
            }
        },
        success: function (data) {
            setTimeout(function () {
                loadTaxi(lastTaxiType)
            }, 3000); // calls loadTaxi() frequently to update the map with the latest taxi locations

            if (!bookingCheckRunning) {
                $('body').removeClass('loading');
            }
            var taxiMarkersToRetain = {};
            $.each(data.data, function (i, item) {
                taxiMarkersToRetain[item.id] = true;
                if (taxiMarkers[item.id]) {
                    // simply updated marker position if it already exists.
                    var point = new google.maps.LatLng(item.location.latitude, item.location.longitude);
                    taxiMarkers[item.id].setPosition(point);
                } else {
                    $("#markers").append('<li><a href="#" rel="' + i + '">' + item.origin + '</a></li> ');

                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(item.location.latitude, item.location.longitude),
                        map: map,
                        title: item.name,
                        icon: "images/icons/" + item.type + "-map.png",

                    });
                    taxiMarkers[item.id] = marker;
                    var contentstring = "<div class='col-md-4'><img src='" + item.photo + "' class='img-rounded' height='58' width='50'></div><div class='col-md-8'><p style='color:black; font-weight:bold;'>" + item.name + "</p><h6 style='color:black; font-weight:bold;'>" + item.vehicle_make + " " + item.vehicle_model + "| " + item.numberplate.substring(0, 3) + "</h6></div>";
                    var infowindow = new google.maps.InfoWindow({
                        content: contentstring,
                    });

                    google.maps.event.addListener(marker, 'click', function () {
                        infowindow.open(map, marker);
                    });
                }
            });
            for (i in taxiMarkers) {
                try {
                    if (!taxiMarkersToRetain[i]) {
                        taxiMarkers[i].setMap(null);
                        delete taxiMarkers[i];
                    }
                } catch (e) {
                    console.log("problem with taxi-marker " + i, taxiMarkers[i]);
                }
            }
        }
    });
}


var locListener;
var desListener;

var getAdressLocation = function (inputID, marker) {
    var input = (document.getElementById(inputID));
    var options = {
        componentRestrictions: {
            country: 'ke'
        }
    };
    var autocomplete = new google.maps.places.Autocomplete(input, options);
    autocomplete.bindTo('bounds', map);
    google.maps.event.addListener(autocomplete, 'place_changed', function () {
        input.className = '';
        var place = autocomplete.getPlace();
        if (!place.geometry) {
            // Inform the user that the place was not found and return.
            input.className = 'notfound';
            return;
        }

        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(13);
        }
        marker.setPosition(place.geometry.location);
        marker.setMap(map);

    });
}
var taxi_assignment, taxi_poll_count = 0,
    check_driver_status, calculate_cost;

var makeBooking = function (data) {
    $("#myModal").modal("hide");
    $("body").addClass("loading");
    $('#hwait').html('Give us a sec..we\'re finding your ride');
    window.bookingCheckRunning = true;
    $.ajax({
        url: 'php/addData.php?data=taxi_assignment',
        data: data,
        type: "POST",
        dataType: 'json',
        success: function (json) {
            if (json.success) {
                window.taxi_assignment = json.id;
                window.check_driver_status = function () {
                    $.ajax({
                        url: 'php/checkdrivers.php?assignment_id=' + window.taxi_assignment,
                        type: "GET",
                        dataType: 'json',
                        success: function (response) {
                            // If response is "0", no driver has been assigned
                            console.log('response', response);
                            if (response.count == "0") {
                                window.taxi_poll_count++;
                                //If function re-runs more than 20 times,
                                //we stop this looping code.
                                if (window.taxi_poll_count > 40) {
                                    document.getElementById("waiting").className = "alert alert-danger";
                                    $('#hwait').html("Sorry, we don't have a ride for you right now. Please try again later");
                                    //cancel request to driver
                                    $.ajax({
                                        url: 'php/cancel_request.php?taxi_assignment_id=' + window.taxi_assignment,
                                        type: "GET",
                                        dataType: 'json',
                                        success: function (response) {
                                            window.setTimeout(function () {
                                                $("body").removeClass("loading");
                                                document.getElementById("waiting").className = "alert alert-blue";
                                                //location.reload();
                                                window.bookingCheckRunning = false;
                                            }, 3000);
                                        }
                                    });
                                    return;
                                }
                                // re-run check_driver_status after 1 second
                                setTimeout(window.check_driver_status, 1000);
                            } else {
                                window.bookingCheckRunning = false;
                                $("body").removeClass("loading");
                                window.location = "driverInformation.php?id=" + response.first_driver + "&assignment_id=" + window.taxi_assignment;
                            }
                        }
                    });
                }
                window.check_driver_status();
            } else {
                alert("There was an error while trying to save your booking. Please try again");
                window.bookingCheckRunning = false;
            }
        }
    });
}

$(document).ready(function () {
    var elementz = document.getElementsByClassName("gm-style-iw");
    elementz.className = elementz.className + " row";
    $(elementz).parent().addClass('well');
    $('#canvasloader-container').hide();
    getLocation();
    $('#menuBottom').click(function () {
        if ($('#panel').is(':hidden')) {
            $('#panel').show('slide', {
                direction: 'down'
            }, 1500)
        } else {
            $('#panel').hide('slide', {
                direction: 'down'
            }, 1500)
        }
    });

    $('.button-set').click(function () {
        $(this).addClass('selected').siblings('.button-set').removeClass('selected');
    });

    $('#pickup').focusin(function () {
        google.maps.event.removeListener(desListener);
        locListener = google.maps.event.addListener(map, 'center_changed', function (event) {
            myLocation.setPosition(map.getCenter())
        });

        if($('#origErr').html().trim()){
            $('.modal-body div[class="row eeee validationErrs"]:nth-of-type(2)').hide();
        }
    });

    $('#dropoff').focusin(function () {
        google.maps.event.removeListener(locListener);
        desListener = google.maps.event.addListener(map, 'center_changed', function (event) {
            myDestination.setPosition(map.getCenter())
        });

        if($('#destErr').html().trim()){
            $('.modal-body div[class="row eeee validationErrs"]:nth-of-type(4)').hide();
        }
    });

    $('#mobile').focusin(function(){
        if($('#mobErr').html().trim()){
            $('.modal-body div[class="row eeee validationErrs"]:nth-of-type(6)').hide();
        }
    });

    calculate_cost = function () {
        var originLatLng = myLocation.getPosition().lat() + "," + myLocation.getPosition().lng();
        var destinationLatLng = myDestination.getPosition().lat() + "," + myDestination.getPosition().lng();
        $.ajax({

            url: 'php/calculate_cost.php?originLatLng=' + originLatLng + '&destinationLatLng=' + destinationLatLng,
            dataType: 'json',
            success: function (response) {
                $('#price').append(response.cost);
            }
        });
    }

    $('#dropoff').focusout(function () {
        google.maps.event.removeListener(locListener);
        google.maps.event.removeListener(desListener);
    });

    $('#request_button').click(function () {
        calculate_cost();
        var origin = $('#pickup').val();
        var destination = $('#dropoff').val();
        var mobile = $('#mobile').val();
        var taxiType = document.querySelector('input[name="options"]:checked').value;
        $('#qwerty').append(origin);
        $('#asdfg').append(destination);
        $('#typer').append(mobile);
        var content = $(this).html();
        $('#contents').hide();
        $('#apendee').append(jQuery('#newcontents'));
        $("#newcontents").show();

    });

    $('#gettaxi').click(function () {
        var origin = $('#pickup').val();
        var destination = $('#dropoff').val();
        var originLatLng = myLocation.getPosition().lat() + "," + myLocation.getPosition().lng();
        var destinationLatLng = myDestination.getPosition().lat() + "," + myDestination.getPosition().lng();
        var favorite = $('#favorite').val();
        var mobile = $('#mobile').val();
        var taxiType = document.querySelector('input[name="options"]:checked').value;
        var areReqDetailsEmpty = checkIfReqDetailsAreEmpty(origin, destination, mobile, taxiType);
        if(areReqDetailsEmpty == true){
            console.log('Not all request details are entered!');
            e.preventDefault();
        }
        else {
            makeBooking({
                mobile: mobile,
                origin: origin,
                destination: destination,
                taxiType: taxiType,
                destinationLatLng: destinationLatLng,
                originLatLng: originLatLng
            });
        }
    });

    var checkIfReqDetailsAreEmpty = function(orig, dest, mobile, taxi){
        if(orig == '' || dest == '' || mobile == '' ||  taxi == ''){
            if(orig == ''){
                $('body #myModal #apendee #contents .modal-body div[class="row eeee validationErrs"]:nth-of-type(2)').show();
                $('.col-xs-10 #origErr').text('Please enter your origin!');
            }

            if(dest == ''){
                $('body #myModal #apendee #contents .modal-body div[class="row eeee validationErrs"]:nth-of-type(4)').show();
                $('.col-xs-10 #destErr').text('Please enter your destination!');
            }

            if(mobile == ''){
                $('body #myModal #apendee #contents .modal-body div[class="row eeee validationErrs"]:nth-of-type(6)').show();
                $('.col-xs-10 #mobErr').text('Please enter your phone number!');
            }

            return true;
        }
        return false;
    }

});
var x;
$(function () {
    $("#car-options label").on("click", function () {
        var $this = $(this);
        window.x = $this;
        var optionElem = $this.children()[0];

        console.log(optionElem);
        loadTaxi(optionElem.value);
    });
});