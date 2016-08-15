const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const apiAiRequest = require('./server/api-ai')();
const port = process.env.PORT || 3000;

const JAM_TOKEN = 'ub1IBT0aJ4swyDgHV9kl9ieLP3AYHRddyDBP4BKw';
const DC_NAME = 'developer';
const ODATA_URL = `https://${DC_NAME}.sapjam.com/api/v1/OData/`;

const jamOdata = require('./server/jamOdata')(ODATA_URL, JAM_TOKEN);
const search = require('./server/searchHandler');

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

    switch (req.body.result.action) {
        case 'unreadNotificationCount':
            jamOdata.get(`Notifications_UnreadCount`, (error, response, body) => {
                var count = body.d;
                res.json({
                    "speech": `You have ${count} unread notifications.`,
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
            // Clear any search context
            apiAiRequest.delete(`contexts?sessionId=${req.body.sessionId}`, () => {
                var endPointParams = ['$expand=Sender,ObjectReference'];
                if (!params.generic_quantity) {
                    endPointParams.push(`$top=${params.number || 5}`);
                }

                jamOdata.get(`Notifications?` + endPointParams.join('&'), (error, response, body) => {
                    var notifications = body.d.results;


                    if (params.sender) {
                        notifications = notifications.filter(notification => (
                            notification.Sender.FirstName === params.sender || notification.Sender.LastName === params.sender || notification.Sender.FullName === params.sender
                        ));
                    }

                    const contextOut = [{
                        name: 'hasnotificationresults',
                        parameters: {
                            notifications: notifications,
                            readCount: 0
                        }
                    }];

                    if (notifications.length) {
                        var notificationSpeech = `You've got ${notifications.length > 1 ? notifications.length : 'a'} notification${notifications.length > 1 ? 's' : ''}.`;
                        
                        if (!params.generic_quantity) {
                            notificationSpeech = `Here are you first ${notifications.length} notifications.`;
                        }
                        
                        res.json({
                            speech: notificationSpeech,
                            displayText: "Here are your notifications: ",
                            contextOut: contextOut,
                            data: notifications.map(standardize)
                        });
                    }
                    else {
                        res.json({
                            speech: 'You have no notifications' + (params.sender ? ` from ${params.sender}.` : '.'),
                            displayText: 'You have no notifications' + (params.sender ? ` from ${params.sender}.` : '.'),
                            data: []
                        });
                    }
                });
            });
            break;

        case 'readNotifications':
            var context = req.body.result.contexts.find(context => context.name == 'hasnotificationresults');
            var notifications = context.parameters.notifications;
            var readCount = context.parameters.readCount;
            var current = notifications[readCount];

            var speech = 'You have no more notifications left to read.';

            if (readCount < notifications.length) {
                speech = `${current.Description}` + (current.Message ? ` Saying - ${current.Message}` : '');
            }

            if (readCount == 0) {
                speech = 'Here\'s the first notification - ' + speech;
            }
            else if (readCount == notifications.length - 1) {
                speech = 'Here\'s the last one - ' + speech;
            }
            else {
                speech = 'This is the next one - ' + speech;
            }

            var contextOut = (readCount < notifications.length) ? [{
                name: 'hasnotificationresults',
                parameters: {
                    notifications: notifications,
                    readCount: readCount + 1
                }
            }] : null;

            res.json({
                speech: speech,
                displayText: speech,
                contextOut: contextOut,
                data: readCount < notifications.length ? [notifications[readCount]].map(standardize) : []
            });

            jamOdata.post(`Notification_MarkAsRead?Id='${current.Id}'`);
            break;

        case 'acceptNotification':

            break;

        case 'dismissNotification':
            context = req.body.result.contexts.find(context => context.name == 'hasnotificationresults');
            notifications = context.parameters.notifications;
            readCount = context.parameters.readCount;
            var toDismiss;
            var displayText;
            
            if (readCount == 0) {
                speech = 'You have not listened to a notification yet';
                displayText = `Must listen to a notification to dismiss it`;
            }
            else {
                toDismiss = notifications[readCount - 1];
                speech = 'Notification dismissed';
                displayText = `Notification with id = ${toDismiss.Id} dismissed`;
            }

            contextOut = (readCount < notifications.length) ? [{
                name: 'hasnotificationresults',
                parameters: {
                    notifications: notifications,
                    readCount: readCount
                }
            }] : null;
            

            if (toDismiss) {
                res.json({
                    speech: speech,
                    displayText: displayText,
                    contextOut: contextOut,
                    data: [toDismiss].map(standardize)
                });
                jamOdata.post(`Notification_Dismiss?Id='${toDismiss.Id}'`);
            } else {
                res.json({
                    speech: speech,
                    displayText: displayText,
                    contextOut: contextOut,
                    data: []
                });
            }
            break;

        case 'whoAmI':
            jamOdata.get('Self', (error, response, body) => {
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
            jamOdata.get(`Search?Query='${params.query}'&$expand=ObjectReference,Creator`, (error, response, body) => {
                if (error) {
                    res.status(500).end();
                }
                else {
                    search.handleRequest(req.body, body.d.results, result => res.json(result));
                }
            });
            break;

        case 'readSearchResult':
            search.handleReadRequest(req.body.result, result => res.json(result));
            break;
        default:
            res.status(400).end();
    }

    function standardize(notification) {
        return {
            text: notification.Message,
            uri: notification.WebURL || (notification.ObjectReference ? notification.ObjectReference.WebURL : ''),
            title: notification.Description,
            date: notification.CreatedAt,
            eventType: notification.EventType
        }
    }

});