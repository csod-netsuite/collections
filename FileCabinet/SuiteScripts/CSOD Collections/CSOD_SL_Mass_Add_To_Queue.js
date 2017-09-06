define(['N/ui/serverWidget', 'N/runtime', 'N/search', 'N/record', 'N/redirect', 'N/url'],
    function (ui, runtime, search, record, redirect, url) {

    /**
     * @Description Form that can add multiple invoices to queue
     * for emailing the actual invoice to customers
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan - cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType Suitelet
     */
    var exports = {};

    // 'custbody_email_delivery_status', '2', Will put into queue
    function onRequest(context) {

        var request = context.request;
        var response = context.response;
        var script = runtime.getCurrentScript();

        // GET
        if(request.method === 'GET') {

            var isSuccessCall = request.parameters.success;

            isSuccessCall = isSuccessCall === "true" ? true:false;

            log.debug(typeof isSuccessCall);

            var form = ui.createForm({
                title: 'Multi "Add to Queue" Form'
            });

            var successCheck = form.addField({
                id: 'previous_task_complete',
                type: ui.FieldType.CHECKBOX,
                label: 'Task Complete'
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.DISABLED
            });

            form.clientScriptModulePath = './Libraries/CSOD_CL_Invoice_Libs';

            // render form for normal task
            if(isSuccessCall !== true) {

                form.addSubmitButton({
                    label: "Add to Queue"
                });

                form.addButton({
                    id: "button_cancel",
                    label: "Cancel",
                    functionName: "window.history.back()"
                });

                var invSublist = form.addSublist({
                    id: 'inv_sublist',
                    type: ui.SublistType.LIST,
                    label: 'Available Invoices for Queue'
                });

                invSublist.addMarkAllButtons();
                invSublist.addRefreshButton();

                invSublist.addField({
                    id: 'inv_sublist_checkbox',
                    label: 'Add to Queue',
                    type: ui.FieldType.CHECKBOX
                });

                invSublist.addField({
                    id: 'inv_sublist_internalid',
                    label: 'Invoice Number',
                    type: ui.FieldType.TEXT
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });

                invSublist.addField({
                    id: 'inv_sublist_tranid',
                    label: 'Invoice Number',
                    type: ui.FieldType.TEXT
                });

                invSublist.addField({
                    id: 'inv_sublist_company_name',
                    label: 'Customer',
                    type: ui.FieldType.TEXT
                });

                invSublist.addField({
                    id: 'inv_sublist_amount',
                    label: 'Amount',
                    type: ui.FieldType.TEXT
                });

                invSublist.addField({
                    id: 'inv_sublist_approved_by',
                    label: 'Approved By',
                    type: ui.FieldType.TEXT
                });

                invSublist.addField({
                    id: 'inv_sublist_days_open',
                    label: 'Days Open',
                    type: ui.FieldType.TEXT
                });

                var resultsObj = getAvailableInvoices();

                // setting maximum allowed to display for Suitelet's perfomance.
                var invSrchRst = resultsObj.run().getRange({
                    start: 0,
                    end: 200
                });

                //log.debug(invSrchRst.length);

                for(var i = 0; i < invSrchRst.length; i++) {
                    invSublist.setSublistValue({
                        id: 'inv_sublist_checkbox',
                        line: i,
                        value: 'F'
                    });

                    invSublist.setSublistValue({
                        id: 'inv_sublist_internalid',
                        line: i,
                        value: invSrchRst[i].getValue({name: 'internalid'})
                    });

                    invSublist.setSublistValue({
                        id: 'inv_sublist_tranid',
                        line: i,
                        value: invSrchRst[i].getValue({name: 'tranid'})
                    });

                    invSublist.setSublistValue({
                        id: 'inv_sublist_company_name',
                        line: i,
                        value: invSrchRst[i].getText({name: 'entity'})
                    });

                    invSublist.setSublistValue({
                        id: 'inv_sublist_amount',
                        line: i,
                        value: invSrchRst[i].getValue({name: 'amount'})
                    });

                    invSublist.setSublistValue({
                        id: 'inv_sublist_approved_by',
                        line: i,
                        value: invSrchRst[i].getText({name: 'custbody_inv_approved_by'}) || "N/A"
                    });

                    invSublist.setSublistValue({
                        id: 'inv_sublist_days_open',
                        line: i,
                        value: invSrchRst[i].getValue({name: 'daysopen'})
                    });

                }

            } else {
                successCheck.defaultValue = 'T';
                successCheck.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                var linkField = form.addField({
                    id: 'link_to_invoice_form',
                    type: ui.FieldType.URL,
                    label: 'Go to'
                }).updateDisplayType({displayType: ui.FieldDisplayType.INLINE});
                linkField.defaultValue = url.resolveScript({
                    scriptId: 'customscript_invoices_emailing_show_form',
                    deploymentId: 'customdeploy_invoices_emailing_show_form',
                    returnExternalUrl: false
                });
                linkField.linkText = "Send Invoice Form";
                linkField.updateBreakType({
                    breakType : ui.FieldBreakType.STARTCOL
                });
                linkField.updateDisplaySize({
                    height: 100,
                    width: 100
                });
            }

            response.writePage(form);
        }
        // POST
        else {
            // TODO: Get Internal ID from GET request
            var lineCount = request.getLineCount({
                group: "inv_sublist"
            });

            for(var i = 0; i < lineCount; i++) {
                var isChecked = request.getSublistValue({
                   group: 'inv_sublist',
                   name: 'inv_sublist_checkbox',
                   line: i
                });

                if(isChecked == 'T') {
                    var invInternalId = request.getSublistValue({
                        group: 'inv_sublist',
                        name: 'inv_sublist_internalid',
                        line: i
                    });
                    try{
                        record.submitFields({
                            type: record.Type.INVOICE,
                            id: invInternalId,
                            values: {
                                custbody_email_delivery_status: '2'
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                    } catch(error) {
                        log.error(error.message);
                    } finally {
                        continue;
                    }
                }
            }

            log.debug(script.getRemainingUsage());


            // redirect to same suitelet to give message to the user
            redirect.toSuitelet({
                scriptId: script.id,
                deploymentId: script.deploymentId,
                parameters: {
                    'success': true
                }
            });
        }

    }

        /**
         * Support function to create search and return search object
         * @returns {object} search.Search
         */
    function getAvailableInvoices() {
        var invoiceSearchObj = search.create({
            type: "invoice",
            filters: [
                ["mainline","is","T"],
                "AND",
                ["type","anyof","CustInvc"],
                "AND",
                ["custbody_email_delivery_status","anyof","1"],
                "AND",
                ["custbody_do_not_email","is","F"],
                "AND",
                ["custbody_do_not_add_queue", "is", "F"],
                "AND",
                ["custbody_csod_add_grace_period", "is", "F"],
                "AND",
                ["customermain.custentity_inv_que_exempt","is","F"],
                "AND",
                ["status","noneof","CustInvc:B","CustInvc:V"]
            ],
            columns: [
                "internalid",
                "tranid",
                "entity",
                "email",
                "amount",
                "statusref",
                "createdby",
                "custbody_do_not_add_queue",
                "custbody_inv_approved_by",
                "duedate",
                "daysopen",
                "custbody_adjusted_due_date",
                search.createColumn({
                    name: "lastmodifieddate",
                    sort: search.Sort.DESC
                })
            ]
        });

        return invoiceSearchObj;

    }

    exports.onRequest = onRequest;
    return exports;
});