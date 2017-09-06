/**
 *	06/12/2012 Kalyani Chintala, Case 27935
 *	09/13/2012 Kalyani Chintala, Eliminating editing last line in Group
 *	07/24/2013 Kalyani Chintala, DSG Case 33942
 *	11/11/2013 Kalyani Chintala, DSG Case 36720
 *	12/23/2013 Kalyani Chintala, DSG Case 37279
 *	04/01/2014 Kalyani Chintala, DSG Case 38925
 *	04/21/2015 Amod Deshpande, DSG Case 44985
 *	05/19/2015 Kalyani Chintala, DSG Case 45550
 *	05/10/2015 Amod Deshpande,	 DSG Case 48455
 */

function beforeLoad(type, form, request)
{
	if(type == 'view')
	{
		var role = nlapiGetRole();
		//nlapiLogExecution('Error', 'Checking', 'Role - ' + role);
		var filters = new Array();
		filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		filters.push(new nlobjSearchFilter('custrecord_roles_non_gl_fldupd_role', null, 'anyof', role));
		var results = nlapiSearchRecord('customrecord_roles_non_gl_fldupd_permiss', null, filters);
		if(results != null && results != '')
		{
			form.addButton('custpage_nonglfld_upd', 'Non GL Field Update', "callSuitelet(" + nlapiGetRecordId() + ", '" + nlapiGetRecordType() + "')");
			form.setScript('customscript_non_gl_fld_upd_invoice_clie');
		}
	}
}

function callSuitelet(recId, recType)
{
	if(recId == null || recId == '')
	{
		alert('Record Id is must!');
		return false;
	}
	
	var url = nlapiResolveURL('SUITELET', 'customscript_non_gl_fldupd_suitelet', 'customdeploy_non_gl_fldupd_suitelet');
	url += '&recid=' + recId + '&rectype=' + recType;	
	window.location = url;
}

function service(request, response)
{
	if(request.getMethod() == 'GET')
	{
		var recId = request.getParameter('recid');
		nlapiLogExecution('Error', 'Checking', 'Inv - ' + recId);
		var recType = request.getParameter('rectype');
		if(recId == null || recId == '' || recType == null || recType == '')
		{
			response.write('You must provide Record Id & Type');
			return;
		}
		var rec = nlapiLoadRecord(recType, recId);
		var entity = rec.getFieldValue('entity');
		
		var form = nlapiCreateForm('Update Non GL Impact Fields');
		
		var recIdFld = form.addField('custpage_recid', 'text', '');
		recIdFld.setDisplayType('hidden');
		recIdFld.setDefaultValue(recId);
		
		var recTypeFld = form.addField('custpage_rectype', 'text', '');
		recTypeFld.setDisplayType('hidden');
		recTypeFld.setDefaultValue(recType);
		
		var dateFld = form.addField('custpage_date', 'date', 'Date');
		dateFld.setDefaultValue(rec.getFieldValue('trandate'));
		
		var termFld = form.addField('custpage_term', 'select', 'Terms', 'term');
		termFld.setDefaultValue(rec.getFieldValue('terms'));
		
		var poFld = form.addField('custpage_po', 'text', 'PO #');
		poFld.setDefaultValue(rec.getFieldValue('otherrefnum'));
		
		var memoFld = form.addField('custpage_memo', 'text', 'Memo');
		memoFld.setDefaultValue(rec.getFieldValue('memo'));
      	
      	var invOnHoldfld = form.addField('custpage_csod_add_grace_period', 'checkbox', 'Collections Hold');
		invOnHoldfld.setDefaultValue(rec.getFieldValue('custbody_csod_add_grace_period'));
		
      	var invSentDatefld = form.addField('custpage_record_emailed_date', 'date', 'Invoice Sent Date');
		invSentDatefld.setDefaultValue(rec.getFieldValue('custbody_record_emailed_date'));
      
//***DSG Case 44985	start	
		var conDueDateChkFld = form.addField('custpage_contingent_due_check', 'checkbox', 'Contingent Due Date');
		conDueDateChkFld.setDefaultValue(rec.getFieldValue('custbody_contingent_due_check'));		

		var conDueDateFld = form.addField('custpage_contingent_due_date_text', 'text', 'Contingent Due Date Note');
		conDueDateFld.setDefaultValue(rec.getFieldValue('custbody_contingent_due_date_text'));		
//***DSG Case 44985 end
		var expPTP = form.addField('custpage_expected_ptp', 'date', 'Expected PTP');
		expPTP.setDefaultValue(rec.getFieldValue('custbody_expected_ptp'));
		if(nlapiGetRole() != '3' && nlapiGetRole() != '1043' && nlapiGetRole() != '1027' && nlapiGetRole() != '1065')
			expPTP.setDisplayType('hidden');

//***DSG Case 44985 start
		var warnNoticeFld = form.addField('custpage_warning_notice_date', 'date', 'Warning Notice');
		warnNoticeFld.setDefaultValue(rec.getFieldValue('custbody_warning_notice_date'));		

		var disrupNoticeFld = form.addField('custpage_disruption_notice_date', 'date', 'Disruption Notice');
		disrupNoticeFld.setDefaultValue(rec.getFieldValue('custbody_disruption_notice_date'));		
//***DSG Case 44985 end		
		
		var legalCtrFld = form.addField('custpage_legal_ctr_id', 'text', 'Legal Contract Id');
		legalCtrFld.setDefaultValue(rec.getFieldValue('custbodylegal_contract_id'));		
		
		var markingFld = form.addField('custpage_marking_fld', 'integer', 'Marking Field - Collections Notice sent');
		markingFld.setDefaultValue(rec.getFieldValue('custbody_collectionsnotice_markfield'));
		
		var doNotSendCollecEmailFld = form.addField('custpage_do_not_send_collec_email', 'checkbox', 'Do Not Send Overdue Notices');
		doNotSendCollecEmailFld.setDefaultValue(rec.getFieldValue('custbody_no_overdue_notices'));
		
		var doNotAddToQueueFld = form.addField('custpage_do_not_add_queue', 'checkbox', 'Do Not Add To Queue');
		doNotAddToQueueFld.setDefaultValue(rec.getFieldValue('custbody_do_not_add_queue'));
		
		var poReqDateFld = form.addField('custpage_po_requested_date', 'date', 'PO Request Date');
		poReqDateFld.setDefaultValue(rec.getFieldValue('custbody_po_requested_date'));
		
		//Adding Addresses list from Customer
		var addrTab = form.addTab('custpage_address_tab', 'Address');
		var filters = new Array();
		filters.push(new nlobjSearchFilter('internalid', null, 'anyof', entity));
		
		var columns = new Array();
		columns.push(new nlobjSearchColumn('addressinternalid'));
		columns.push(new nlobjSearchColumn('addresslabel'));
		columns.push(new nlobjSearchColumn('address1'));
		columns.push(new nlobjSearchColumn('address2'));
		columns.push(new nlobjSearchColumn('city'));
		columns.push(new nlobjSearchColumn('state'));
		columns.push(new nlobjSearchColumn('zipcode'));
		columns.push(new nlobjSearchColumn('country'));
		
		var addrList = nlapiSearchRecord('customer', null, filters, columns);
		if(addrList == null || addrList == '')
		{
			var addrFld = form.addField('custpage_addrlist', 'text', '', null, addrTab);
			addrFld.setDisplayType('inline');
			addrFld.setDefaultValue('There are no address found under Customer record for the Invoice ' + rec.getFieldValue('tranid'));
		}
		else
		{
			//var addrLookupTable = addressLookupTable(addrList);
			var billToSelFld = form.addField('custpage_billto', 'select', 'Bill To Select: ', null, 'custpage_address_tab');
			var shipToSelFld = form.addField('custpage_shipto', 'select', 'Ship To Select: ', null, 'custpage_address_tab');
			billToSelFld.addSelectOption('', '--Select--');
			shipToSelFld.addSelectOption('', '--Select--');
			for(var idx=0; idx < addrList.length; idx++)
			{
				var addrId = addrList[idx].getValue('addressinternalid');
				var addrLable = addrList[idx].getValue('addresslabel');
				var addr1 = addrList[idx].getValue('address1');
				
				var addr = addrLable;
				if(addr == null || addr == '')
					addr = addr1;
				if(addr == null || addr == '')
					addr = 'Unnamed Address';
				
				billToSelFld.addSelectOption(addrId, addr, (rec.getFieldValue('billaddresslist') == addrId ? true : false));
				shipToSelFld.addSelectOption(addrId, addr, (rec.getFieldValue('shipaddresslist') == addrId ? true : false));
			}
		}
		var custFlds = nlapiLookupField('customer', entity, ['email', 'fax']);
		
		//Adding Messaging Tab
		form.addTab('custpage_msg_tab', 'Messages');
		var printFld = form.addField('custpage_tobeprinted', 'checkbox', 'To Be Printed', null, 'custpage_msg_tab');
		printFld.setDefaultValue(rec.getFieldValue('tobeprinted'));
		
		var emailFld = form.addField('custpage_tobeemailed', 'checkbox', 'To Be Emailed', null, 'custpage_msg_tab');
		emailFld.setBreakType('startrow');
		emailFld.setDefaultValue(rec.getFieldValue('tobeemailed'));
		var email = form.addField('custpage_email', 'email', 'Email', null, 'custpage_msg_tab');
		email.setBreakType('startrow');
		if(rec.getFieldValue('email') != null && rec.getFieldValue('email') != '')
			email.setDefaultValue(rec.getFieldValue('email'));
		else
			email.setDefaultValue(custFlds['email'] == null ? '' : custFlds['email']);
		
		var blankFld = form.addField('custpage_blankspace', 'text', '', null, 'custpage_msg_tab');
		blankFld.setBreakType('startrow');
		blankFld.setDisplayType('hidden');
		
		var faxFld = form.addField('custpage_tobefaxed', 'checkbox', 'To Be Faxed', null, 'custpage_msg_tab');
		faxFld.setBreakType('startrow');
		faxFld.setDefaultValue(rec.getFieldValue('tobefaxed'));
		var fax = form.addField('custpage_fax', 'phone', 'Fax No', null, 'custpage_msg_tab');
		if(rec.getFieldValue('fax') != null && rec.getFieldValue('fax') != '')
			fax.setDefaultValue(rec.getFieldValue('fax'));
		else
			fax.setDefaultValue(custFlds['fax'] == null ? '' : custFlds['fax']);
		fax.setBreakType('startrow');
		
		var msgSelFld = form.addField('custpage_msgsel', 'textarea', 'Customer Message', null, 'custpage_msg_tab');
		msgSelFld.setBreakType('startrow');
		msgSelFld.setDefaultValue(rec.getFieldValue('message') == null ? '' : rec.getFieldValue('message'));
		/*msgSelFld.addSelectOption('', '');
		msgSelFld.addSelectOption('8', 'Amy Contact', rec.getFieldValue('messagesel') == '8' ? true : false);
		msgSelFld.addSelectOption('9', 'Daniel Contact', rec.getFieldValue('messagesel') == '9' ? true : false);
		msgSelFld.addSelectOption('6', 'Faye Contact', rec.getFieldValue('messagesel') == '6' ? true : false);
		msgSelFld.addSelectOption('7', 'Ryan Contact', rec.getFieldValue('messagesel') == '7' ? true : false);*/
		//nlapiLogExecution('Error', 'Checking', 'Message - ' + rec.getFieldValue('message'));
		
		//Setting up Item Descriptions
		form.addTab('custpage_items_tab', 'Items');
		var itemsList = form.addSubList('custlist', 'list', 'Items', 'custpage_items_tab');
		
		var itemFld = itemsList.addField('custlist_item', 'select', 'Item', 'item');
		itemFld.setDisplayType('inline');
		var descrFld = itemsList.addField('custlist_descr', 'textarea', 'Description');
		descrFld.setDisplayType('entry');
		var contingentBillFld = itemsList.addField('custlist_contingent_billing', 'checkbox', 'Contingent Billing');
		contingentBillFld.setDisplayType('entry');
		
		var items = new Array();
		for(var line=1; line <= rec.getLineItemCount('item'); line++)
		{
			var temp = new Array();
			var itemType = rec.getLineItemValue('item', 'itemtype', line);
			//nlapiLogExecution('Error', 'Checking', 'Item - ' + item + ', Line - ' + line);
			if(itemType == 'EndGroup')
			{
				nlapiLogExecution('Error', 'Checking', 'End of Group');
				temp['custlist_item'] = '';
				temp['custlist_descr'] = 'End of Group';
				temp['custlist_contingent_billing'] = '';
				items[items.length] = temp;
				continue;
			}
			temp['custlist_item'] = rec.getLineItemValue('item', 'item', line);
			temp['custlist_descr'] = rec.getLineItemValue('item', 'description', line);
			temp['custlist_contingent_billing'] = rec.getLineItemValue('item', 'custcolcontingent_billing_line', line);
			
			items[items.length] = temp;
		}
		itemsList.setLineItemValues(items);
		
		form.addSubmitButton('Submit');
		response.writePage(form);
	}
	else
	{
		var recId = request.getParameter('custpage_recid');
		var recType = request.getParameter('custpage_rectype');
		
		var date = request.getParameter('custpage_date');
		var term = request.getParameter('custpage_term');
		var po = request.getParameter('custpage_po');
		var memo = request.getParameter('custpage_memo');
      	var onhold = request.getParameter('custpage_csod_add_grace_period');
      	var invsentdate = request.getParameter('custpage_record_emailed_date');
//***DSG Case 44985 start
		var conDueDateCheck = request.getParameter('custpage_contingent_due_check');
		var conDueDate = request.getParameter('custpage_contingent_due_date_text');
		var warnNotc = request.getParameter('custpage_warning_notice_date');
		var dispNotc = request.getParameter('custpage_disruption_notice_date');
//***DSG Case 44985 end	
		var expPTPVal = request.getParameter('custpage_expected_ptp');
		var legalCtrId = request.getParameter('custpage_legal_ctr_id');

		var billTo = request.getParameter('custpage_billto');
		var shipTo = request.getParameter('custpage_shipto');
		
		var toBeEmail = request.getParameter('custpage_tobeemailed');
		var email = request.getParameter('custpage_email');
		var toBePrint = request.getParameter('custpage_tobeprinted');
		request.getParameter('custpage_tobefaxed');
		var fax = request.getParameter('custpage_fax');
		var msgSel = request.getParameter('custpage_msgsel');
		var markingFldVal = request.getParameter('custpage_marking_fld');
		var doNotSendCollecEmail = request.getParameter('custpage_do_not_send_collec_email');
		var doNotAddQueue = request.getParameter('custpage_do_not_add_queue');
		var poReqDate = request.getParameter('custpage_po_requested_date');
		
		var rec = nlapiLoadRecord(recType, recId);
		//nlapiLogExecution('Error', 'Checking', 'Rec Id - ' + rec.getFieldValue('tranid'));
		if(date != null && date != '' && rec.getFieldValue('trandate') != date)
		{
			//nlapiLogExecution('Error', 'Checking', 'Date on Rec - ' + rec.getFieldValue('trandate') + ', Date on Suitelet - ' + date);
			rec.setFieldValue('trandate', date);
		}
		
		rec.setFieldValue('terms', term == null ? '' : term);
		rec.setFieldValue('otherrefnum', po == null ? '' : po);
		rec.setFieldValue('memo', memo == null ? '' : memo);
      	rec.setFieldValue('custbody_csod_add_grace_period', onhold == null ? '' : onhold);
      	rec.setFieldValue('custbody_record_emailed_date', invsentdate == null ? '' : invsentdate);
//***DSG Case 44985 start
		rec.setFieldValue('custbody_contingent_due_check', conDueDateCheck == null ? '' : conDueDateCheck);
		rec.setFieldValue('custbody_contingent_due_date_text', conDueDate == null ? '' : conDueDate);
		rec.setFieldValue('custbody_warning_notice_date', warnNotc == null ? '' : warnNotc);
		rec.setFieldValue('custbody_disruption_notice_date', dispNotc == null ? '' : dispNotc);
//***DSG Case 44985 end
		rec.setFieldValue('custbodylegal_contract_id', legalCtrId == null ? '' : legalCtrId);
		
		if(nlapiGetRole() == '3' || nlapiGetRole() == '1043' || nlapiGetRole() == '1027' || nlapiGetRole() == '1065') //*** Updated for DSG Case 48455
			rec.setFieldValue('custbody_expected_ptp', expPTPVal == null ? '' : expPTPVal);
		if(markingFldVal != rec.getFieldValue('custbody_collectionsnotice_markfield') && markingFldVal != null)
			rec.setFieldValue('custbody_collectionsnotice_markfield', markingFldVal);
		if(doNotSendCollecEmail != rec.getFieldValue('custbody_no_overdue_notices'))
			rec.setFieldValue('custbody_no_overdue_notices', doNotSendCollecEmail);
		
		if(billTo != null && billTo != '' && rec.getFieldValue('billaddresslist') != billTo)
			rec.setFieldValue('billaddresslist', billTo);
		//nlapiLogExecution('Error', 'Checking', 'Ship To - ' + shipTo);
		if(shipTo != null && shipTo != '' && rec.getFieldValue('shipaddresslist') != shipTo)
			rec.setFieldValue('shipaddresslist', shipTo);
		
		if(toBePrint != null && toBePrint != '' && toBePrint != rec.getFieldValue('tobeprinted'))
			rec.setFieldValue('tobeprinted', toBePrint);
		if(toBeEmail != null && toBeEmail != '' && toBeEmail != rec.getFieldValue('tobeemailed'))
			rec.setFieldValue('tobeemailed', toBeEmail);
		if(email != null && email != '' && rec.getFieldValue('email') != email)
			rec.setFieldValue('email', email);
		if(fax != null && fax != '' && rec.getFieldValue('fax') != fax)
			rec.setFieldValue('fax', fax);
		if(msgSel != null && msgSel != '' && rec.getFieldValue('message') != msgSel)
			rec.setFieldValue('message', msgSel);
		
		rec.setFieldValue('custbody_po_requested_date', poReqDate == null ? '' : poReqDate);
		rec.setFieldValue('custbody_do_not_add_queue', doNotAddQueue == 'T'  ? 'T' : 'F');
		
		var count = request.getLineItemCount('custlist');
		for(var line=1; line <= count; line++)
		{
			var itemId = request.getLineItemValue('custlist', 'custlist_item', line);
			if(itemId == null || itemId == '')
				continue;
			var descr = request.getLineItemValue('custlist', 'custlist_descr', line);
			var origDescr = rec.getLineItemValue('item', 'description', line);
			//nlapiLogExecution('Error', 'Checking', 'New Descr - ' + descr + ', Old Descr - ' + origDescr);
			if(origDescr != descr)
			{
				rec.setLineItemValue('item', 'description', line, descr);
			}
			
			rec.setLineItemValue('item', 'custcolcontingent_billing_line', line, request.getLineItemValue('custlist', 'custlist_contingent_billing', line) == 'T' ? 'T' : 'F');
		}
		//nlapiLogExecution('Error', 'Checking', 'Submitting record - ' + rec.getFieldValue('tranid'));
		try{
			nlapiSubmitRecord(rec, false, true);
		}catch(er){
			er = nlapiCreateError(er);
			nlapiLogExecution('Error', 'Checking', 'Error - ' + er.getDetails());
			throw er;
		}
		nlapiSetRedirectURL('RECORD', recType, recId, false, null);
	}
}

function addressLookupTable(addrList)
{
	var addrLookupTable = new Array();
	
	for(var idx=0; idx < addrList.length; idx++)
	{
		var addr = '';
		var addrId = addrList[idx].getValue('addressinternalid');
		var addrLable = addrList[idx].getValue('addresslabel');
		var addr1 = addrList[idx].getValue('address1');
		var addr2 = addrList[idx].getValue('address2');
		var city = addrList[idx].getValue('city');
		var state = addrList[idx].getValue('state');
		var zip = addrList[idx].getValue('zipcode');
		var country = addrList[idx].getValue('country');
		
		if(addrLable != null && addrLable != '')
			addr += addrLable + '\n';
		if(addr1 != null && addr1 != '')
			addr += addr1 + '\n';
		if(addr2 != null && addr2 != '')
			addr += addr2 + '\n';
		if(city != null && city != '')
			addr += city + ' ';
		if(state != null && state != '')
			addr += state + ' ';
		if(zip != null && zip != '')
			addr += zip + '\n';
		if(country != null && country != '')
			addr += country;
		
		addrLookupTable['"' + addrId + '"'] = addr; 
	}
	
	/* for(var idx=0; idx < addrList.length; idx++)
		nlapiLogExecution('Error', 'Checking', 'Address - ' + addrLookupTable['"' + addrList[idx].getValue('addressinternalid') + '"']); */
	
	return addrLookupTable;
}

function afterSubmitInvoice(type)
{
	//nlapiLogExecution('Debug','Checking', 'Type : ' + type);	
	if ((type == 'create' || type == 'edit') && nlapiGetRecordType() == 'invoice')
	{
		var flds = new Array();
		var fldVals = new Array();
		var srchColumnDate = new nlobjSearchColumn('date', 'systemNotes');
		srchColumnDate.setSort(true);

		var filters = new Array();
		var columns = new Array();
		columns[0] = new nlobjSearchColumn('name', 'systemNotes');
		columns[1] = srchColumnDate;
		
		filters[0] = new nlobjSearchFilter('internalid', null, 'anyOf', nlapiGetRecordId());
		var searchInvResults = nlapiSearchRecord('invoice', '', filters, columns);		
			
		if (searchInvResults != null && searchInvResults.length > 0)
		{
			var lastModifiedBy = searchInvResults[0].getValue('name', 'systemNotes');
			if (lastModifiedBy != null && lastModifiedBy != '' && lastModifiedBy != '-4')
			{
				flds.push('custbody_last_modified_by');
				fldVals.push(lastModifiedBy);
				nlapiSubmitField('invoice', nlapiGetRecordId(), ['custbody_last_modified_by'], [lastModifiedBy] );
			}
		}
		
		if(nlapiGetUser() == '6966')
		{
		var updInvMsgFlag = false;
		if(type == 'create')
			updInvMsgFlag = true;
		else if(nlapiGetOldRecord().getFieldValue('billcountry') != nlapiGetNewRecord().getFieldValue('billcountry'))
			updInvMsgFlag = true;
		if(updInvMsgFlag)
		{
			var newRec = nlapiGetNewRecord();
			
			filters = new Array();
			columns = new Array();
			
			var subsidiary = newRec.getFieldValue('subsidiary');
			//nlapiLogExecution('Error', 'Checking', 'Subsidiary - ' + subsidiary);
			if(!(subsidiary == null || subsidiary == ''))
			{
				var billCtry = nlapiLookupField('invoice', newRec.getId(), 'billcountry', true);
				filters.push(new nlobjSearchFilter('custrecord_inv_msgs_subsidiary', null, 'anyof', newRec.getFieldValue('subsidiary')));
				filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
				
				columns.push(new nlobjSearchColumn('custrecord_inv_msgs_country'));
				columns.push(new nlobjSearchColumn('custrecord_inv_msgs_msg'));
				
				var invMsgs = nlapiSearchRecord('customrecord_inv_msgs', null, filters, columns);
				//nlapiLogExecution('Error', 'Checking', 'Invoice Messages - ' + invMsgs);
				if(!(invMsgs == null || invMsgs == ''))
				{
					var otherCtrys = -1, idx=0;
					for(idx=0; idx < invMsgs.length; idx++)
					{
						var invMsgCtry = invMsgs[idx].getText('custrecord_inv_msgs_country');
						//nlapiLogExecution('Error', 'Checking', 'Invoice Msg Country - ' + invMsgCtry + ', Bill Country - ' + billCtry);
						if(invMsgCtry == null || invMsgCtry == '')
							otherCtrys = idx;
						else
						{
							if(invMsgCtry == billCtry)
								break;
						}
					}
					if(idx == invMsgs.length && otherCtrys > -1)
						idx = otherCtrys;
					if(idx < invMsgs.length)
					{
						flds.push('custbody_inv_msg');
						fldVals.push(invMsgs[idx].getValue('custrecord_inv_msgs_msg'));
					}
				}
			}
		}
		
		if(flds.length > 0)
			nlapiSubmitField('invoice', nlapiGetRecordId(), flds, fldVals);
		}
	}
}
