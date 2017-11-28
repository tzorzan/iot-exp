const iot_exp_resource_attribute = "iot-exp-resource";
const iot_exp_roles_attribute = "iot-exp-roles";

const MONITOR = {
    UNKNOWN: 0,
    FREE: 1,
    WAITING: 2,
    OCCUPIED: 3
  };  

const AWS = require('aws-sdk');
const Iot = new AWS.Iot();
const IotData = new AWS.IotData({endpoint: process.env.IOT_ENDPOINT});

exports.handler = (event, context, callback) => {
    console.log("Event: " + JSON.stringify(event));
    var byThingName = {
        thingName: event.thing
    };

    Iot.describeThing(byThingName).promise()
    .then(data => data.attributes[iot_exp_resource_attribute])
    .then(resource => {
        var byResourceAttribute = {
            attributeName: iot_exp_resource_attribute,
            attributeValue: resource
        };
        return Iot.listThings(byResourceAttribute).promise()
    })
    .then(list => {
        return list.things
            .filter(thing => thing.attributes[iot_exp_roles_attribute].includes('monitor'))
            .map(thing => thing.thingName);
    })
    .then(thingsToUpdate => {
        const requests = thingsToUpdate.map(thing => {
            var monitor = event.state.sensor?MONITOR.OCCUPIED:MONITOR.FREE;
            var shadow = { state: { desired: { monitor: monitor } } };
            var params = {
                payload: JSON.stringify(shadow),
                thingName: thing
            }
            console.log("Updating thing: " + thing + " with shadow: " + JSON.stringify(shadow));
            return IotData.updateThingShadow(params).promise();
        });
        return Promise.all(requests);
    })
    .then((responses) => callback(null, responses))
    .catch(err => console.log(err));
};
