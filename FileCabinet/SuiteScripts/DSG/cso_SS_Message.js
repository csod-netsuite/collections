/**
 * Module Description
 * 
 * Version		Date			Author           	Remarks
 * 1.00       	06/19/2015    	Kalyani Chintala	DSG Case 46275 
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord Message
 */
function beforeLoad(type, form, request)
{
	if(type == 'create')
	{
		var tmplId = '';
		if(request != null && request != '' && request != 'undefined')
		{
			tmplId = request.getParameter('template');
			nlapiLogExecution('Debug', 'Checking', 'Tmpl Id- ' + tmplId);
		}
		var templateSelFld = form.getField('template');
		templateSelFld.setDisplayType('normal');
		
		var custId = nlapiGetFieldValue('recipient');
		var tranId = nlapiGetFieldValue('transaction'), invRec = null;
		if(tranId != null && tranId != '')
		{
			try{
				invRec = nlapiLoadRecord('invoice', tranId);
				custId = invRec.getFieldValue('entity');
			}catch(er){
				return;
			}
		}
		
		nlapiLogExecution('Debug', 'Checking', 'CustId - ' + custId);
		if(custId != null && custId != '' && tmplId != '' && tmplId != null && invRec != null)
			loadDefaultVals(custId, tmplId, nlapiGetFieldValue('transaction'), true);
		
		var inlineHtmlFld = form.addField('custpage_customizations_pageload', 'inlinehtml', 'Customizations', null, 'messages');
		var script = '<script type="text/javascript">\n';
		script += 'function custOnTmplFldChg() { \n';
		script += '		var msgUrl = nlapiResolveURL("RECORD", "message");\n';
		script += '		msgUrl += "?l=T&transaction=" + nlapiGetFieldValue("transaction") + "&entity=" + nlapiGetFieldValue("recipient") + "&templatetype=EMAIL&template=" + nlapiGetFieldValue("template");\n';
		script += '		setWindowChanged(window, false);\n';
		script += '		window.location = msgUrl;\n';
		script += '}\n';
		script += "var currOnChgFunc = document.getElementById('hddn_template3').onchange;\n";
		script += "document.getElementById('hddn_template3').onchange = function() { custOnTmplFldChg(); return true; }\n";
		script += '</script>\n';
		inlineHtmlFld.setDefaultValue(script);
	}
}

function getCCEmpList(customerRec, exclEmpList, ccListFlds, pdfTmplId)
{
	var ccEmpList = new Array();
	if(ccListFlds != '')
	{
		var tmpCCListFlds = ccListFlds.split('|');
		for(var idx=0; idx < tmpCCListFlds.length; idx++)
		{
			var fldId = convNull(tmpCCListFlds[idx]);
			if(fldId != '')
			{
				var empId = convNull(customerRec.getFieldValue(fldId.trim())), idxExcl=0;
				for(; idxExcl < exclEmpList.length; idxExcl++)
				{
					var exclEmp = convNull(exclEmpList[idxExcl]);
					if(exclEmp.trim() == empId)
						break;
				}
				if(idxExcl == exclEmpList.length)
				{
					var idxE = 0;
					for(idxE=0; idxE < ccEmpList.length; idxE++)
					{
						if(ccEmpList[idxE] == empId)
							break;
					}
					if(idxE == ccEmpList.length)
						ccEmpList.push(empId);
				}
			}
		}
	}
	
	if(pdfTmplId != '')
	{
		var defCCEmpResults = nlapiSearchRecord('employee', 'customsearch_default_cc_emp_on_email');
		if(defCCEmpResults != null && defCCEmpResults != '')
		{
			for(var idx=0; idx < defCCEmpResults.length; idx++)
			{
				var idxCC=0;
				for(; idxCC < ccEmpList.length; idxCC++)
				{
					if(ccEmpList[idxCC] == defCCEmpResults[idx].getId())
						break;
				}
				if(idxCC == ccEmpList.length)
					ccEmpList.push(defCCEmpResults[idx].getId());
			}
		}
	}
	
	var ccEmpListResults = null;
	if(ccEmpList.length > 0)
	{
		filters = new Array();
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('internalid', null, 'anyof', ccEmpList));
		cols = new Array();
		cols.push(new nlobjSearchColumn('email'));
		ccEmpListResults = nlapiSearchRecord('employee', null, filters, cols);
	}
	
	return ccEmpListResults;
}

function getBCCEmpList(customerRec, exclEmpList, bccListFlds)
{
	nlapiLogExecution('DEBUG', 'getBCCEmpList', 'bccListFlds - ' + bccListFlds);
	nlapiLogExecution('DEBUG', 'getBCCEmpList', 'exclEmpList - ' + exclEmpList);
	var bccEmpList = new Array();
	if(bccListFlds != '')
	{
		var tmpBCCListFlds = bccListFlds.split('|');
		for(var idx=0; idx < tmpBCCListFlds.length; idx++)
		{
			var fldId = convNull(tmpBCCListFlds[idx]);
			if(fldId != '')
			{
				var empId = convNull(customerRec.getFieldValue(fldId.trim())), idxExcl=0;
				for(; idxExcl < exclEmpList.length; idxExcl++)
				{
					var exclEmp = convNull(exclEmpList[idxExcl]);
					if(exclEmp.trim() == empId)
						break;
				}
				if(idxExcl == exclEmpList.length)
				{
					var idxE = 0;
					for(idxE=0; idxE < bccEmpList.length; idxE++)
					{
						if(bccEmpList[idxE] == empId)
							break;
					}
					if(idxE == bccEmpList.length)
						bccEmpList.push(empId);
				}							
			}
		}
	}
	
	var bccEmpListResults = null;
	if(bccEmpList.length > 0)
	{
		var filters = new Array();
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('internalid', null, 'anyof', bccEmpList));
		var cols = new Array();
		cols.push(new nlobjSearchColumn('email'));
		bccEmpListResults = nlapiSearchRecord('employee', null, filters, cols);
	}
	return bccEmpListResults;
}

function loadDefaultVals(custId, tmplId, tranId, isBeforeLoad)
{
	var customerRec = null;
	try{
		customerRec = nlapiLoadRecord('customer', custId);
	}catch(er){
		return;
	}
	var recipientEmail = nlapiGetFieldValue('recipientemail');
	nlapiLogExecution('Debug', 'Checking', 'Recipient Email - ' + recipientEmail);
	nlapiLogExecution('Debug', 'Checking', 'tranId - ' + tranId);
	var toEmail = recipientEmail == null ? '' : recipientEmail;
	
	toEmail = getToEmail(custId, toEmail);
	
	nlapiLogExecution('Debug', 'Chan-Check', toEmail);
	
	var ccEmailsList = getCCEmailsList(custId);
	nlapiLogExecution('Debug', 'Chan-Check', ccEmailsList);
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('custrecord_email_tmpl_assoc_pdf_file'));
	cols.push(new nlobjSearchColumn('custrecord_email_tmpl_cc_fields'));
	cols.push(new nlobjSearchColumn('custrecord_email_tmpl_bcc_fields'));
	cols.push(new nlobjSearchColumn('custrecord_email_tmpl_exclude_emp_cc_bcc'));
	
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecord_email_template', null, 'anyof', tmplId));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var tmplRecs = nlapiSearchRecord('customrecord_email_pdf', null, filters, cols);
	
	if(tmplRecs != null && tmplRecs != '')
	{
		nlapiGetContext().setSessionObject('custscript_customrecord_email_pdf', tmplRecs[0].getId());
		var pdfTmplId = convNull(tmplRecs[0].getValue('custrecord_email_tmpl_assoc_pdf_file'));
		var exclEmpStr = convNull(tmplRecs[0].getValue('custrecord_email_tmpl_exclude_emp_cc_bcc'));
		var exclEmpList = new Array();
		if(exclEmpStr != '')
			exclEmpList = exclEmpStr.split(',');
		
		var ccEmpListResults = getCCEmpList(customerRec, exclEmpList, convNull(tmplRecs[0].getValue('custrecord_email_tmpl_cc_fields')), pdfTmplId);
		var bccEmpListResults = getBCCEmpList(customerRec, exclEmpList, convNull(tmplRecs[0].getValue('custrecord_email_tmpl_bcc_fields')));
		
		nlapiSetFieldValue("requestreadreceipt", "T");
		nlapiSetFieldValue("recipientemail", toEmail);
		if(isBeforeLoad)
		{
			if(pdfTmplId != '')
			{
				var txnId = convNull(nlapiGetFieldValue('transaction'));
				nlapiLogExecution('Debug', 'Checking', 'Txn Id - ' + txnId);
				if(txnId != '')
				{
					var invRec = null;
					txnId = parseInt(txnId, 10);
					try{
						invRec = nlapiLoadRecord('invoice',  txnId);
					}catch(er){
					
					}
					if(invRec != null)
					{
						invRec.setFieldValue('custbody_amt_due', invRec.getFieldValue('amountremaining'));
						nlapiSubmitRecord(invRec, false, true);
					}
				}
			}
			nlapiSetFieldValue("letter", pdfTmplId);
			nlapiSetFieldValue("includetransaction", "T");
			nlapiSetFieldValue("emailpreference", "PDF");
			
			nlapiLogExecution('Debug', 'Checking', 'CC Emails List - ' + ccEmailsList.length);
			for(var ccListIdx=0; ccListIdx < ccEmailsList.length; ccListIdx++)
			{
				nlapiSelectNewLineItem("ccbcclist");
				nlapiSetCurrentLineItemValue("ccbcclist", "copyentity", ccEmailsList[ccListIdx].id, true, true);
				nlapiSetCurrentLineItemValue("ccbcclist", "email", ccEmailsList[ccListIdx].email, true, true);
				nlapiSetCurrentLineItemValue("ccbcclist", "cc", ccEmailsList[ccListIdx].isBcc ? "F" : "T");
				nlapiSetCurrentLineItemValue("ccbcclist", "bcc", ccEmailsList[ccListIdx].isBcc ? "T" : "F");
				nlapiCommitLineItem("ccbcclist");
			}
			if(ccEmpListResults != null && ccEmpListResults != '')
			{
				nlapiLogExecution('Debug', 'Checking', 'CC Employee Emails List - ' + ccEmpListResults.length);
				for(var idx=0; idx < ccEmpListResults.length; idx++)
				{
					nlapiSelectNewLineItem("ccbcclist");
					nlapiSetCurrentLineItemValue("ccbcclist", "copyentity", ccEmpListResults[idx].getId(), true, true);
					nlapiSetCurrentLineItemValue("ccbcclist", "email", ccEmpListResults[idx].getValue('email'), true, true);
					nlapiSetCurrentLineItemValue("ccbcclist", "cc", "T");
					nlapiSetCurrentLineItemValue("ccbcclist", "bcc", "F");
					nlapiCommitLineItem("ccbcclist");
				}
			}
			if(bccEmpListResults != null && bccEmpListResults != '')
			{
				nlapiLogExecution('Debug', 'Checking', 'BCC Emails List - ' + bccEmpListResults.length);
				for(var idx=0; idx < bccEmpListResults.length; idx++)
				{
					nlapiSelectNewLineItem("ccbcclist");
					nlapiSetCurrentLineItemValue("ccbcclist", "copyentity", bccEmpListResults[idx].getId(), true, true);
					nlapiSetCurrentLineItemValue("ccbcclist", "email", bccEmpListResults[idx].getValue('email'), true, true);
					nlapiSetCurrentLineItemValue("ccbcclist", "cc", "F");
					nlapiSetCurrentLineItemValue("ccbcclist", "bcc", "T");
					nlapiCommitLineItem("ccbcclist");
				}
			}
			var setToEmailFld = form.addField('custpage_customizationss_set_toemail', 'inlinehtml', 'ToEmail', null, 'recipients');
			var scriptToSetToEmail = '<script type="text/javascript">\n';
			scriptToSetToEmail += 'if(document.getElementById("recipientemail") != null && document.getElementById("recipientemail") != "" && document.getElementById("recipientemail") != "undefined")\n';
			scriptToSetToEmail += '{\n';
			scriptToSetToEmail += '		document.getElementById("recipientemail").value = "' + toEmail + '";\n';
			scriptToSetToEmail += '}\n';
			scriptToSetToEmail += '</script>';
			setToEmailFld.setDefaultValue(scriptToSetToEmail);
		}
		else
		{
			//Prepare attachments
			if(pdfTmplId != '')
			{
				var file = nlapiMergeRecord(pdfTmplId, 'invoice', tranId);
				file.setFolder('990769');
				file.setName(file.getName() + '_' + tranId + '_' + nlapiDateToString(new Date()).replace(/\//gi, '_') + '.pdf');
				//var fName = file.getName();
				var pdfTmplFileId = nlapiSubmitFile(file);
				nlapiSelectNewLineItem('mediaitem');
				nlapiSetCurrentLineItemValue('mediaitem', 'mediaitem', pdfTmplFileId);
				nlapiCommitLineItem('mediaitem');
			}
			var invAttachment = nlapiPrintRecord('TRANSACTION', tranId, 'PDF');
			invAttachment.setFolder('990769');
			var fileId = nlapiSubmitFile(invAttachment);
			nlapiSelectNewLineItem('mediaitem');
			nlapiSetCurrentLineItemValue('mediaitem', 'mediaitem', fileId);
			nlapiCommitLineItem('mediaitem');
			
			//Now setup CC and BCC values
			var ccEmails = '', bccEmails = '';
			for(var ccListIdx=0; ccListIdx < ccEmailsList.length; ccListIdx++)
				ccEmails += (ccEmails == '' ? ccEmailsList[ccListIdx].email : (';' + ccEmailsList[ccListIdx].email));
			
			if(ccEmpListResults != null && ccEmpListResults != '')
			{
				nlapiLogExecution('Debug', 'Checking', 'CC Employee Emails List - ' + ccEmpListResults.length);
				for(var idxList=0; idxList < ccEmpListResults.length; idxList++)
					ccEmails += (ccEmails == '' ? ccEmpListResults[idxList].getValue('email') : (';' + ccEmpListResults[idxList].getValue('email')));
			}
			if(bccEmpListResults != null && bccEmpListResults != '')
			{
				nlapiLogExecution('Debug', 'Checking', 'BCC Emails List - ' + bccEmpListResults.length);
				for(var idxList=0; idxList < bccEmpListResults.length; idxList++)
					bccEmails += (bccEmails == '' ? bccEmpListResults[idxList].getValue('email') : (';' + bccEmpListResults[idxList].getValue('email')));
			}
			nlapiLogExecution('Debug', 'Checking', 'CC Emails - ' + ccEmails);
			nlapiLogExecution('Debug', 'Checking', 'BCC Emails - ' + bccEmails);
			nlapiSetFieldValue('cc', ccEmails);
			nlapiSetFieldValue('bcc', bccEmails);
		}
	}
}

function getToEmail(custId, toEmail)
{
	var filters = new Array();
	//filters.push(new nlobjSearchFilter('company', null, 'anyof', custId));
	filters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', custId));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custentity_invoicerecipient', null, 'anyof', ['1']));
	filters.push(new nlobjSearchFilter('email', null, 'isnotempty'));
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('email'));
	cols.push(new nlobjSearchColumn('custentity_invoicerecipient'));
	
	var contacts = nlapiSearchRecord('contact', null, filters, cols);
	if(contacts != null && contacts != '')
		toEmail = contacts[0].getValue('email');
	
	return toEmail;
}

function getCCEmailsList(custId)
{
	var ccEmailsList = new Array();
	
	var filters = new Array();
	//filters.push(new nlobjSearchFilter('company', null, 'anyof', custId));
	filters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', custId));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	filters.push(new nlobjSearchFilter('custentity_invoicerecipient', null, 'anyof', ['2']));
	filters.push(new nlobjSearchFilter('email', null, 'isnotempty'));
	
	var cols = new Array();
	cols.push(new nlobjSearchColumn('email'));
	cols.push(new nlobjSearchColumn('custentity_invoicerecipient'));
	
	var contacts = nlapiSearchRecord('contact', null, filters, cols);
	if(contacts != null && contacts != '')
	{
		for(var idx=0; idx < contacts.length; idx++)
		{
			ccEmailsList.push(new ccObjs(contacts[idx].getId(), contacts[idx].getValue('email'), false));
		}
	}
	
	return ccEmailsList;
}

function beforeSubmit(type)
{
	nlapiLogExecution('Debug', 'Checking', 'Context - ' + nlapiGetContext().getExecutionContext());
	if(type == 'create' && nlapiGetContext().getExecutionContext() == 'scheduled')
	{
		var tmplId = convNull(nlapiGetFieldValue('template'));
		var custId = convNull(nlapiGetFieldValue('recipient'));
		var invId = convNull(nlapiGetFieldValue('transaction'));
		if(invId != '')
		{
			invId = parseInt(invId, 10);
			nlapiLogExecution('Debug', 'Checking', 'Inv Id - ' + invId);
			try{
				nlapiLoadRecord('invoice', invId);
			}catch(er){
				nlapiLogExecution('Debug', 'Checking', 'Message is not for Invoice');
				return;
			}
		}
		
		if(tmplId != '' && custId != '' && invId != '')
		{
			loadDefaultVals(custId, tmplId, invId, false);
		}
	}
}

function afterSubmit(type)
{
	if(type == 'create')
	{
		var custRecId = nlapiGetContext().getSessionObject('custscript_customrecord_email_pdf');
		if(custRecId != null && custRecId != '')
		{
			var msgRec = nlapiGetNewRecord();
			var custId = msgRec.getFieldValue('recipient');
			
			var invId = msgRec.getFieldValue('transaction'), invRec = null;
			try{
				invRec = nlapiLoadRecord('invoice', invId);
			}catch(er){
				return;
			}
			if(invRec == null)
				return;
			
			nlapiLogExecution('Debug', 'Checking', 'Cust Id - ' + custId + ', InvId - ' + invId);
			var custRec = nlapiLoadRecord('customrecord_email_pdf', custRecId);
			var collecStatus = convNull(custRec.getFieldValue('custrecord_collections_status_field'));
			var collecStatusTxt = convNull(custRec.getFieldText('custrecord_collections_status_field'));
			var customerDtFldsUpd = convNull(custRec.getFieldValue('custrecord_customer_date_field'));
			var invDtFldsUpd = convNull(custRec.getFieldValue('custrecord_invoice_date_field'));
			var csod_coll_status = convNull(custRec.getFieldValue('custrecord_csod_coll_notice_list'))
			
			if(customerDtFldsUpd != '')
			{
				var customerRec = nlapiLoadRecord('customer', custId);
				var tmpFlds = customerDtFldsUpd.split('|');
				for(var idx=0; idx < tmpFlds.length; idx++)
				{
					var fldId = convNull(tmpFlds[idx]).trim();
					if(fldId != '')
						customerRec.setFieldValue(fldId, nlapiDateToString(new Date()));
				}
				nlapiSubmitRecord(customerRec, false, true);
			}
			
			if(invDtFldsUpd != '' || csod_coll_status != '')
			{
				var invRec = nlapiLoadRecord('invoice', invId);
				if(invDtFldsUpd){
				    var tmpFlds = invDtFldsUpd.split('|');
                    for(var idx=0; idx < tmpFlds.length; idx++)
                    {
                        var fldId = convNull(tmpFlds[idx]).trim();
                        if(fldId != '')
                            invRec.setFieldValue(fldId, nlapiDateToString(new Date()));

                    }
				}
                if(csod_coll_status) {
				    invRec.setFieldValue('custbody_last_notice_sent', csod_coll_status);
                }
				nlapiSubmitRecord(invRec, false, true);
			}
			
			if(collecStatus != '')
			{
				nlapiLogExecution('Debug', 'Checking', 'Creating Task');
				var taskRec = nlapiCreateRecord('task', {'recordmode' : 'dynamic'});
				//Setting Title
				var lastModDate = nlapiDateToString(new Date(), 'datetimetz');
				taskRec.setFieldValue('custevent_date_last_modified', lastModDate);
				taskRec.setFieldValue('title', lastModDate + ' ' + collecStatusTxt);
				
				taskRec.setFieldValue('custevent_collections_status', collecStatus);
				taskRec.setFieldValue('company', custId);
				taskRec.setFieldValue('status', 'COMPLETE');
				
				//Setting Invoices
				var invIds = new Array();
				invIds.push(invId);
				taskRec.setFieldValues('custevent_related_invoices', invIds);
				nlapiLogExecution('Debug', 'Checking', 'Submitting Task Rec');
				var taskId = nlapiSubmitRecord(taskRec, true, true);
				
				//Now call suitelet to submit the taskRec so that server side scripts on task record will get executed
				var suiteletUrl = nlapiResolveURL('SUITELET', 'customscript_trig_task_ue_scripts', 'customdeploy_trig_task_ue_scripts', true);
				nlapiLogExecution('Debug', 'Checking', 'URL - ' + suiteletUrl);
				suiteletUrl += '&taskId=' + taskId;
				nlapiRequestURL(suiteletUrl);
				nlapiLogExecution('Debug', 'Checking', 'Done requesting URL');			
			}
		}
	}
}

function serviceTask(request, response)
{
	var taskId = convNull(request.getParameter('taskId'));
	if(taskId == '')
		return;
	var taskRec = nlapiLoadRecord('task', taskId);
	nlapiSubmitRecord(taskRec, false, true);
}

function ccObjs(id, email, isBcc)
{
	this.id = id;
	this.email = email;
	this.isBcc = isBcc;
}

function convNull(value)
{
	if(value == null)
		value = '';
	return value;
}

function tmplObj(tmplId, pdfTmplId, ccList, bccList)
{
	this.tmplId = tmplId;
	this.pdfTmplId = pdfTmplId;
	this.ccList = ccList;
	this.bccList = bccList;
}

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
};