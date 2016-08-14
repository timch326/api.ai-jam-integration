const jamOdata = require('./jamOdata');

const SEARCH_RESOLVE_LIMIT = 3;

// Returns a callback function for the 'request' function
module.exports = {
    handleRequest: function(params, results, callback) {

        resolveSearchRequests(results, params);

        function resolveSearchRequests(searchResults, params) {
            const searchCount = searchResults.length;
            const hasManyResults = searchCount > SEARCH_RESOLVE_LIMIT;

            var outputText = 'I found no search results for ' + params.query;
            if (searchCount) {
                outputText = `I have found ${searchCount} search results for "${params.query}".` + (hasManyResults ? ' Here are the first ${SEARCH_RESOLVE_LIMIT} results.' : '');
            }

            callback({
                speech: outputText,
                displayText: outputText,
                data: searchResults.map(standardize),
                contextOut: searchCount ? [{
                    name: 'hasSearchResults',
                    parameters: {
                        searchResults: searchResults,
                        readCount: 0
                    }
                }] : null
            });
        }
    },

    handleReadRequest: function(apiRequest, callback) {
        const searchContext = apiRequest.contexts.find(context => context.name == 'hassearchresults').parameters;
        const searchResults = searchContext.searchResults;
        const readCount = searchContext.readCount;

        var text = (readCount >= searchResults.length) ? "I've read all search results." : describeSearchResult(searchResults[readCount]);
        
        callback({
            speech: text,
            displayText: text,
            data: (readCount >= searchResults.length) ? [] : [searchResults[readCount]].map(standardize),
            contextOut: (readCount < searchResults.length) ? [{
                name: 'hasSearchResults',
                parameters: {
                    searchResults: searchResults,
                    readCount: readCount + 1
                }
            }] : null
        });
    }
};

function describeSearchResult(searchResult) {
    const itemName = searchResult.ObjectReference.Title;
    const creatorName = searchResult.Creator.FullName;
    
    switch (searchResult.ObjectReference.Type) {
        case 'Group':
            return `There is a group called ${itemName}.` + (creatorName ? `It's created by ${creatorName}.` : ''); 
        case 'ContentItem':
            if (searchResult.ObjectReference.ContentType == 'linked') {
                return creatorName ? `${creatorName} linked a web page called "${itemName}"".` : `There is a web page called "${itemName}"`;
            }
            return `I found a content page titled ${itemName}.` + (creatorName ? `It's created by ${creatorName}.` : ''); 
        case 'Member':
            return `There is a person called ${itemName}.`;
        default:
            return searchResult.Description || searchResult.ObjectReference.Title;
    }
}

function describeSearchResultDetails(searchResult, callback) {
    const id = searchResult.ObjectReference.Id;
    
    switch (searchResult.ObjectReference.Type) {
        case 'Group':
            jamOdata.get(`Groups('${id}')`, (error, response, body) => {
                
            });
        case 'ContentItem':
            if (searchResult.ObjectReference.ContentType == 'linked') {}

        case 'Member':
        default:
            callback('Click on the link below for more details.');
    }
}

function standardize(searchResult) {
    const item = searchResult.ObjectReference;
    return {
        title: item.Title,
        text: '',
        uri: item.WebURL,
        date: searchResult.CreatedAt,
        eventType: item.Type
    };
}