module.exports = function configure(odataUrl, jamToken) {
    return endPoint => ({
        url: odataUrl + endPoint,
        headers: {
            'Authorization': 'Bearer ' + jamToken
        },
        json: true
    });
};