const request = require('request');
const parallel = require('run-parallel');

const SEARCH_RESOLVE_LIMIT = 3;

// Returns a callback function for the 'request' function
module.exports = function searchRequestHandler(requestBuilder, params, res) {

    return (error, response, body) => {
        error ? res.status(500).end() : resolveSearchRequests(body.d.results, params, res);
    };

    function resolveSearchRequests(searchResults, params, res) {
        const searchCount = searchResults.length;
        const hasManyResults = searchCount > SEARCH_RESOLVE_LIMIT;
        
        res.json({
            speech: `I have found ${searchCount} search results for "${params.query}".` + (hasManyResults ? ' Here are the first ${SEARCH_RESOLVE_LIMIT}.' : ''),
            data: searchResults.map(standardize)
        });
    }
    
    function standardize(searchResult) {
        const item = searchResult.ObjectReference;
        return {
            title: item.Title,
            text: '',
            uri: item.WebURL,
            date: searchResult.CreatedAt,
            eventType: item.Type
        }
    }
};