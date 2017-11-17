const AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
    console.log(event);
    callback(null, event);
};
