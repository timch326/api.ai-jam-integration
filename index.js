const express = require('express');
const request = require('request');
const morgan = require('morgan');
const bodyParser = require("body-parser")
const app = express();
const port = process.env.PORT || 3000;

const JAM_TOKEN = 'ub1IBT0aJ4swyDgHV9kl9ieLP3AYHRddyDBP4BKw';
const DC_NAME = 'developer'
const ODATA_URL = `https://${DC_NAME}.sapjam.com/api/v1/OData/`
function options(endPoint) {
            var options = {
                url: ODATA_URL + endPoint,
                headers: {
                    'Authorization': 'Bearer ' + JAM_TOKEN
                },
                json: true
            }
            return options;
};

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
    var params = req.body.result.parameters
    switch (req.body.result.action) {
        case 'getNotifications':
            var endPointParams = ['$expand=Sender'];
            if (!params.generic_quantity){
                endPointParams.push(`$top=${params.number || 5}`);
            }
            
            request(options(`Notifications?` + endPointParams.join('&')), (error, response, body) => {
              var notifications = body.d.results;
              if (params.sender) {
                  notifications = notifications.filter(notification => (
                      notification.Sender.FirstName === params.sender || notification.Sender.LastName === params.sender || notification.Sender.FullName === params.sender
                      ));
              }
              notifications.map(notification => {
                  return {
                      text: notification.Message,
                      uri: notification.WebURL,
                      title: notification.Description,
                      date: notification.CreatedAt,
                      eventType: notifcation.EventType
                  }
              });
              if (notifications.length) {
                  res.json({"speech":"These are the notifications", "data": notifications});
              } else {
                  res.json({'speech': 'You have no notifications' + (params.sender ? ` from ${params.sender}.` : '.')});
              }
              });
              
            break;
        case 'whoAmI':
            request(options('Self'), (error, response, body) => {
                const self = body.d.results;
                const FullName = self.FullName;
                const Title = self.Title;
                const Email = self.Email;
                
                res.json({
                    speech: `You are ${FullName}` + (Title ? `, a ${Title}.` : '.'),
                    data: [{
                        text: 'Email: ' + Email,
                        uri: self.WebURL,
                        title: `You are ${FullName}` + (Title ? `, a ${Title}.` : '.'),
                        date: null,
                        eventType: 'Member_Self'
                    }]
                });
            });
            break;
        default:
            res.status(400).end();
    }
});
