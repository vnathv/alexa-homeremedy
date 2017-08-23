const AWS = require('aws-sdk');
AWS.config.update({
    region: "Location"
});

var docClient = new AWS.DynamoDB.DocumentClient()

var table = "TableName";

var getSolutionForProblem = (problem,callback) => {   
  
    var params = {
        TableName: table,
        Key: {
            "Problem": problem
        }
    };

    docClient.get(params, function (err, data) {
        callback(err, data);
    });

};

module.exports = {
    getSolutionForProblem
};