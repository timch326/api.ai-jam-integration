const express = require('express');
const request = require('request');
const morgan = require('morgan');
const bodyParser = require("body-parser")
const app = express();
const port = process.env.PORT || 3000;

const JAM_TOKEN = 'jDV8vNbgc5O7puxSze07Z30MpbBhDtQLLqYKrvNw';

app.use(morgan('combined'))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('static'));

app.listen(port, function() {
  console.log(`Server started at port ${port}`);
});

app.get('/hello', function(req, res){
    res.send('Hello World');
});

app.post('/voice', function(req, res) {
    switch (req.body.result.action) {
        case 'getNotifications':
            res.json({"speech":"test_speech", "data": "test"});
            break;
        case 'whoAmI':
            const options = {
                url: 'https://developer.sapjam.com/api/v1/OData/Self?$format=json',
                headers: {
                    'Authorization': 'Bearer ' + JAM_TOKEN
                },
                json: true
            }
            request(options, (error, response, body) => {
                const FullName = body.d.results.FullName;
                const Title = body.d.results.Title;
                
                res.json({
                    speech: `You are ${FullName}` + (Title ? `, a ${Title}.` : '.'),
                    data: body.d.results
                });
            });
            break;
        default:
            res.status(400).end();
    }
});
