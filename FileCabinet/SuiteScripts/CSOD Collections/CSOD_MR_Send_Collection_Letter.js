define(['N/search', 'N/render', 'N/email', 'N/record', 'N/runtime', './Libraries/CSOD_MR_Collection_Libs.js'],
    function (search, render, email, record, runtime, csod) {

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
        /**
         * Entry Points
         */
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
                ["status","anyof","CustInvc:A"],
                "AND",
                ["customermain.custentity_do_not_send_3","is","F"],
                "AND",
                ["custbody_no_overdue_notices", "is", "F"],
                "AND",
                ["custbody_contingent_due_check", "is", "F"],
                "AND",
                //@TODO Adjust this when deploying to production
                ["lastmodifieddate","onorafter","9/6/2017 11:00 am"]
            ],
            columns: [
                "internalid",
                "tranid",
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

        invoice.emailStatus = '';

        // Data to retrieve from customer record
        // author custentity9
        // recipient email
        // language custentity_primary_language

        // get days overdue
        var daysOverDue = invoice.values.formulanumeric;
        var collectionStatus = invoice.values.custbody_csod_coll_state.value;
        var lastNoticeType = invoice.values.custbody_last_notice_sent.value;
        var customerId = invoice.values.entity.value;

        // Loading Data from Customer Record
        var custLookup = search.lookupFields({
            type: search.Type.CUSTOMER,
            id: customerId,
            columns: ['custentity9', 'custentity_primary_language', 'email']
        });

        // get Primary Email and CC list by searching contact record
        var emailObj = getEmailList(customerId);

        log.debug({
            title: "emailObj check",
            details: emailObj
        });

        var employeeId = custLookup.custentity9[0].value;
        var language = custLookup.custentity_primary_language[0].value || '1';
        var recipient = emailObj.primary;
        var CCs = emailObj.copied;

        log.debug({
            title: 'Customer Data Lookup',
            details: 'Email : ' + recipient + ', employeeId : ' + employeeId
        });

        // get Template ID
        var TEMPLATE_ID = getTemplateId(daysOverDue, collectionStatus, language, lastNoticeType);

        log.debug({
            title: 'TEMPLATE_ID check',
            details: TEMPLATE_ID
        });

        // if TEMPLATE_ID is empty, email should not send
        if(TEMPLATE_ID !== '' ) {
            var mergeResult = mergeEmail(+TEMPLATE_ID, +context.key);
            var invoicePDF = getInvoicePDF(+context.key);

            if (recipient && employeeId) {
                // Send out collection Email

                log.audit({
                    title: "Email Sent Audit",
                    details: "Invoice ID " + context.key + " sent"
                });

                sendCollectionLetter(employeeId, recipient, mergeResult, CCs,
                    invoicePDF, context.key, invoice.values.entity.value);

                invoice.emailStatus = 'Email Sent';
                // Update the invoice with updated custbody_last_notice_sent (Last Notice Type)
                // Email should have been sent out at this point.
                updateLastNoticeField(lastNoticeType, context.key);


            } else {
                invoice.emailStatus = 'Primary Email Missing';
            }
        } else {
            invoice.emailStatus = 'Skip';
        }

        log.debug({
            title: 'Template Merge Check',
            details: 'data type: ' + typeof invoicePDF + ', template id: ' + TEMPLATE_ID
        });

        context.write(context.key, invoice);

    };

    var summarize = function(summary) {
        csod.handleErrorIfAny(summary);

        var scriptOpj = runtime.getCurrentScript();
        var SUM_REP_REC = scriptOpj.getParameter({name: 'custscript_csod_coll_sum_report_emails'}).split(';');
        log.debug({
            title: 'Script Params Check',
            details: SUM_REP_REC
        });
        var report = "";

        summary.output.iterator().each(function(key, value) {

            var value = JSON.parse(value);

            if(value.emailStatus == "Email Sent") {
                report += 'Email successfully sent for : ';
                report += 'Invoice# : ' + value.values.tranid + ', Customer : ' + value.values.entity.text + '<br/>';
            } else if(value.emailStatus == "Primary Email Missing") {
                report += 'Email failed to send (Missing Email Address) for : ';
                report += 'Invoice# : ' + value.values.tranid + ', Customer : ' + value.values.entity.text + '<br/>';
            }
            return true;
        });

        if(report !== "" && SUM_REP_REC.length > 0) {
            report += "<br/><br/> This email is generated by Collection Letter Script <br/><br/>";

            email.send({
                author: '92993',
                recipients: SUM_REP_REC,
                subject: 'Collection Letter Summary Report',
                body: report
            });

        };

        log.debug({
            title: "Summary Report",
            details: report
        });

    };


        /**
         * Support functions and Utils
         */
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
            if(+daysOverDue > 5 && lastNotice === '0') {

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

            if(+daysOverDue > 5 && lastNotice == '0') {
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

    var sendCollectionLetter = function(from, to, templateRender, CCs, invoicePDF, tranId, custId) {

        try {
            email.send({
                author: from,
                recipients: to,
                cc: CCs,
                subject: templateRender.subject,
                body: templateRender.body,
                attachments: [invoicePDF],
                relatedRecords: {
                    transactionId: tranId,
                    entityId: custId
                }
            });
        } catch (e) {
            log.error({
                title: 'ERROR',
                details: e
            });
        };
    };

    var updateLastNoticeField = function(lastNoticeType, invId) {
        var lastNoticeValue = lastNoticeType || '0';
        var newLastNoticeType = '0';

        // Update newLastNoticeType
        if(lastNoticeValue === '0') {
            newLastNoticeType = '1';

        } else if(lastNoticeType == '1') {
            newLastNoticeType = '2';
        }

        if(newLastNoticeType !== '0') {
            record.submitFields({
                type: record.Type.INVOICE,
                id: invId,
                values: {
                    custbody_last_notice_sent: newLastNoticeType
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                }
            });
        }
    };

        /**
         * Finds Contacts associated with customerID
         * And returns results in object
         * @param customerId
         * @return {object}
         */
    var getEmailList = function(customerId) {

        var output = {};
        output['primary'] = '';
        output['copied'] = [];

        var contactSearchObj = search.create({
            type: "contact",
            filters: [
                ["company","anyof",customerId]
            ],
            columns: [
                "email",
                "custentity_invoicerecipient"
            ]
        });
        var searchResultCount = contactSearchObj.runPaged().count;

        if(searchResultCount > 0) {
            contactSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results
                var email = result.getValue({name: "email"});
                var invoiceRecipientId = result.getValue({name: "custentity_invoicerecipient"});

                if(invoiceRecipientId == '1') {
                    // primary
                    output.primary = email;
                } else if(invoiceRecipientId == '2') {
                    // CCs
                    output.copied.push(email);
                }

                return true;
            });
        }

        return output;
    };

    exports.getInputData = getInputData;
    exports.map = map;
    exports.summarize = summarize;

    return exports;
});
