define(['N/error'], function(error){

    var exports = {};

    const TEMPATE_ID = {
        ENGLISH: {
            A: '49',
            B: '48'
        },
        FRENCH: {
            A: '197',
            B: '199'
        },
        SPANISH: {
            A: '198',
            B: '200'
        },
        GERMAN: {
            A: '245',
            B: '246'
        },
        CHINESE: {
            A: '249',
            B: '250'
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
    }

    exports.handleErrorIfAny = handleErrorIfAny;
    exports.TEMPATE_ID = TEMPATE_ID;
    return exports;
});