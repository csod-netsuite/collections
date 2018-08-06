/**
 * Module Description
 * 
 * Version    	Date            Author           	Remarks
 * 1.00			08/26/2015     	Kalyani Chintala	DSG Case 47617 
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord Invoice
 * @returns {Void}
 */
function userEventBeforeSubmit(type)
{
	nlapiLogExecution('DEBUG', 'Type check', type);
	
	if(type == 'create' || type == 'edit')
	{
		var custId = nlapiGetFieldValue('entity');
		var custRec = nlapiLoadRecord('customer', custId);
		var parentCust = custRec.getFieldValue('parent');
		if(parentCust != null && parentCust != '')
			custRec = nlapiLoadRecord('customer', parentCust);
		var custName = custRec.getFieldValue('companyname');
		if(custName == null || custName == '')
			custName = custRec.getFieldValue('firstname') + ' ' + custRec.getFieldValue('lastname');
		if(custName == null || custName == '')
			custName = 'Customer';
		nlapiLogExecution('Debug', 'Checking', 'Cust Name - ' + custName);
		nlapiSetFieldValue('custbody_customer_name', custName);
		if(type == 'edit') {
			if(nlapiGetOldRecord().getFieldValue('approvalstatus') == '1' && 
					nlapiGetNewRecord().getFieldValue('approvalstatus') == '2') {
				sendToEmailQueue();
			}  
		}
		
	}
	
	if(type == 'approve') {
		sendToEmailQueue();
	}
	
}


// ** Call this function only in beforeSubmit
function sendToEmailQueue() {
	
	// when approved by these roles, queue up the invoice
	var ALLOWED_APPROVERS = [3, 1038, 1008, 1087, 1088, 1065, 1043, 1027, 1092];
	var currentRole = +nlapiGetContext().getRole();
	
	//nlapiLogExecution('AUDIT', 'Invoice Approved', 'Index of current role' + ALLOWED_APPROVERS.indexOf(currentRole));
	
	if(ALLOWED_APPROVERS.indexOf(currentRole) > -1) {
		var custId = nlapiGetFieldValue('entity');
		var custRec = nlapiLoadRecord('customer', custId);
		
		nlapiLogExecution('AUDIT', 'Email Exempt Check', 'Customer exempt : ' + custRec.getFieldValue('custentity_inv_que_exempt') + ', Invoice exempt : ' +  nlapiGetFieldValue('custbody_do_not_email'));
		
		if(custRec.getFieldValue('custentity_inv_que_exempt') != 'T' && nlapiGetFieldValue('custbody_do_not_email') != 'T' 
			&& nlapiGetFieldValue('custbody_do_not_add_queue') != 'T') {
			// Put email delivery status to pending
			nlapiLogExecution('AUDIT', 'Approved Invoice for Email', nlapiGetRecordId() + ', queued for email')
			nlapiSetFieldValue('custbody_email_delivery_status', '2');
		}

	}
}


function oneTimeUpdCustomerName()
{
	var invList = nlapiSearchRecord('invoice', 'customsearch_onetime_upd_cust_name_invoi');
	if(invList == null || invList == '')
		return;
	
	var startTime = new Date().getTime();
	for(var idx=0; idx < invList.length; idx++)
	{
		nlapiLogExecution('Debug', 'Checking', 'Processing Inv - ' + invList[idx].getId());
		try{
			/*var invRec = nlapiLoadRecord('invoice', invList[idx].getId());
			var custId = invRec.getFieldValue('entity');*/
			var custId = nlapiLookupField('invoice', invList[idx].getId(), 'entity');
			var custRec = nlapiLoadRecord('customer', custId);
			var parentCust = custRec.getFieldValue('parent');
			if(parentCust != null && parentCust != '')
				custRec = nlapiLoadRecord('customer', parentCust);
			var custName = custRec.getFieldValue('companyname');
			if(custName == null || custName == '')
				custName = custRec.getFieldValue('firstname') + ' ' + custRec.getFieldValue('lastname');
			if(custName == null || custName == '')
				custName = 'Customer';
			nlapiLogExecution('Debug', 'Checking', 'Cust Name - ' + custName);
			//nlapiSetFieldValue('custbody_customer_name', custName);
			nlapiSubmitField('invoice', invList[idx].getId(), 'custbody_customer_name', custName, false);
			//nlapiSubmitRecord(invRec, false, true);
		}catch(er){
			er = nlapiCreateError(er);
			nlapiLogExecution('Error', 'Checking', 'Error Code: ' + er.getCode() + ', Details: ' + er.getDetails());
		}
		
		var timeDiff = parseFloat(new  Date().getTime()) - parseFloat(startTime);
		var timeConstant = parseFloat(30 * 60 * 1000);
		if (nlapiGetContext().getRemainingUsage() < 200 || (parseFloat(timeDiff) > parseFloat(timeConstant)))
		{
			var status = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
			if(status != 'QUEUED')
				throw nlapiCreateError('', 'Error occured while rescheduling the script');
			return;
		}
	}
}