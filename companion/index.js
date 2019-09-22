import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { geolocation } from "geolocation";

var API_KEY = "5a9de3978c3f1c2eae3026002a35fc27";

// Fetch the weather from OpenWeather
function queryOpenWeather() {
  geolocation.getCurrentPosition(locationSuccess, locationError);
  function locationSuccess(position) {
    var lat = position.coords.latitude;
    var long = position.coords.longitude;
    
    var linkApi = "https://api.openweathermap.org/data/2.5/weather?lat=" + lat + "&lon="  + long + "&units=imperial" + "&APPID=" + API_KEY;
  fetch(linkApi)
  .then(function (response) {
      response.json()
      .then(function(data) {
        // We just want some data
        var weather = {
          temperature: data["main"]["temp"], conditions: data["weather"][0]["main"]
        }
        // Send the weather data to the device
        returnWeatherData(weather);
      });
  })
  .catch(function (err) {
    console.log("Error fetching weather: " + err);
  });
 };
 function locationError(error) {
  console.log("Error: " + error.code,
              "Message: " + error.message);
 }
}

// Send the weather data to the device
function returnWeatherData(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send a command to the device
    messaging.peerSocket.send(data);
  } else {
    console.log("Error: Connection is not open");
  }
}

// Listen for messages from the device
messaging.peerSocket.onmessage = function(evt) {
  if (evt.data && evt.data.command == "weather") {
    // The device requested weather data
    queryOpenWeather();
  }
}

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Companion Socket Open");
  restoreSettings();
  queryOpenWeather();
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("Companion Socket Closed");
};

// A user changes settings
settingsStorage.onchange = evt => {
  let data = {
    key: evt.key,
    newValue: evt.newValue
  };
  sendVal(data);
};

// Restore any previously saved settings and send to the device
function restoreSettings() {
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    if (key) {
      let data = {
        key: key,
        newValue: settingsStorage.getItem(key)
      };
      sendVal(data);
    }
  }
}

// Send data to device using Messaging API
function sendVal(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  }
}
