/**
 * 	10/04/2013 Kalyani Chintala, DSG Case 34996
 * 	04/18/2014 Kalyani Chintala, DSG Case 39144
 * 	05/12/2014 Kalyani Chintala, DSG Case 39506
 * 	06/19/2014 Kalyani Chintala, DSG Case 40037 - Applying quick fix, need to investigate issue in sandbox
 *	2014-10-02-1522 Fixed Typo in Name in Line 29: Ivoces >> Invoices by Harold Casteel - CornerStone OnDemand, Inc. NetSuite Administrator
 *  2014-10-02-1530 lineItem['custpage_inv_list_select'] = 'T'; // Change this to 'F' 2014-10-02-1527 LINE 59  by Harold Casteel - CornerStone OnDemand, Inc. NetSuite Administrator
 *  05/19/2015 Kalyani Chintala, DSG Case 45550
 *  08/05/2015 Kalyani Chintala, DSG Case 46259 - updating the code to use scriptable templates
 */

var context = nlapiGetContext();
var emailFrom = context.getSetting('SCRIPT', 'custscript_emailfrom');
var emailBCC = context.getSetting('SCRIPT', 'custscript_pdfemailbcc');
var emailTemplateIDUS = context.getSetting('SCRIPT', 'custscript_emailtemplate');
var emailTemplateIDUK = context.getSetting('SCRIPT', 'custscript_templateuk');
var emailTemplateIDCyberU = context.getSetting('SCRIPT', 'custscript_templatecyber');
var emailTemplateIDSonar6 = context.getSetting('SCRIPT', 'custscript_template_sonar6');
	
function showInvToSelect(request, response)
{
	//Check if the process is already running
	var isProcRunning = nlapiLookupField('customrecord_inv_email_proc_status', 1, 'custrecord_inv_email_proc_status');
	if(isProcRunning == 'T')
	{
		var form = nlapiCreateForm('Select Invoices to Send Email', false);
		(form.addField('custpage_message', 'inlinehtml', '')).setDefaultValue('<b color="#FF0000">A batch of Invoices are submitted for processing via this application a moment ago, please wait for 30min to use the application.</b>');
		response.writePage(form);
		return;
	}
	if(request.getMethod() == 'GET')
	{		
		var form = nlapiCreateForm('Select Invoices to Send Email', false);
		
		var removeFrmQueueFld = form.addField('custpage_remove_selected', 'checkbox', '');
		removeFrmQueueFld.setDisplayType('hidden');
		
		var invList = nlapiSearchRecord('invoice', 'customsearch_inv_waiting_to_send_email');
		if(invList == null || invList == '')
		{
			//Add no invoices found message
			var htmlFld = form.addField('custpage_no_invoices_found', 'text', '');
			htmlFld.setDisplayType('inline');
			htmlFld.setDefaultValue('No invoices are waiting in queue for emailing!');
			
			response.writePage(form);
			return;
		}
		
		//Add sublit to form
		var invSubList = form.addSubList('custpage_inv_list', 'list', 'Invoices', 'main');
		invSubList.addField('custpage_inv_list_select', 'checkbox', 'Select');
		(invSubList.addField('custpage_inv_list_no_select', 'checkbox', 'DO NOT ADD TO QUEUE')).setDisplayType('inline');
		(invSubList.addField('custpage_inv_list_id', 'text', 'Inv Id')).setDisplayType('hidden');
		(invSubList.addField('custpage_inv_list_invnum', 'text', 'Number')).setDisplayType('inline');
		(invSubList.addField('custpage_inv_list_customer', 'select', 'Name', 'customer')).setDisplayType('inline');
		(invSubList.addField('custpage_inv_list_appr_status', 'text', 'Approval Status')).setDisplayType('inline');
		invSubList.addField('custpage_inv_list_status', 'text', 'Status');
		(invSubList.addField('custpage_inv_list_createdby', 'select', 'Created By', 'employee')).setDisplayType('inline');
		(invSubList.addField('custpage_inv_list_approvedby', 'select', 'Approved By', 'employee')).setDisplayType('inline');
		invSubList.addField('custpage_inv_list_amt', 'currency', 'Amount');
		invSubList.addMarkAllButtons();
				
		var lineItems = new Array();
		for(var intPos=0; intPos < invList.length; intPos++)
		{
			var lineItem = new Array();
			lineItem['custpage_inv_list_select'] = 'F';
			lineItem['custpage_inv_list_id'] = invList[intPos].getId();
			lineItem['custpage_inv_list_invnum'] = invList[intPos].getValue('tranid');
			lineItem['custpage_inv_list_customer'] = invList[intPos].getValue('entity');
			lineItem['custpage_inv_list_amt'] = invList[intPos].getValue('amount');
			lineItem['custpage_inv_list_status'] = invList[intPos].getValue('status');
			lineItem['custpage_inv_list_createdby'] = invList[intPos].getValue('createdby');
			lineItem['custpage_inv_list_approvedby'] = invList[intPos].getValue('custbody_inv_approved_by');
			lineItem['custpage_inv_list_no_select'] = invList[intPos].getValue('custbody_do_not_add_queue');
			lineItem['custpage_inv_list_appr_status'] = invList[intPos].getText('approvalstatus');
			lineItems[lineItems.length] = lineItem;
		}
		
		invSubList.setLineItemValues(lineItems);
		
		form.addButton('custpage_remove', 'Remove Selected', 'removeSelInvsFrmQueueBtn()');
		form.addSubmitButton('Submit');
		form.addResetButton('Reset');
		form.setScript('customscript_invs_emailing_show_form_cli');
		response.writePage(form);
	}
	else
	{
		var count = request.getLineItemCount('custpage_inv_list');
		var selInvs = new Array();
		
		for(var line=1; line <= count; line++)
		{
			if(request.getLineItemValue('custpage_inv_list', 'custpage_inv_list_select', line) == 'T')
				selInvs[selInvs.length] = request.getLineItemValue('custpage_inv_list', 'custpage_inv_list_id', line);
		}
		
		//Now check whether the Submission is for Removal of Invoice from Queue or to send Email from Invoice
		if(request.getParameter('custpage_remove_selected') == 'T')
		{
			if(selInvs.length <= 85)
			{
				removeSelInvsFrmQueue(selInvs);
				
				var form = nlapiCreateForm('Selected Invoices are Removed from Queue.', false);
				(form.addField('custpage_message', 'inlinehtml', '')).setDefaultValue('<b>Selected Invoices are removed from Queue.</b>');
				var suiteletUrl = nlapiResolveURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
				form.addButton('custpage_goback', 'Go Back', "window.location='" + suiteletUrl + "';");
				response.writePage(form);
				return;
			}
		}
		
		//Now schedule a script to send emails out
		var params = new Array();
		params['custscript_sel_invs_to_email'] = JSON.stringify(selInvs);
		params['custscript_remove_sel_invs_frm_queue'] =  ((request.getParameter('custpage_remove_selected') == null || request.getParameter('custpage_remove_selected') == '') ? 'F' : request.getParameter('custpage_remove_selected')); 
		nlapiLogExecution('Debug', 'Checking', 'Selected Invoices - ' + JSON.stringify(selInvs));
		var status = nlapiScheduleScript('customscript_invoices_emailing_scheduled', 'customdeploy_invoices_emailing_scheduled', params);
		if(status != 'QUEUED')
			throw nlapiCreateError('ERROR_RESCHEDULING', 'Error occured while rescheduling the script. Please contact your administrator.', false);
		
		nlapiSubmitField('customrecord_inv_email_proc_status', 1, 'custrecord_inv_email_proc_status', 'T');
		var form = nlapiCreateForm('Invoices are Submitted for Processing', false);
		(form.addField('custpage_message', 'inlinehtml', '')).setDefaultValue('<b>Selected Invoices are submitted for processing. Please wait atleast 30min before intiating another batch.</b>');
		response.writePage(form);
		return;
	}
}

function custOnSubmit()
{
	var line = 1;
	for(; line <= nlapiGetLineItemCount('custpage_inv_list'); line++)
	{
		if(nlapiGetLineItemValue('custpage_inv_list', 'custpage_inv_list_select', line) == 'T')
			break;
	}
	if(line > nlapiGetLineItemCount('custpage_inv_list'))
	{
		alert('You must select atleast one Invoice to Submit');
		return false;
	}
	
	return true;
}

function removeSelInvsFrmQueue(selInvs)
{
	for(var idx=0; idx < selInvs.length; idx++)
	{
		try{
			nlapiSubmitField('invoice', selInvs[idx], 'custbody_email_delivery_status', '1', false);
		}catch(er){
			er = nlapiCreateError(er);
			nlapiLogExecution('Debug', 'Checking', 'Error occured while removing Inv with InternalId : ' + selInvs[idx] + ' form Email queue. Details: ' + er.getDetails());
		}
	}
}

function removeSelInvsFrmQueueBtn()
{
	var line = 1;
	for(; line <= nlapiGetLineItemCount('custpage_inv_list'); line++)
	{
		if(nlapiGetLineItemValue('custpage_inv_list', 'custpage_inv_list_select', line) == 'T')
			break;
	}
	if(line > nlapiGetLineItemCount('custpage_inv_list'))
	{
		alert('You must select atleast one Invoice to remove it from Queue');
		return false;
	}
	nlapiSetFieldValue('custpage_remove_selected', 'T');
	//document.getElementById('main_form').submit();
	document.getElementById('submitter').click();
}

function emailInvoiceSched()
{
	nlapiLogExecution('Debug', 'Checking', 'Email From - ' + emailFrom + ', EmailBcc - ' + emailBCC + ', Tmpl US - ' + emailTemplateIDUS + ', Tmpl UK - ' + emailTemplateIDUK + ', Tmpl CyberU - ' + emailTemplateIDCyberU + ', Tmpl Sonar6 - ' + emailTemplateIDSonar6);
	var selInvsStr = context.getSetting('SCRIPT', 'custscript_sel_invs_to_email');
	var isRemoveSelInvs = context.getSetting('SCRIPT', 'custscript_remove_sel_invs_frm_queue');
	if(selInvsStr == null || selInvsStr == '')
	{
		nlapiLogExecution('Debug', 'Checking', 'No Selected Invoices to Send Email. Returning');
		return;
	}
	nlapiLogExecution('Debug', 'Checking', 'Selected Invoices - ' + selInvs + ', IsRemoveSelInvs - ' + isRemoveSelInvs);
	
	var errors = new Array();
	try{
		var selInvs = JSON.parse(selInvsStr);
		//Start processing each invoice
		for(var idx=0; idx < selInvs.length; idx++)
		{
			var invId = selInvs[idx];
			
			try{
				nlapiLogExecution('Debug', 'Checking', '**** Start Processing InvId - ' + invId + ' ****');
				if(isRemoveSelInvs == 'T')
				{
					try{
						nlapiSubmitField('invoice', selInvs[idx], 'custbody_email_delivery_status', '1', false);
					}catch(er){
						er = nlapiCreateError(er);
						errors.push('Error occured while removing Inv with InternalId : ' + nlapiLookupField('invoice', invId, 'tranid') + ' form Email queue. Details: ' + er.getDetails());
						//errors.push('Error occured while removing Inv with InternalId : ' + selInvs[idx] + ' form Email queue. Details: ' + er.getDetails());
						//nlapiLogExecution('Debug', 'Checking', 'Error occured while removing Inv with InternalId : ' + selInvs[idx] + ' form Email queue. Details: ' + er.getDetails());
					}
				}
				else
				{
					var isError = emailInvoice(invId);
					if(isError)
						errors.push('Error occured while sending email for Invoice : ' + nlapiLookupField('invoice', invId, 'tranid') + ', Please check under notes section of Invoice to see more details');
				}
				nlapiLogExecution('Debug', 'Checking', '**** End Processing InvId - ' + invId + ' ****');
			}catch(er){
				var erMsg = nlapiCreateError(er);
				errors.push('An unspecified error was thrown while trying to process emailing for Invoice ' + nlapiLookupField('invoice', invId, 'tranid') + ': ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
				//nlapiLogExecution('Error', 'Email Invoice Error', 'An unspecified error was thrown while trying to process emailing for Invoice ' + invId + ': ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
				WriteNote(invId, '', 'An unspecified error was thrown while trying to process emailing. Details: ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
			}
			
			//Check script usage and reschedule if ncessary
			if(context.getRemainingUsage() <= 100)
			{
				sendErrorEmail(errors);
				var remainingInvs = new Array();
				idx++;
				for(; idx < selInvs.length; idx++)
					remainingInvs[remainingInvs.length] = selInvs[idx];
				if(remainingInvs.length > 0)
				{
					var params = new Array();
					params['custscript_sel_invs_to_email'] = JSON.stringify(remainingInvs);
					params['custscript_remove_sel_invs_frm_queue'] = isRemoveSelInvs;
					nlapiLogExecution('Debug', 'Checking', 'Remaining Invoices - ' + JSON.stringify(remainingInvs));
					var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), params);
					if(status != 'QUEUED')
					{
						//releaseLockToSuiteApp();
						nlapiSubmitField('customrecord_inv_email_proc_status', 1, 'custrecord_inv_email_proc_status', 'F');
						throw nlapiCreateError('ERROR_RESCHEDULING', 'Error occured while rescheduling the script. Please contact your administrator.', false);
					}
					return;
				}
			}
		}
	}catch(er){
		er = nlapiCreateError(er);
		errors.push('Error occured in the middle of the process. Details: ' + er.getDetails());
		//nlapiLogExecution('Debug', 'Checking', 'Error: ' + er.getDetails());
	}
	finally
	{
		nlapiSubmitField('customrecord_inv_email_proc_status', 1, 'custrecord_inv_email_proc_status', 'F');
		sendErrorEmail(errors);
		//releaseLockToSuiteApp();
	}
}

function sendErrorEmail(errors)
{
	if(errors.length > 0)
	{
		var body = "<p>Please see below for list of Invoices for those email didn't go out</p>";
		var emailTo = nlapiGetContext().getSetting('SCRIPT', 'custscript_inv_email_proc_err_email_to');
		
		if(emailFrom == null || emailFrom == '')
			emailFrom = '-5';
		
		for(var idx=0; idx < errors.length; idx++)
			body += errors[idx] + '<br />';
		
		var recs = new Array();
		recs['employee'] = emailFrom;		
		nlapiSendEmail(emailFrom, emailTo, 'Errors in Invoice Email Processing', body, null, null, recs);
	}	
}

function releaseLockToSuiteApp()
{
	nlapiLogExecution('Debug', 'Checking', 'Unchecking the flag now');
	var configObj = nlapiLoadConfiguration('companypreferences');
	configObj.setFieldValue('custscript_is_email_invs_suiteapp_in_use', 'F');
	nlapiSubmitConfiguration(configObj);
}

function emailInvoice(invId)
{
	var invFlds = nlapiLookupField('invoice', invId, ['entity', 'subsidiary', 'tranid', 'custbody_record_emailed_datetime', 'custbody_email_delivery_status']), errorFlag = false;
	
	if(invFlds['custbody_email_delivery_status'] == '3')
		return errorFlag;
	
	try
	{
		var pdfFile = GetInvoicePDF(invId);
		if (pdfFile != null)
		{
			try
			{
				// Get email addresses to send to from contacts associated to invoice customer
				var customer = invFlds['entity'];
				var invoiceRecipients = GetContactsFromCustomer(customer);
				if (invoiceRecipients != null && invoiceRecipients.length > 0)
				{
					var primaryRecipients = GetPrimaryContactsFromRecipients(invoiceRecipients);
					if (primaryRecipients.length == 1)
					{
						var email = primaryRecipients[0].Email;
						if (email != null && email != '')
						{
							var cc = null;
							var ccAddresses = GetCopyContactsStringArray(invoiceRecipients);
							if (ccAddresses != null && ccAddresses.length > 0)
								cc = ccAddresses;
							
							try
							{
								var subsidiary = invFlds['subsidiary'];
								if (subsidiary != null && subsidiary != '')
								{
									var emailTemplateID = emailTemplateIDUS;
									switch (subsidiary)
									{
										case '2':
											emailTemplateID = emailTemplateIDUS;
											break;
										case '4':
											emailTemplateID = emailTemplateIDUK;
											break;
										case '15':
											emailTemplateID = emailTemplateIDCyberU;
											break;
										case '18':
											emailTemplateID = emailTemplateIDSonar6;
											break;
									}
									
									//var mergeRecord = nlapiMergeRecord(emailTemplateID, 'invoice', invId);
									
									var emailMerger = nlapiCreateEmailMerger(emailTemplateID);
									emailMerger.setTransaction(invId);
									var mergeResult = emailMerger.merge();
									
									//if (mergeRecord != null)
									if (mergeResult != null)
									{
										try
										{
											var invoiceInternalIDs = new Object();
											invoiceInternalIDs['transaction'] = invId;
											
											var filters = new Array();
											filters.push(new nlobjSearchFilter('internalid', null, 'anyof', customer));
											
											var columns = new Array();
											columns.push(new nlobjSearchColumn('custentity_finance_responsible'));
											columns.push(new nlobjSearchColumn('email', 'custentityaccount_managers'));
											
											var results = nlapiSearchRecord('customer', null, filters, columns);
											if(results != null && results != '')
											{
												var acctMgrEmail = results[0].getValue('email', 'custentityaccount_managers');
												if(acctMgrEmail != null && acctMgrEmail != '')
												{
													if(cc == null)
														cc = acctMgrEmail;
													else
														cc[cc.length] = acctMgrEmail;
												}
												
												var tempEmailFrom = results[0].getValue('custentity_finance_responsible');
												if(tempEmailFrom != null && tempEmailFrom != '')
													emailFrom = tempEmailFrom;
												//nlapiSendEmail(emailFrom, email, mergeRecord.getName(), mergeRecord.getValue(), cc, emailBCC, invoiceInternalIDs, pdfFile);
												nlapiSendEmail(emailFrom, email, mergeResult.getSubject(), mergeResult.getBody(), cc, emailBCC, invoiceInternalIDs, pdfFile);
												emailSent = true;
												
												// Set print status to Email Sent, along with when sent and by whom
												var fields = new Array(), values = new Array();
												fields.push('custbody_email_delivery_status');
												values.push('3');
												
												fields.push('custbody_record_emailed');
												values.push('T');
												
												if(invFlds['custbody_record_emailed_datetime'] == '' || invFlds['custbody_record_emailed_datetime'] == null)
												{
													fields.push('custbody_record_emailed_date');
													fields.push('custbody_record_emailed_datetime');
													
													var date = new Date();						
													var dateStr = nlapiDateToString(new Date(), 'date');
													// push date format 
													values.push(dateStr);
													
													var hours = date.getHours();
													var amOrpm = 'am';
													if(hours >= 12)
														amOrpm = 'pm';
													if(hours == 0)
														hours = 12;
													hours = hours > 12 ? (hours - 12) : hours;
													dateStr += ' ' + hours + ':' + date.getMinutes() + ':' + date.getSeconds() + ' ' + amOrpm;
													nlapiLogExecution('Debug', 'Checking', 'Date: ' + dateStr);
													// push datetime format
													values.push(dateStr);
												}
												nlapiSubmitField('invoice', invId, fields, values, false);
												WriteNote(invId, invFlds['tranid'], 'Finished Sending Email & Updated Deliver Status to Email Delivered');
											}
											else
											{
												errorFlag = true;
												nlapiLogExecution('Error', 'Customer Not Found', "An unspecified error was thrown while trying to get Account Manager, Finance Emp. Responsible for Account field's values from Customer on Invoice " + invFlds['tranid']);
												WriteNote(invId, invFlds['tranid'], "An unspecified error was thrown while trying to get Account Manager, Finance Emp. Respobsible for Account field's values from Customer");
											}
										}
										catch (sendEmailException)
										{
											errorFlag = true;
											var erMsg = nlapiCreateError(sendEmailException);
											nlapiLogExecution('Error', 'Associate File Error', 'An error was thrown while trying to email the PDF file for Invoice ' + invFlds['tranid'] + ': ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
											WriteNote(invId, invFlds['tranid'], 'An error was thrown while trying to email the PDF file: ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
										}
									} //if (mergeRecord != null)
									else
									{
										errorFlag = true;
										nlapiLogExecution('Error', 'Email Template Merge Error', 'An unspecified error was thrown while trying to merge the invoice with the specified email template for Invoice ' + invFlds['tranid']);
										WriteNote(invId, invFlds['tranid'], 'An unspecified error was thrown while trying to merge the invoice with the specified email template');
									}
								} //if (!Utils.IsNullOrEmpty(subsidiary))
								else
								{
									errorFlag = true;
									nlapiLogExecution('Error', 'Subsidiary is Missing', 'No subsidiary on associated Invoice ' + invFlds['tranid']);
									WriteNote(invId, invFlds['tranid'], 'No subsidiary on associated Invoice');
								}
							}
							catch (mergeEmailException)
							{
								errorFlag = true;
								var erMsg = nlapiCreateError(mergeEmailException);
								nlapiLogExecution('Error', 'Email Template Merge Exception', 'An error was thrown while trying to merge the invoice with the specified email template for Invoice ' + invFlds['tranid'] + ': ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
								WriteNote(invId, invFlds['tranid'], 'An error was thrown while trying to merge the invoice with the specified email template: ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
							}
						} //if (!Utils.IsNullOrEmpty(email))
						else
						{
							errorFlag = true;
							nlapiLogExecution('Error', 'Email is Missing', 'No email address on associated invoice record ' + invFlds['tranid']);
							WriteNote(invId, invFlds['tranid'], 'No email address on associated invoice record');
						}
					} //if (primaryRecipients.length == 1)
					else
					{
						errorFlag = true;
						nlapiLogExecution('Error', 'Primary Contact Error', 'The # of primary contacts for the customer associated to the Invoice ' + invFlds['tranid'] + ' is invalid.  There should only be a single primary contact.');
						WriteNote(invId, invFlds['tranid'], 'The # of primary contacts for the customer associated to the invoice is invalid.  There should only be a single primary contact.');
					}
				} //if (invoiceRecipients != null && invoiceRecipients.length > 0)
				else
				{
					errorFlag = true;
					nlapiLogExecution('Error', 'No Contacts', 'No contacts on associated customer for Invoice ' + invFlds['tranid']);
					WriteNote(invId, invFlds['tranid'], 'No contacts on associated customer for Invoice');
				}
			}
			catch (getEmailException)
			{
				errorFlag = true;
				var erMsg = nlapiCreateError(getEmailException);
				nlapiLogExecution('Error', 'Lookup Error', 'An error was thrown while trying to lookup the email address on the associated Invoice ' + invFlds['tranid'] + ': ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
				WriteNote(invId, invFlds['tranid'], 'An error was thrown while trying to lookup the email address on the associated invoice: ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
			}
		} //if (pdfFile != null)
	}
	catch (pdfException)
	{
		errorFlag = true;
		var erMsg = nlapiCreateError(pdfException);
		nlapiLogExecution('Error', 'Associate File Error', 'An error was thrown while trying to generate the PDF file object for Invoice ' + invFlds['tranid'] + ': ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
		WriteNote(invId, invFlds['tranid'], 'An error was thrown while trying to generate the PDF file object: ' + (erMsg == null ? 'UNEXPECTED_ERROR' : erMsg.getDetails()));
	}
	
	return errorFlag;
}

function GetInvoicePDF(invId, folder, isConsolidated)
{
	var type = 'TRANSACTION';
	var format = 'PDF';
	var pdfFile = nlapiPrintRecord(type, invId, format, null);
	return pdfFile;
}

function GetContactsFromCustomer(customer)
{
	var invoiceRecipients = new Array();

	var columns = new Array();
	columns.push(new nlobjSearchColumn('custentity_invoicerecipient'));
	columns.push(new nlobjSearchColumn('email'));

	var filters = new Array();
	filters.push(new nlobjSearchFilter('company', null, 'anyof', customer));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));

	var contacts = nlapiSearchRecord('contact', null, filters, columns);
	if (contacts != null && contacts.length > 0)
	{
		for (var i = 0; i < contacts.length; i++)
		{
			var invoiceRecipient = new InvoiceRecipient();
			invoiceRecipient.ContactID = contacts[i].getId();
			invoiceRecipient.RecipientRole = contacts[i].getValue('custentity_invoicerecipient');
			invoiceRecipient.Email = contacts[i].getValue('email');
			invoiceRecipients.push(invoiceRecipient);
		}
	}

	return invoiceRecipients;
}

function GetPrimaryContactsFromRecipients(invoiceRecipients)
{
	var primaryRecipients = new Array();

	for (var i = 0; i < invoiceRecipients.length; i++)
	{
		if (invoiceRecipients[i].RecipientRole == '1')
		{
			primaryRecipients.push(invoiceRecipients[i]);
		}
	}

	return primaryRecipients;
}

function GetCopyContactsStringArray(invoiceRecipients)
{
	var copyRecipients = new Array();

	for (var i = 0; i < invoiceRecipients.length; i++)
	{
		if (invoiceRecipients[i].RecipientRole == '2')
		{
			copyRecipients.push(invoiceRecipients[i].Email);
		}
	}

	return copyRecipients;
}

function WriteNote(invId, invNum, message)
{
	try
	{
		var note = nlapiCreateRecord('note');
		note.setFieldValue('note', message);
		note.setFieldValue('transaction', invId);
		nlapiSubmitRecord(note);
	}
	catch (noteException)
	{
		var erMsg = nlapiCreateError(noteException);
		nlapiLogExecution('Error', 'Note Exception', 'An exception was thrown creating a note for Invoice ' + ((invNum == '' || invNum == null) ? ('record id ' + invId) : invNum) + ': ' + erMsg.getDetails() + '.  The note we tried to write was: ' + message);
	}
}

function OnBeforeLoad_AddToPDFQueue(type, form, request)
{
    if (type == "view")
    {
        if (nlapiGetFieldValue('custbody_email_delivery_status') != '2' && nlapiGetFieldValue('custbody_do_not_email') != 'T' && nlapiGetFieldValue('custbody_csod_add_grace_period') != 'T')
        {
            //form.addButton("custpage_addtoqueue", "Add to PDF/Email Queue", "nlapiSubmitField('invoice', " + invoiceID + ", 'custbody_queueforprintprocess', 'T', false); alert('Invoice had been added to PDF/Email Automation queue.');");
        	form.addButton("custpage_addtoqueue", "Add to Email Queue", "nlapiSubmitField('invoice', " + nlapiGetRecordId() + ", 'custbody_email_delivery_status', '2', false); alert('Invoice had been added to PDF/Email Automation queue.'); document.location.reload(true);");
        }
    }
} 

function InvoiceRecipient()
{
	this.ContactID = null;
	this.Email = null;
	this.RecipientRole = null;
}