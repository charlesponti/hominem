/* global google */

function initialize() {
  var directionsList = document.getElementById('directions');
  var mapEl = document.getElementById("map-canvas");
  var form = document.getElementById('locationForm');
  var directionsForm = document.getElementById('directionsForm');
  var geocoder = new google.maps.Geocoder();
  var directionsService = new google.maps.DirectionsService();

  var mapOptions = {
    center: new google.maps.LatLng(-34.397, 150.644),
    zoom: 8
  };

  var map = new google.maps.Map(mapEl, mapOptions);

  /**
   * @param  {Array} locations
   */
  var generateMarkers = function(locations) {
    return locations.map(function(locale) {
      return new google.maps.Marker({
        position: locale.geometry.location,
        map: map,
        title: locale.formatted_address
      });
    });
  };
  
  directionsForm.onsubmit = function(e) {
    e.preventDefault();
    var request = {
      origin: this.origin.value,
      destination: this.destination.value,
      travelMode: google.maps.TravelMode.DRIVING
    };
    directionsService.route(request, function(directions) {
      var routes = directions.routes
      var legs = routes[0].legs;
      var steps = legs[0].steps;
      steps.forEach(function(s) { 
        var li = document.createElement('li');
        li.innerHTML = s.instructions;
        directionsList.appendChild(li);
      });
    });
  };

  form.onsubmit = function(e) {
    e.preventDefault();
    geocoder.geocode({ 
      address: this.location.value
    }, generateMarkers);
  };

}

google.maps.event.addDomListener(window, 'load', initialize);