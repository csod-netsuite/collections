/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/error', 'N/runtime', 'N/format', './Libraries/CSOD_MR_Collection_Libs.js'],
/**
 * @param {search} search
 */
function(search, record, error, runtime, format, csod) {
   
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
    	var currScript = runtime.getCurrentScript();
    	var lastSuccDateTime = currScript.getParameter({name: 'custscript_csod_coll_last_succ_datetime'});

    	if(lastSuccDateTime === '' || lastSuccDateTime === null) {
    	    // abort data search if lastSuccDateTime is not defined
    	    return;
        }

        var dateFormat = format.format({
            value: lastSuccDateTime,
            type: format.Type.DATE
        });

        var timeOfDay = format.format({
            value: lastSuccDateTime,
            type: format.Type.TIMEOFDAY
        });

        lastSuccDateTime = dateFormat + ' ' + timeOfDay;

    	log.debug({
			title: 'Loaded Last Successful Run Datetime Param',
			details: lastSuccDateTime
		});

    	var transactionSearchObj = search.create({
    		   type: "transaction",
    		   filters: [
    		       ["mainline","is","T"],
                   "AND",
                   ["custbody_record_emailed","is","T"],
                   "AND",
                   ["custbody_adjusted_due_date","isnotempty",""],
                   "AND",
                   ["status","anyof","CustInvc:A"],
                   "AND",
                   ["lastmodifieddate","onorafter", lastSuccDateTime]
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

		// amountpaid is not needed for now (Updated 10/26/2017)
        var lookupObj = search.lookupFields({
            type: search.Type.INVOICE,
            id: context.key,
            columns: ['subsidiary', 'amountremaining', 'amountpaid', 'entity', 'custbody_csod_coll_state']
        });

        var subsidiaryId = lookupObj.subsidiary[0].value;
        var customerId = +lookupObj.entity[0].value;
        var amountPaid = +lookupObj.amountpaid;
		var amountRemaining = +lookupObj.amountremaining;

		var prevCollState = lookupObj.custbody_csod_coll_state[0] !== undefined ? lookupObj.custbody_csod_coll_state[0].value : '';

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
		} else if (baseLine >= 1000000) {
			collectionState = '2';
		} else if (baseLine < 1000000) {
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
    	// Write Last Successful Run Datetime
		var currScript = runtime.getCurrentScript();
		var deployId = currScript.deploymentId;
		var scriptId = currScript.id;
		var currDateTimeFormat = format.format({
			value: new Date(),
			type: format.Type.DATETIME
		});

		log.debug({
           title: 'Check Script ID',
           details: scriptId
        });

		var deploymentInternalId = csod.getScriptInternalId(scriptId, deployId);
        log.debug({
            title: 'Check Deployment Internal ID',
            details: deploymentInternalId
        });

		record.submitFields({
			type: record.Type.SCRIPT_DEPLOYMENT,
			id: deploymentInternalId,
			values: {
                custscript_csod_coll_last_succ_datetime: currDateTimeFormat
			}
		});
        csod.handleErrorIfAny(summary);
	}

    return {
        getInputData: getInputData,
        map: map,
		summarize: summarize
    };
    
});
