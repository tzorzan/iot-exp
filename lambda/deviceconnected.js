const iot_exp_resource_attribute = "iot-exp-resource";
const iot_exp_roles_attribute = "iot-exp-roles";

const ROLES = {
    SENSOR: "sensor",
    MONITOR: "monitor",
    DISPLAY: "display",
    BUTTON: "button"
  };  

const AWS = require('aws-sdk');
const Iot = new AWS.Iot();
const IotData = new AWS.IotData({endpoint: process.env.IOT_ENDPOINT});

exports.handler = (event, context, callback) => {
    console.log("Event: " + JSON.stringify(event));
    var byThingName = {
        thingName: event.clientId
    };

    Iot.describeThing(byThingName).promise()
    .then(data => {
        var shadow = { 
            state: {
                desired: {
                    resource: data.attributes[iot_exp_resource_attribute], 
                    roles: data.attributes[iot_exp_roles_attribute]
                }
            }
        };
        var params = {
            payload: JSON.stringify(shadow),
            thingName: event.clientId
        }
        console.log("Updating thing: " + event.clientId + " with shadow: " + JSON.stringify(shadow));
        return IotData.updateThingShadow(params).promise();
    })
    .then((response) => callback(null, response))
    .catch(err => console.log(err));
};
