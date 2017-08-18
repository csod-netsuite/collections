define(['N/ui/message'], function (ui) {

    /**
     * Supplementary Client Script Libraries
     *
     * @exports Object
     *
     * @copyright 2017 Cornerstone OnDemand
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType ClientScript
     */
    var exports = {};

    var pageInit = function(scriptContext) {
        var currRecord = scriptContext.currentRecord;
        var successCheck = currRecord.getValue({
           fieldId: 'previous_task_complete'
        });

        if(successCheck == true) {
            var msg = ui.create({
                type: ui.Type.CONFIRMATION,
                title: 'Added to queue',
                message: 'Selected Invoices are now in queue. You may click the link below to go to "Send Invoice Page".'
            });

            msg.show({ duration: 30000 });
        }
    };

    exports.pageInit = pageInit;
    return exports;
});
