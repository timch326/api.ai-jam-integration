const express = require('express');
const request = require('request');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

const JAM_TOKEN = 'ub1IBT0aJ4swyDgHV9kl9ieLP3AYHRddyDBP4BKw';
const DC_NAME = 'developer';
const ODATA_URL = `https://${DC_NAME}.sapjam.com/api/v1/OData/`;

const configure = require('./server/requestBuilder')(ODATA_URL, JAM_TOKEN);
const searchRequestHandler = require('./server/searchHandler');

app.use(morgan('combined'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('static'));

app.listen(port, function() {
  console.log(`Server started at port ${port}`);
});

app.post('/voice', function(req, res) {
    var params = req.body.result.parameters;
    switch (req.body.result.action) {
        case 'getNotifications':
            var endPointParams = ['$expand=Sender'];
            if (!params.generic_quantity){
                endPointParams.push(`$top=${params.number || 5}`);
            }

            request(configure(`Notifications?` + endPointParams.join('&')), (error, response, body) => {
              var notifications = body.d.results;
              if (params.sender) {
                  notifications = notifications.filter(notification => (
                      notification.Sender.FirstName === params.sender || notification.Sender.LastName === params.sender || notification.Sender.FullName === params.sender
                      ));
              }
              notifications = notifications.map(notification => {
                  return {
                      text: notification.Message,
                      uri: notification.WebURL,
                      title: notification.Description,
                      date: notification.CreatedAt,
                      eventType: notification.EventType
                  };
              });
              if (notifications.length) {
                  res.json({"speech":"These are the notifications", "data": notifications});
              } else {
                  res.json({"speech": 'You have no notifications' + (params.sender ? ` from ${params.sender}.` : '.'), "data": []});
              }
              });

            break;
        case 'whoAmI':
            request(configure('Self'), (error, response, body) => {
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
        case 'search':
            request(configure(`Search?Query='${params.query}'`), searchRequestHandler(configure, params, res));
            break;
        default:
            res.status(400).end();
    }
});