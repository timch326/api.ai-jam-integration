const request = require('request');

const BASE_URL = 'https://api.api.ai/v1/';
const ACCESS_TOKEN = '525b66050466460f94c939fa8a9d7968';

module.exports = function() {
    return {
        get: apiAiRequest.bind(null, 'GET'),
        post: apiAiRequest.bind(null, 'POST'),
        delete: apiAiRequest.bind(null, 'DELETE')
    };

    function apiAiRequest(method, endPointURL, callback) {
        const options = {
            url: BASE_URL + endPointURL,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + ACCESS_TOKEN
            },
            json: true
        };
        console.log('Making api.ai request', options);

        request(options, (error, response, body) => {
            console.log(`${endPointURL} ${response.statusCode}`, body);

            if (response.statusCode != 200 || !body.d || body.d.error || !body.d.results) {
                callback ? callback(body, response, body) : null;
            }
            else {
                callback ? callback(error, response, body) : null;
            }
        });
    }
}