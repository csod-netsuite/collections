define(['N/record', 'N/search'], function (record, search) {

    /**
     * Module Description...
     *
     * @exports Various User Event Functions
     *
     * @copyright 2018 Cornerstone OnDemand
     * @author Chan Yi <cyi@csod.com>
     *
     * @NApiVersion 2.x
     * @NModuleScope Public
     */
    var exports = {};

    var error = {
      error: true,
      title: '',
      details: ''
    };

    var success = {
        error: false
    };
    /**
     * @param newRec
     */
    var writeNewAddress = function(newRec) {

        const salesOrderAddress = search.lookupFields({
            type: newRec.type,
            id: newRec.id,
            columns: ['billcity', 'billzip', 'billaddress1', 'billcountrycode', 'billstate',
                'shipaddress1', 'shipcity', 'shipzip', 'shipcountrycode', 'shipstate']
        });

        var customerId = newRec.getValue('entity');

        log.debug({
            title: 'lookup address result',
            details: salesOrderAddress
        });

        const customerRecAddressObj = getCustomerAddress(newRec);

        log.debug({
            title: 'lookup customer address result',
            details: customerRecAddressObj
        });

        const sameBillingAddress = isAddressSame(customerRecAddressObj, salesOrderAddress, 'billing');
        const sameShippingAddress = isAddressSame(customerRecAddressObj, salesOrderAddress, 'shipping');

        log.debug({
            title: 'Is Sales billing address same as profile?',
            details: sameBillingAddress
        });

        log.debug({
            title: 'Is Sales shipping address same as profile?',
            details: sameBillingAddress
        });

        // billing address is new. Add to customer addressbook and mark the customer
        if(!sameBillingAddress) {
            createNewAddress('billing', salesOrderAddress, customerId);
        }
        if(!sameShippingAddress) {
            createNewAddress('shipping', salesOrderAddress, customerId);
        }

        if(error.title) {
            return error;
        } else {
            return success;
        }
    };

    // update contact
    var updateContact = function(newRec) {
        var billingContactEmail = newRec.getValue('custbody_csod_billing_contact_email');
        var billingPhoneNumber = newRec.getValue('custbody_csod_billing_contact_phone');
        var billingContactName = newRec.getValue('custbody_csod_billing_contact_name');

        var contactSearchObj = search.create({
            type: "contact",
            filters: [
                ["email","is",billingContactEmail]
            ],
            columns: [
                "internalid",
                "email",
                "phone",
                "entityid"
            ]
        });

        var searchResultCount = contactSearchObj.runPaged().count;
        if(searchResultCount > 0) {
            contactSearchObj.run().each(function(result) {
                // .run().each has a limit of 4,000 results
                var contactPhone = result.getValue('phone');
                var contactName = result.getValue('entityid');
                var newPhone, newName;

                log.debug({
                    title: 'Phone Number Found',
                    details: contactPhone
                });

                if(billingPhoneNumber && (contactPhone != billingPhoneNumber)) {
                    newPhone = billingPhoneNumber;
                }

                if(billingContactName && (contactName != billingContactName)) {
                    newName = billingContactName;
                }

                if(newPhone !== undefined || newName !== undefined) {
                    newPhone = newPhone || contactPhone;
                    newName = newName || contactName;

                    try{
                        record.submitFields({
                            type: record.Type.CONTACT,
                            id: result.id,
                            values: {
                                phone: newPhone,
                                entityid: newName
                            }
                        });
                    } catch(e) {
                        error.title = 'ERROR WHILE UPDATING CONTACT';
                        error.details = e;
                    }

                }
                return true;
            });
        } else {
            // create a new contact
            const newContactId = createNewContact(newRec);
            if(newContactId) {
                log.audit('Created Contact : ' + newContactId);
            }
        }

        if(error.title) {
            return error;
        } else {
            return success;
        }
    };

    /**
     * creates new contact record
     * @param newRec
     * @return {string} (contact id)
     */
    var createNewContact = function(newRec) {
        var billingContactEmail = newRec.getValue('custbody_csod_billing_contact_email');
        var billingPhoneNumber = newRec.getValue('custbody_csod_billing_contact_phone');
        var billingContactName = newRec.getValue('custbody_csod_billing_contact_name');
        var entityId = newRec.getValue('entity');

        if(!billingContactEmail || !billingContactName || !entityId){
            // exit function if any of the values are empty
            return;
        }

        var newContactRec = record.create({
            type: record.Type.CONTACT,
            isDynamic: true
        });
        newContactRec.setValue({
            fieldId: 'company',
            value: entityId
        });
        newContactRec.setValue({
            fieldId: 'entityid',
            value: billingContactName
        });
        newContactRec.setValue({
            fieldId: 'phone',
            value: billingPhoneNumber
        });
        newContactRec.setValue({
            fieldId: 'email',
            value: billingContactEmail
        });

        try {
            return newContactRec.save({
                enableSourcing: true,
                ig​n​o​r​e​M​a​n​d​a​t​o​r​y​F​i​e​l​d​s: true
            })
        } catch(e) {
            error.title = "ERROR WHILE CREATING NEW CONTACT";
            error.details = e;
        }
    }

    /**
     * @param type
     * @param newRec
     * @returns {{}}
     */
    var getCustomerAddress = function(newRec) {
        const customerId = +newRec.getValue('entity');

        var customerAddressObj = {};
        var customerSearchObj = search.create({
            type: "customer",
            filters: [
                [["address.isdefaultshipping","is","T"],"OR",["address.isdefaultbilling","is","T"]],
                "AND",
                ["internalidnumber","equalto",customerId]
            ],
            columns: [
                search.createColumn({
                    name: "address1",
                    join: "Address"
                }),
                search.createColumn({
                    name: "city",
                    join: "Address"
                }),
                search.createColumn({
                    name: "zipcode",
                    join: "Address"
                }),
                search.createColumn({
                    name: "isdefaultbilling",
                    join: "Address"
                }),
                search.createColumn({
                    name: "isdefaultshipping",
                    join: "Address"
                })
            ]
        });
        var searchResultCount = customerSearchObj.runPaged().count;
        if(searchResultCount > 0) {
            customerSearchObj.run().each(function(result){
                // .run().each has a limit of 4,000 results

                if(result.getValue({name: 'isdefaultbilling', join: 'Address'}) == true) {
                    customerAddressObj['billaddress1'] = result.getValue({name: 'address1', join: 'Address'});
                    customerAddressObj['billcity'] = result.getValue({name: 'city', join: 'Address'});
                    customerAddressObj['billzip'] = result.getValue({name: 'zipcode', join: 'Address'});
                }
                if(result.getValue({name: 'isdefaultshipping', join: 'Address'}) == true) {
                    customerAddressObj['shipaddress1'] = result.getValue({name: 'address1', join: 'Address'});
                    customerAddressObj['shipcity'] = result.getValue({name: 'city', join: 'Address'});
                    customerAddressObj['shipzip'] = result.getValue({name: 'zipcode', join: 'Address'});
                }

                return true;
            });
        } else {
            //TODO add new address to addressbook

        }

        return customerAddressObj;
    };

    /**
     * @param custAddr
     * @param salesOrderAddr
     * @param type
     * @returns {boolean}
     */
    var isAddressSame = function(custAddr, salesOrderAddr, type) {

        // type parameter takes 'billing' or 'shipping'

        var billConfidence = 0;
        var shipConfidence = 0;

        if(type == 'billing') {
            if((custAddr.billaddress1 && salesOrderAddr.billaddress1)
                && (custAddr.billaddress1.split(' ')[0].toLowerCase() ==
                    salesOrderAddr.billaddress1.split(' ')[0].toLowerCase())) {
                billConfidence += 50;
            }
            if((custAddr.billcity && salesOrderAddr.billcity)
                && (custAddr.billcity.toLowerCase() ==
                    salesOrderAddr.billcity.toLowerCase())) {
                billConfidence += 30;
            }
            if((custAddr.billzip &&  salesOrderAddr.billzip)
                && (custAddr.billzip == salesOrderAddr.billzip)) {
                billConfidence += 20;
            }

            log.debug('billConfidence = ' + billConfidence);
        } else if(type == 'shipping') {
            if((custAddr.shipaddress1 && salesOrderAddr.shipaddress1)
                && (custAddr.shipaddress1.split(' ')[0].toLowerCase() ==
                    salesOrderAddr.shipaddress1.split(' ')[0].toLowerCase())) {
                billConfidence += 50;
            }
            if((custAddr.shipcity && salesOrderAddr.shipcity)
                && (custAddr.shipcity.toLowerCase() == salesOrderAddr.shipcity.toLowerCase())) {
                billConfidence += 30;
            }
            if((custAddr.shipzip &&  salesOrderAddr.shipzip)
                && (custAddr.shipzip == salesOrderAddr.shipzip)) {
                billConfidence += 20;
            }

            log.debug('billConfidence = ' + billConfidence + ', shipConfidence = ' + shipConfidence);
        }

        if(billConfidence > 50) {
            return true;
        } else if(shipConfidence > 50) {
            return true;
        }

        return false;
    };

    var createNewAddress = function(type, salesOrderAddressObj, custId) {
        // type takes 'billing' or 'shipping'
        var custRec = record.load({
            type: record.Type.CUSTOMER,
            id: custId,
            isDynamic: true
        });

        log.debug({
            title: 'Company Name',
            details: custRec.getValue('companyname')
        });

        var addressAdded = false;

        const addressLineCount = +custRec.getLineCount('addressbook');

        //TODO add the address to customer sublist id addressbook

        if(type == 'billing') {
            custRec.selectLine({
                sublistId: 'addressbook',
                line: addressLineCount
            });

            var addressRec = custRec.getCurrentSublistSubrecord({
                sublistId: 'addressbook',
                fieldId: 'addressbookaddress'
            });

            addressRec.setValue({
                fieldId: 'country',
                value: salesOrderAddressObj.billcountrycode
            });

            addressRec.setValue({
                fieldId: 'city',
                value: salesOrderAddressObj.billcity
            });

            addressRec.setValue({
                fieldId: 'zip',
                value: salesOrderAddressObj.billzip
            });

            addressRec.setValue({
                fieldId: 'state',
                value: salesOrderAddressObj.billstate
            });

            addressRec.setValue({
                fieldId: 'addr1',
                value: salesOrderAddressObj.billaddress1
            });

            addressRec.setValue({
                fieldId: 'addressee',
                value: custRec.getValue('companyname')
            });

            try {
                custRec.commitLine('addressbook');
                addressAdded = true;
            } catch(e) {
                error.title = 'ERROR WHILE SUBMITTING NEW ADDRESS';
                error.details = e;
            }
        }

        if(type == 'shipping') {
            if((salesOrderAddressObj.billaddress1.split(' ')[0] != salesOrderAddressObj.shipaddress1.split(' ')[0])
                || (salesOrderAddressObj.billaddress1.split(' ')[1] != salesOrderAddressObj.shipaddress1.split(' ')[1])) {

                log.debug({
                    title: 'value check in while adding shipping address',
                    details : 'billaddress1 [1] = ' + salesOrderAddressObj.billaddress1.split(' ')[1]
                    + 'shipaddress1 [1] = ' + salesOrderAddressObj.shipaddress1.split(' ')[1]
                });

                custRec.selectLine({
                    sublistId: 'addressbook',
                    line: addressLineCount
                });

                var addressRec = custRec.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                });

                addressRec.setValue({
                    fieldId: 'addressee',
                    value: custRec.getValue('companyname')
                });

                addressRec.setValue({
                    fieldId: 'country',
                    value: salesOrderAddressObj.billcountrycode
                });

                addressRec.setValue({
                    fieldId: 'city',
                    value: salesOrderAddressObj.billcity
                });

                addressRec.setValue({
                    fieldId: 'zip',
                    value: salesOrderAddressObj.billzip
                });

                addressRec.setValue({
                    fieldId: 'state',
                    value: salesOrderAddressObj.billstate
                });

                addressRec.setValue({
                    fieldId: 'addr1',
                    value: salesOrderAddressObj.billaddress1
                });
                //addressRec.save();
                try {
                    custRec.commitLine('addressbook');
                    addressAdded = true;
                } catch(e) {
                    error.title = 'ERROR WHILE SUBMITTING NEW ADDRESS';
                    error.details = e;
                }
            }
        }
        // save record if address is added.
        if(addressAdded) {
            custRec.setValue({
                fieldId: 'custentity_csod_new_addr_added',
                value: true
            });
            try{
                custRec.save();
            } catch(e) {
                error.title = 'ERROR WHILE SUBMITTING CUSTOMER REC ID : ' + custRec.id;
                error.details = e;
            }
        }
    };

    var checkContactUpdate = function(context) {

        var response = false;

        if(context.type === context.UserEventType.CREATE) {
            response = true;
        }

        if(context.type === context.UserEventType.EDIT) {
            var newName = context.newRecord.getValue('custbody_csod_billing_contact_name');
            var newEmail = context.newRecord.getValue('custbody_csod_billing_contact_email');
            var newPhone = context.newRecord.getValue('custbody_csod_billing_contact_phone');
            var oldName = context.oldRecord.getValue('custbody_csod_billing_contact_name');
            var oldEmail = context.oldRecord.getValue('custbody_csod_billing_contact_email');
            var oldPhone = context.oldRecord.getValue('custbody_csod_billing_contact_phone');

            if (oldName != newName || oldEmail != newEmail || oldPhone != newPhone) {
                response = true;
            }

        }

        return response;

    };

    exports.writeNewAddress = writeNewAddress;
    exports.updateContact = updateContact;
    exports.checkContactUpdate = checkContactUpdate;
    return exports;
});
