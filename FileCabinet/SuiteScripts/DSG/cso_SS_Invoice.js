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