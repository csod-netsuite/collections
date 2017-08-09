/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/runtime', './Libraries/CSOD_UE_Invoice_Utils'], function(record, runtime, utils) {

    var exports = {};

    var beforeLoad = function(context){

    };

    var afterSubmit = function(context) {

        if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.XEDIT) {

            var newRec = context.newRecord;

            // if Add Grace Period is checked then invoke addGracePeriod function
            if(newRec.getValue({fieldId: 'custbody_csod_add_grace_period'}) && newRec.getValue({ fieldId: 'custbody_adjusted_due_date' })) {
                var defaultGracePeriod = runtime.getCurrentScript().getParameter({name: 'custscript_csod_grace_period_default'});

                log.debug({
                    title: 'Grace Period',
                    details: defaultGracePeriod
                });

                utils.addGracePeriod(newRec, defaultGracePeriod);
            }
        }
    };

     var beforeSubmit = function(context) {
    	
    	if(context.type == context.UserEventType.EDIT || context.type == context.UserEventType.XEDIT) {
    		// set adjust due date
    		log.debug(context.type);
    		utils.updateAdjustDueDate(context);

    	}

    };


    exports.beforeLoad = beforeLoad;
    exports.beforeSubmit = beforeSubmit;
    exports.afterSubmit = afterSubmit;

    return exports;
});
