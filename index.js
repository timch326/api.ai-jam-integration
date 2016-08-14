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

var contextState = {};

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(express.static('static'));
app.use(morgan('combined'));

app.listen(port, function() {
    console.log(`Server started at port ${port}`);
});

app.post('/voice', function(req, res) {
    var params = req.body.result.parameters;
    var contexts = req.body.result.contexts;

    switch (req.body.result.action) {
        case 'unreadNotificationCount':
            request(configure(`Notifications_UnreadCount`), (error, response, body) => {
                var count = body.d;
                res.json({
                    "speech": "This is the unread notification count",
                    "data": [{
                        text: 'There are ' + count + ' unread notifications.',
                        uri: null,
                        title: null,
                        date: null,
                        eventType: 'unreadNotificationCount'
                    }]
                });
            });
            break;



        case 'getNotifications':
            var endPointParams = ['$expand=Sender,ObjectReference'];
            if (!params.generic_quantity) {
                endPointParams.push(`$top=${params.number || 5}`);
            }

            request(configure(`Notifications?` + endPointParams.join('&')), (error, response, body) => {
                var notifications = body.d.results;

                if (params.sender) {
                    notifications = notifications.filter(notification => (
                        notification.Sender.FirstName === params.sender || notification.Sender.LastName === params.sender || notification.Sender.FullName === params.sender
                    ));
                }

                contextState['notifications'] = notifications;
                contextState['notificationCount'] = 0;

                if (notifications.length) {
                    res.json({
                        "speech": "Here are your unread notifications",
                        "data": notifications.map(notification => {
                            return {
                                text: notification.Message,
                                uri: notification.ObjectReference.WebURL,
                                title: notification.Description,
                                date: notification.CreatedAt,
                                eventType: notification.EventType
                            };
                        })
                    });
                }
                else {
                    res.json({
                        "speech": 'You have no unread notifications' + (params.sender ? ` from ${params.sender}.` : '.'),
                        "data": []
                    });
                }
            });
            break;




        case 'readNotifications':
            const notifications = contextState['notifications'];
            const current = notifications[0];
            contextState['currentNotification'] = current;
            
            var speech = 'You have no more notifications left to read.';
            
            if (current) {
                speech = `${current.Description} ` + (current.Message ? current.Message : '');
            }
            
            if (contextState['notificationCount'] == 0) {
                speech = 'Here\'s the first notification - ' + speech;
            } else if (notifications.length == 1) {
                speech = 'Here\'s the last one - ' + speech;
            } else {
                speech = 'This is the next one - ' + speech;
            }

            res.json({
                speech: speech,
                data: notifications
            });
            
            notifications.shift();
            contextState['notificationCount'] = contextState['notificationCount'] + 1;
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
            request(configure(`Search?Query='${params.query}'&$expand=ObjectReference`), searchRequestHandler(configure, params, res));
            break;
        default:
            res.status(400).end();
    }
});