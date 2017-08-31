/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/runtime', './Libraries/CSOD_UE_Invoice_Utils'], function(record, runtime, csod_lib) {

    var exports = {};

    var beforeLoad = function(context){

    };

    var afterSubmit = function(context) {

        if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.XEDIT) {

            var newRec = context.newRecord;
            var oldRec = context.oldRecord;

            // Grace Period Timestamp
            csod_lib.createTimeStamp(oldRec ,newRec);

        }
    };

     var beforeSubmit = function(context) {
    	
    	if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.XEDIT) {
    		// set adjust due date
    		log.debug(context.type);
            csod_lib.updateAdjustDueDate(context);

    	}

    };


    exports.beforeLoad = beforeLoad;
    exports.beforeSubmit = beforeSubmit;
    exports.afterSubmit = afterSubmit;

    return exports;
});
