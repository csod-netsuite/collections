define(['N/record', 'N/search', './SO_Libs/SO_UE_Functions'],
    function (record, search, csod_lib) {

    /**
     * Various Custom User Event Script for Sales Order
     * written in SuiteScript 2.0
     *
     * @copyright 2018 Cornerstone OnDemand
     * @author Chan Yi <cyi@csod.com>
     *
     * @NApiVersion 2.x
     * @NScriptType UserEventScript
     */
    var exports = {};

    var addressAndContactAfterSubmit = function(context) {
        const newRec = context.newRecord;
        const oldRec = context.oldRecord;
        const newRecId = context.newRecord.id;
        const newRecType = context.newRecord.type;

        log.audit('SS2 UserEvent salesOrderAfterSubmit Begins. ID: '
            + newRecId + ', Type: ' + newRecType);

        // get current new record address for billing and shipping

        if(context.type === context.UserEventType.CREATE && newRecType === 'salesorder') {

            const addrUpdateResponse = csod_lib.writeNewAddress(newRec);

            // log error if there was any error during process
            if(addrUpdateResponse.hasOwnProperty('error') && addrUpdateResponse.error === true) {
                log.error({
                    title: addrUpdateResponse.title,
                    details: addrUpdateResponse.details
                });
            }
        }

        if(context.type === context.UserEventType.CREATE ||
            context.type === context.UserEventType.EDIT) {
            const hasContactInfoUpdated = csod_lib.checkContactUpdate(context);

            log.audit({
                title: 'Has Contact Info Changed?',
                details: hasContactInfoUpdated
            });

            if(hasContactInfoUpdated) {
                var billingEmail = newRec.getValue('custbody_csod_billing_contact_email');
                if(billingEmail) {

                    // update contact
                    const contactUpdateResponse = csod_lib.updateContact(newRec);

                    // log error if there was any error during process
                    if(contactUpdateResponse.hasOwnProperty('error') && contactUpdateResponse.error === true) {
                        log.error({
                            title: contactUpdateResponse.title,
                            details: contactUpdateResponse.details
                        });
                    }
                }
            }

        }

    }

    //@TODO: When Address is not same as default on customer set flag

    //@TODO: Add Contact Info on Sales Order
        //@TODO send invoice email to this contact person
        //@TODO See if we can update/add Contact Record with this contact person

    //@TODO Add Contact Info Fields to Non-GL Edit Suitelet

    exports.afterSubmit = addressAndContactAfterSubmit;
    return exports;
});
