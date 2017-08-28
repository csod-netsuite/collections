define(['N/search', 'N/render', 'N/email', './Libraries/CSOD_MR_Collection_Libs.js'],
    function (search, render, email, csod) {

    /**
     * Find & Send Collection Letter
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author chan <cyi@csod.com>
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType MapReduceScript
     */
    var exports = {};

    var getInputData = function() {
        return search.create({
            type: "invoice",
            filters: [
                ["type","anyof","CustInvc"],
                "AND",
                ["mainline","is","T"],
                "AND",
                ["custbody_adjusted_due_date","onorbefore","today"],
                "AND",
                ["custbody_csod_add_grace_period","is","F"],
                "AND",
                ["status","anyof","CustInvc:A"]
            ],
            columns: [
                "internalid",
                "entity",
                "custbody_adjusted_due_date",
                search.createColumn({
                    name: "formulanumeric",
                    formula: "FLOOR({today}-{custbody_adjusted_due_date}-NVL({custbody_csod_grace_period_days_onhold}, 0))"
                }),
                "custbody_csod_coll_state",
                "custbody_last_notice_sent"
            ]
        });

    };

    var map = function(context) {
        var invoice = JSON.parse(context.value);

        log.debug({
            title: 'Data fed into map',
            details: context.value
        });

        // Data to retrieve from customer record
        // author custentity9
        // recipient email
        // language custentity_primary_language

        // get days overdue
        var daysOverDue = invoice.values.formulanumeric;
        var collectionStatus = invoice.values.custbody_csod_coll_state.value;
        var lastNoticeType = invoice.values.custbody_last_notice_sent.value;

        // Loading Data from Customer Record
        var custLookup = search.lookupFields({
            type: search.Type.CUSTOMER,
            id: invoice.values.entity.value,
            columns: ['custentity9', 'custentity_primary_language', 'email']
        });

        var employeeId = custLookup.custentity9[0].value;
        var language = custLookup.custentity_primary_language[0].value || '1';
        var recipient = custLookup.email;

        log.debug({
            title: 'Customer Data Lookup',
            details: 'Email : ' + recipient + ', employeeId : ' + employeeId
        });

        // get Template ID
        var TEMPLATE_ID = getTemplateId(daysOverDue, collectionStatus, language, lastNoticeType);
        var mergeResult = mergeEmail(+TEMPLATE_ID, +context.key);
        var invoicePDF = getInvoicePDF(+context.key);

        // Send Email if email is not empty
        if (recipient && employeeId) {
            sendCollectionLetter(employeeId, recipient, mergeResult,
                invoicePDF, context.key, invoice.values.entity.value);
        }


        log.debug({
            title: 'Template Merge Check',
            details: 'data type: ' + typeof invoicePDF + ', template id: ' + TEMPLATE_ID
        });

    };

    var summarize = function(summary) {
        csod.handleErrorIfAny(summary);
    };

    var mergeEmail = function(tempId, recordId) {
        return render.mergeEmail({
            templateId: tempId,
            transactionId: recordId
        });
    };

    var getInvoicePDF = function(tranId) {
        return render.transaction({
            entityId: tranId,
            printMode: render.PrintMode.PDF
        });
    };

    var getTemplateId = function(daysOverDue, collectionStatus, language, lastNoticeType) {

        // language 1 - English, 2 - French, 3 - German, 6 - Mandarin, 8 - Spanish
        var lastNotice = lastNoticeType || '0';
        var templateId = '';

        if(collectionStatus == '1' || collectionStatus == '4') {
            // Standard Baseline Under 1M || GE and CFS

            // Send only 1st Due Notice

            if(+daysOverDue > 5 && lastNotice == '0') {
                // Send 1st Notice

                if(language == '2') {
                    templateId = csod.TEMPATE_ID.FRENCH.A;
                } else if(language == '8') {
                    templateId = csod.TEMPATE_ID.SPANISH.A;
                } else {
                    templateId = csod.TEMPATE_ID.ENGLISH.A;
                }
            }

        } else if(collectionStatus == '2' || collectionStatus == '3') {
            // Baseline Over 1M || Past Due less than 10% of Baseline
            // Send 1st and 2nd notice

            if(+daysOverDue > 5 && lastNotice == '0'){
                // SEND 1st Notice
                if(language == '2') {
                    templateId = csod.TEMPATE_ID.FRENCH.A;
                } else if(language == '8') {
                    templateId = csod.TEMPATE_ID.SPANISH.A;
                } else {
                    templateId = csod.TEMPATE_ID.ENGLISH.A;
                }
            } else if(+daysOverDue > 35 && lastNotice == '1') {
                // SEND 2nd Noitce
                if(language == '2') {
                    templateId = csod.TEMPATE_ID.FRENCH.B;
                } else if(language == '8') {
                    templateId = csod.TEMPATE_ID.SPANISH.B;
                } else {
                    templateId = csod.TEMPATE_ID.ENGLISH.B;
                }
            }

        }

        return templateId;

    };

    var sendCollectionLetter = function(from, to, templateRender, invoicePDF, tranId, custId) {

        try {
            email.send({
                author: +from,
                recipients: ["cyi@csod.com"],
                subject: templateRender.subject,
                body: templateRender.body,
                attachments: invoicePDF,
                relatedRecords: {
                    transactionId: +tranId,
                    entityId: +custId
                }
            });
        } catch (e) {
            log.error({
                title: 'ERROR',
                details: e
            });
        }
    };

    exports.getInputData = getInputData;
    exports.map = map;
    exports.summarize = summarize;

    return exports;
});
