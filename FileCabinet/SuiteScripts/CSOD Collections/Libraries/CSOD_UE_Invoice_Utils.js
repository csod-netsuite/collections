/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */

define(['./moment', 'N/format'],

function(moment, format) {
	
	var exports = {};
	
	// function to update custbody_adjusted_due_date
	// X = custbody_record_emailed_date - origDueDate
	// if X <= -15 then origDueDate
	// if X > -15 then custbody_record_emailed_date + 14 days
	
	function updateAdjustDueDate(context) {
		var record = context.newRecord;
		var origDueDate = moment(record.getValue({ fieldId: 'duedate' }));
		var invoiceSentDate = moment(record.getValue({ fieldId: 'custbody_record_emailed_date' }));
		var dateDiff = invoiceSentDate.diff(origDueDate, 'days'); // type is 'number'
		var adjustedDueDate;
		
		if(dateDiff > -15) {
			adjustedDueDate = invoiceSentDate.add(14, 'days');
		} else {
			adjustedDueDate = origDueDate;
		}
		
		var dateToWrite = getFormattedDate(adjustedDueDate);
		
		log.debug({
			title: 'Date fields validation',
			details: 'Due Date : ' + origDueDate + ', ' + 'Invoice Sent Date: ' + invoiceSentDate + ', Date Diff: ' + dateDiff
		});
		
		log.debug({
			title: 'Date to write',
			details: dateToWrite
		});
		
		
		
	}
	
	function getFormattedDate(dateToFormat) {
		var parsedDate = format.parse({
			value: dateToFormat,
			type: format.Type.DATE
		});
		
		return format.format({
			value: parsedDate,
			type: format.Type.DATE
		});
		
	}

	exports.updateAdjustDueDate = updateAdjustDueDate;
    return exports;
    
});
