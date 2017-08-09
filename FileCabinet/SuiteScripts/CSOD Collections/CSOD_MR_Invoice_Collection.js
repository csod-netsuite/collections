/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'],
/**
 * @param {search} search
 */
function(search, record) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
    	var transactionSearchObj = search.create({
    		   type: "transaction",
    		   filters: [
    		      ["mainline","is","T"], 
    		      "AND", 
    		      ["custbody_record_emailed","is","T"], 
    		      "AND", 
    		      ["custbody_adjusted_due_date","isnotempty",""], 
    		      "AND", 
    		      ["status","anyof","CustInvc:A", "CustInvc:D"]
    		   ],
    		   columns: [
    		      "internalid"
    		   ]
    		});

    		return transactionSearchObj
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        log.debug({
            title: 'In Map. Check context',
            details: context.key
        });

        var lookupObj = search.lookupFields({
			type: search.Type.INVOICE,
			id: context.key,
			columns: ['subsidiary', 'amountremaining', 'amountpaid', 'total']
		});

        var subdiaryId = lookupObj.subsidiary[0].value;
        var amountTotal = +lookupObj.total;
        var amountPaid = +lookupObj.amountPaid;
		var amountRemaining = +lookupObj.amountremaining;

		var collectionState = '';

		log.debug({
			title: 'Lookup results',
			details: subdiaryId + ', ' + amountTotal + ', ' + amountRemaining
		});

		if(subdiaryId == '15' || subdiaryId == '18') {
            collectionState = '4';
		} else if (amountPaid > 0 && amountTotal < 50000) {
            collectionState = '3';
		} else if (amountTotal > 1000000) {
			collectionState = '2';
		} else if (amountTotal <= 1000000) {
			collectionState = '1';
		} else {
			log.audit({
				title: 'Failed to classify Collection State',
				details: 'Collection State cannot be classified'
			});
		}

		if(collectionState !== '') {
			var submittedId = record.submitFields({
				type: record.Type.INVOICE,
				id: context.key,
				values: {
                    custbody_csod_coll_state: collectionState
				},
				options: {
					enableSourcing: false,
					ignoreMandatoryFields: true
				}
			});

			log.debug(submittedId);
		}
    }

    return {
        getInputData: getInputData,
        map: map
    };
    
});
