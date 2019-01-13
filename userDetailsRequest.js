const AWS = require('aws-sdk');
const http = require('http');
const crypto = require("crypto");

const docClient = new AWS.DynamoDB.DocumentClient({ region: 'eu-west-2' });
const table = 'apiTest'

//This is a AWS Lambda function that is saved and executed on that service. I've included it here for completeness.

exports.handler = function(event, context) {
    
    //event contains the data from the process that initiated the lambda - in this case an API post using AWS API gateway

    var decisionPromise = new Promise(function(resolve, reject) {
        callValidationAPI(event, context, resolve, reject);
    });

    var insertPromise = new Promise(function(resolve, reject) {
        insertCustomerData(event, context, resolve, reject);
    });


    Promise.all([decisionPromise, insertPromise]).then(function(values) {
        updateCustomerData(context, values[0], values[1]);
    }).catch(error => {
        console.log(error.message);
    });

};

const insertCustomerData = async(event, context, resolve, reject) => {
    const id = crypto.randomBytes(16).toString("hex");


    // Create the DynamoDB service object

    var params = {
        TableName: table,
        Item: {
            "customerID": id,
            "firstName": event.body.firstName,
            "lastName": event.body.lastName,
            "dateOfBirth": event.body.dateOfBirth,
            "dateAdded": Date.now()
        }
    };

    // Call DynamoDB to add the item to the table

    docClient.put(params, function(err, data) {
        if (err) {
            console.log("Error", err);
            reject("error");
            context.succeed("Error inserting data to table");
        }
        else {
            console.log("Success", data);
            resolve(id);
        }
    });
};

const callValidationAPI = async(event, context, resolve, reject) => {
    
    var post_data = JSON.stringify(
        event.body
    );

    var post_options = {
        host: 'dummydecisionengine.azurewebsites.net',
        path: '/decision',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };

    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        console.log("Status: " + res.statusCode);
        res.on('data', function(chunk) {
            console.log('Response: ' + chunk);
            resolve(chunk);
            //context.succeed('success');
        });
        res.on('error', function(e) {
            console.log("Got error: " + e.message);
            //even if there is an error, I still use resolve() instead of reject() so that it calls the next process and logs the fact there has been an error in the database
            resolve("failure!");
            context.succeed('Error calling external API');
        });

    });

    // post the data
    post_req.write(post_data);
    post_req.end();
};

const updateCustomerData = async(context, decision, recordID) => {

    try {
        decision = (JSON.parse(decision)).DecisionResult.toString();
    }
    catch (err) {
        decision = "An error has occured";
    }

    var params = {
        TableName: table,
        Key: {
            "customerID": recordID
        },
        UpdateExpression: "set decision = :d",
        ExpressionAttributeValues: {
            ":d": decision
        },
        ReturnValues: "UPDATED_NEW"
    };

    console.log("Updating the item...");
    docClient.update(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            context.succeed("Error updating the record with a decision");
        }
        else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            context.succeed(decision);
        }
    });

};
