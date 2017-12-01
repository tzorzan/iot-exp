load('api_config.js');
load('api_gpio.js');
load('api_sys.js');
load('api_timer.js');
load('api_rpc.js');
load("api_aws.js");
load("api_pwm.js");

let ROLES = {
  SENSOR: "sensor",
  MONITOR: "monitor",
  DISPLAY: "display",
  BUTTON: "button"
}; 

let MONITOR = {
  UNKNOWN: 0,
  FREE: 1,
  WAITING: 2,
  OCCUPIED: 3
};

let led = Cfg.get('pins.led');
let button = Cfg.get('pins.button');
GPIO.set_mode(led, GPIO.MODE_OUTPUT);
GPIO.set_mode(button, GPIO.MODE_INPUT);
print('LED GPIO:', led, 'BUTTON GPIO:', button);

let state = {
  resource: null,
  roles: null,
  sensor: false,
  monitor: MONITOR.UNKNOWN,
  display: "Booting",
  queue: []
};

function updateDevice() {
  print("UPDATING DEVICE USING STATE: ", JSON.stringify(state));
  if(state.monitor === MONITOR.FREE) {
      PWM.set(led, 50, 1);
  } else if (state.monitor === MONITOR.OCCUPIED) {
      PWM.set(led, 50, 0);
  } else if (state.monitor === MONITOR.UNKNOWN) {
      PWM.set(led, 10, 0.8);
  }
}

updateDevice();

AWS.Shadow.setStateHandler(function(data, event, reported, desired) {
  if (event === AWS.Shadow.CONNECTED) {
    print("AWS.Shadow.CONNECTED: ", JSON.stringify(reported), JSON.stringify(desired)); 
    AWS.Shadow.update(0, {reported: state});  // Report device state on connection
  } else if (event === AWS.Shadow.UPDATE_DELTA) {
    print("AWS.Shadow.UPDATE_DELTA: ", JSON.stringify(reported), JSON.stringify(desired));
    for (let key in state) {
      if (desired[key] !== undefined) 
        state[key] = desired[key];
    }
    updateDevice();
    AWS.Shadow.update(0, {reported: state});  // Report device state after update
  }
}, null);

RPC.addHandler('State.SensorToggle', function(args) {
  AWS.Shadow.update(0, {desired: {sensor: !state.sensor}});
  return true;
});

RPC.addHandler('State.Get', function(args) {
  return state;
});

// On a button press, update state using shadow
GPIO.set_button_handler(button, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 200, function() {
  print("Button pressed.");
  AWS.Shadow.update(0, {desired: {sensor: !state.sensor}});
}, null);
