const request = require('request');
const parallel = require('run-parallel');

const SEARCH_RESOLVE_LIMIT = 3;

// Returns a callback function for the 'request' function
module.exports = function searchRequestHandler(requestBuilder, params, res) {

    return (error, response, body) => {
        resolveSearchRequests(body.d.results, params, res);
    };

    function resolveSearchRequests(searchResults, params, res) {
        const searchCount = searchResults.length;
        const hasManyResults = searchCount > SEARCH_RESOLVE_LIMIT;

        parallel(searchResults.slice(0, SEARCH_RESOLVE_LIMIT).map(resolveSearchRequest), (error, results) => {
            if (!error) {
                res.json({
                    speech: `I have found ${searchCount} search results for "${params.query}".` + (hasManyResults ? ' Here are the first ${SEARCH_RESOLVE_LIMIT}.' : ''),
                    data: results.map(standardize)
                });
            }
            else {
                res.status(500).end();
            }
        });
    }

    function resolveSearchRequest(searchResult) {
        return callback => {
            request(requestBuilder(`SearchResults('${searchResult.Id}')?$expand=ObjectReference`), (error, response, body) => {
                callback(body.d.error, body.d.results);
            });
        };
    }

    function standardize(resolvedSearchResult) {
        const item = resolvedSearchResult.ObjectReference;
        return {
            title: item.Title,
            text: '',
            uri: item.WebURL,
            date: resolvedSearchResult.CreatedAt,
            eventType: item.Type
        };
    }
};