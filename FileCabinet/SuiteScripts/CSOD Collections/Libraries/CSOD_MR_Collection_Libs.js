define(['N/error', 'N/search', 'N/file'], function(error, search, file) {

    var exports = {};

    //@ TODO Change for Production
    const TEMPATE_ID = {
        PROD: {
            ENGLISH: {
                A: '248',
                B: '249'
            },
            FRENCH: {
                A: '250',
                B: '251'
            },
            SPANISH: {
                A: '254',
                B: '255'
            },
            GERMAN: {
                A: '252',
                B: '253'
            },
            CHINESE: {
                A: '256',
                B: '257'
            }
        },
        SB: {
            ENGLISH: {
                A: '245',
                B: '246'
            },
            FRENCH: {
                A: '247',
                B: '248'
            },
            SPANISH: {
                A: '251',
                B: '252'
            },
            GERMAN: {
                A: '249',
                B: '250'
            },
            CHINESE: {
                A: '253',
                B: '254'
            }
        }

    };

    function handleErrorIfAny(summary) {
        var mapSummary = summary.mapSummary;
        mapSummary.errors.iterator().each(function(key, value) {

            var msg = 'Failed to categorize Invoice Internal ID : ' + key +',';
            msg += 'Error : ' + JSON.parse(value).message + '\n';

            error.create({
                name: 'RECORD_UPDATE_FAILED',
                message: msg
            });

            return true;
        });
    };

    var searchToCSV = function(searchId) {
        var content = [];
        var cells = [];
        var headers = [];
        var temp = [];
        var x = 0;

        var src = search.load({
           id: searchId
        });

        var columns = src.columns;
        log.debug('src', columns);

        // set headers
        for(var i = 0; i < columns.length; i++) {
            headers[i] = columns[i].label;
        }
        content[x] = headers;
        x = 1;

        // looping through results
        src.run().each(function(result) {
            // looping through columns
            for(var y = 0; y < columns.length; y++) {
                var searchResult = result.getText(columns[y]);
                if(!searchResult) {
                    searchResult = result.getValue(columns[y]);
                }

                temp[y] = searchResult.replace(/[\n\r,]/g, '');
            }

            content[x] = temp.toString();
            x += 1;
            return true;
        });

        // Creating string var that will be used as CSV content
        var contents = '';
        for(var z = 0; z < content.length; z++) {
            contents += content[z] + '\n';
        }

        var fileObj = file.create({
            name: 'collection_report.csv',
            fileType: file.Type.CSV,
            contents: contents,
            encoding: file.Encoding.UTF8
        });

        return fileObj;
    };

    var getScriptInternalId = function(scriptId, deployId) {
        var internalId = '';
        var scriptdeploymentSearchObj = search.create({
            type: "scriptdeployment",
            filters: [
                ["scriptid","is",deployId]
            ],
            columns: [
                "internalid"
            ]
        });

        if(scriptId) {
            scriptdeploymentSearchObj.filters.push(search.createFilter({
                name: 'internalid',
                join: 'script',
                operator: search.Operator.ANYOF,
                values: scriptId
            }));
        }

        scriptdeploymentSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            internalId = result.getValue({name: 'internalid'});
        });
        return internalId;
    };

    exports.getScriptInternalId = getScriptInternalId;
    exports.handleErrorIfAny = handleErrorIfAny;
    exports.TEMPATE_ID = TEMPATE_ID;
    exports.searchToCSV = searchToCSV;
    return exports;
});