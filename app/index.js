import clock from "clock";
import * as util from "./utils";
import { HeartRateSensor } from "heart-rate";
import document from "document";
import * as messaging from "messaging";
import { display } from "display";
import { me as appbit } from "appbit";
import { me as device } from "device";
import { today, goals } from "user-activity";
import { preferences, units } from "user-settings";

const heartImage = document.getElementById("hrm-img");
const separator = document.getElementById("separator");
const deviceType = device.modelName;
updateActivity();

display.addEventListener("change", () => {
  // Automatically stop all sensors when the screen is off to conserve battery
  display.on ? sensors.map(sensor => sensor.start()) : sensors.map(sensor => sensor.stop());
  if (display.on == true){
    updateActivity();
  }
});


/************** Date/Time ******************************/
let date = document.getElementById("date");
let time = document.getElementById("time");

clock.granularity = "seconds"; // seconds, minutes, hours
clock.ontick = (evt) => {
   date.text = (evt.date.toString().slice(0,7).toUpperCase() + evt.date.toString().slice(7,10));
   let hours = evt.date.getHours();
   if (preferences.clockDisplay === "12h") {
      hours = (hours + 24) % 12 || 12;
   }
   let mins = ("0" + evt.date.getMinutes()).slice(-2);
   time.text = hours + ":" + mins;
}

/************** Heartrate ******************************/
const hrmData = document.getElementById("hrm-data");
const sensors = [];
var hrInterval = null;

if (HeartRateSensor) {
  const hrm = new HeartRateSensor({ frequency: 1 });
  hrm.addEventListener("reading", () => {
    hrmData.text = hrm.heartRate ? hrm.heartRate : 0;
    clearInterval(hrInterval);
    hrInterval = setInterval(function() {
      if (heartImage.href === 'assets/hr_solid.png'){
        heartImage.href = 'assets/heartrate.png';
      } else{
        heartImage.href = 'assets/hr_solid.png';
      }
    }, (30*1000)/hrm.heartRate);
  });
  sensors.push(hrm);
  hrm.start();
  
} else {
  hrmData.style.display = "--";
}

/************** Activity ******************************/
function updateActivity() {
  let background = document.getElementById("background");
  const distanceData = document.getElementById("distance-data");
  const caloriesData = document.getElementById("calories-data");
  const elevationData = document.getElementById("elevation-data");
  const stepsData = document.getElementById("steps-data");

  const distanceFill = document.getElementById("distance");
  const caloriesFill = document.getElementById("calories");
  const elevationFill = document.getElementById("floors");
  const stepsFill = document.getElementById("steps");
  const fullWidth = deviceType == "Ionic" ? 155 : 139;
  const baseWidth = 30;
  
  if (appbit.permissions.granted("access_activity")) {
    if (units.distance === 'us'){
      distanceData.text = Math.round((today.adjusted.distance*0.000621371192) * 100) / 100;
    }else{
      distanceData.text = (today.adjusted.distance / 1000).toFixed(1);
    }
    caloriesData.text = today.adjusted.calories;
    elevationData.text = today.adjusted.elevationGain;
    stepsData.text = today.adjusted.steps;


    if (goals.distance < today.adjusted.distance){
      distanceFill.width = fullWidth
    } else {
      distanceFill.width = today.adjusted.distance / goals.distance * (fullWidth - baseWidth) + baseWidth;
    }

    if (goals.calories < today.adjusted.calories){
      caloriesFill.width = fullWidth
    } else {
      caloriesFill.width = today.adjusted.calories / goals.calories * (fullWidth - baseWidth) + baseWidth;
    }

    if (goals.elevationGain < today.adjusted.elevationGain){
      elevationFill.width = fullWidth
    } else {
      elevationFill.width = today.adjusted.elevationGain / goals.elevationGain * (fullWidth - baseWidth) + baseWidth;
    }

    if (goals.steps < today.adjusted.steps){
      stepsFill.width = fullWidth
    } else {
      stepsFill.width = today.adjusted.steps / goals.steps * (fullWidth - baseWidth) + baseWidth;
    }
  }
}


/************** Weather ******************************/
const weatherImage = document.getElementById("weather-img");
const weatherData = document.getElementById("weather-data");

// Request weather data from the companion
function fetchWeather() {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    // Send a command to the companion
    messaging.peerSocket.send({
      command: 'weather'
    });
  }
}

// Display the weather data received from the companion
function processWeatherData(data) {
  weatherData.text = Math.round( data.temperature ) + '&#176;';
  
  switch (data.conditions){
    case 'Clouds':
      weatherImage.href = 'assets/weather/fewclouds-day.png';
      weatherImage.style.fill = 'grey';
      break;
    case 'Clear':
      weatherImage.href = 'assets/weather/clearsky-day.png';
      weatherImage.style.fill = 'yellow';
      break;
    case 'Snow':
      weatherImage.href = 'assets/weather/snow.png';
      weatherImage.style.fill = 'white';
      break;
    case 'Rain':
      weatherImage.href = 'assets/weather/rain.png';
      weatherImage.style.fill = '#7898f8';
      break;
    case 'Drizzle':
      weatherImage.href = 'assets/weather/showerrain.png';
      weatherImage.style.fill = '#48D1CC';
      break;
    case 'Thunderstorm':
      weatherImage.href = 'assets/weather/thunderstorm.png';
      weatherImage.style.fill = '#000080';
      break;
    default:
      weatherImage.href = 'assets/weather/mist.png';
      weatherImage.style.fill = 'white';
      break;
  }
}

// Message is received
messaging.peerSocket.onmessage = evt => {
  console.log(`App received: ${JSON.stringify(evt)}`);   
  if (evt.data.temperature) {
    processWeatherData(evt.data);
  }
};

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("App Socket Open");
  // Fetch weather when the connection opens
  fetchWeather();
};

// Message socket closes
messaging.peerSocket.onclose = () => {
  console.log("App Socket Closed");
};

