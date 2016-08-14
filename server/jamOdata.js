const request = require('request');

module.exports = function jamOdata(odataUrl, jamToken) {
    return {
        get: odataRequest.bind(null, 'GET'),
        post: odataRequest.bind(null, 'POST')
    };

    function odataRequest(method, endPointURL, callback) {
        const options = {
            url: odataUrl + endPointURL,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + jamToken
            },
            json: true
        };
        console.log('Making Jam Odata Request.', options);
        
        request(options, (error, response, body) => {
            console.log(`${endPointURL} ${response.statusCode}`, body);
            
            if (response.statusCode != 200 || !body.d || body.d.error || !body.d.results) {
                callback(body, response, body);
            } else {
                console.log()
                callback(error, response, body);
            }
        });
    }
};
