/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/error', './Libraries/CSOD_MR_Collection_Libs.js'],
/**
 * @param {search} search
 */
function(search, record, error, csod) {
   
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
                   ["status","anyof","CustInvc:A", "CustInvc:D"],
                   "AND",
                   //@TODO Adjust this when deploying to production
                   ["lastmodifieddate","onorafter","9/6/2017 2:00 pm"]
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
			columns: ['subsidiary', 'amountremaining', 'amountpaid', 'entity', 'custbody_csod_coll_state']
		});

        var subsidiaryId = lookupObj.subsidiary[0].value;
        var customerId = +lookupObj.entity[0].value;
        var amountPaid = +lookupObj.amountpaid;
		var amountRemaining = +lookupObj.amountremaining;
		var prevCollState = lookupObj.custbody_csod_coll_state[0].value;

		var baseLineObj = search.lookupFields({
			type: search.Type.CUSTOMER,
			id: customerId,
			columns: ['custentity_10_pct_baseline', 'custentityrenewal_baseline']
		});

		var baseLine10Pct = +baseLineObj.custentity_10_pct_baseline;
		var baseLine = +baseLineObj.custentityrenewal_baseline;

		var collectionState = '';

		log.debug({
			title: 'Lookup results',
			details: 'subsidiaryId: ' + subsidiaryId + ', amountPaid: ' + amountPaid + ', amountRemaining: ' + amountRemaining
		});

		if(subsidiaryId == '15' || subsidiaryId == '18') {
            collectionState = '4';
		} else if (amountPaid > 0 && amountRemaining < baseLine10Pct && amountRemaining < 50000) {
            collectionState = '3';
		} else if (baseLine > 1000000) {
			collectionState = '2';
		} else if (baseLine <= 1000000) {
			collectionState = '1';
		} else {
			log.audit({
				title: 'Failed to classify Collection State',
				details: 'Collection State cannot be classified'
			});
		}

		if(collectionState !== '' && prevCollState != collectionState) {
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

    function summarize(summary) {
        csod.handleErrorIfAny(summary);
	}

    return {
        getInputData: getInputData,
        map: map,
		summarize: summarize
    };
    
});
