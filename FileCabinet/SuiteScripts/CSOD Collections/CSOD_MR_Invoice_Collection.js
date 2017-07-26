/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search'],
/**
 * @param {search} search
 */
function(search) {
   
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
    		      ["status","anyof","CustInvc:A"]
    		   ],
    		   columns: [
    		      "internalid"
    		   ]
    		});
    		var searchResultCount = transactionSearchObj.runPaged().count;
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
            title: "Search Result in map",
            details: JSON.stringify(context.value)
        });
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map
        //reduce: reduce,
        //summarize: summarize
    };
    
});