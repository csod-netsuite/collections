/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */

define(['./moment', 'N/format'],

function(moment, format) {
	
	var exports = {};
	
	function CalcDate(startDate) {
		
		var that = this;
		
		this.getMomentDate = function() {
			startDate = moment(startDate);
			return that; 
		};
		
		this.getDiff = function(compareDate) {
			compareDate = moment(compareDate);
			return startDate.diff(compareDate, 'days');
		}
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
	
	
	// function to update custbody_adjusted_due_date
	// X = custbody_record_emailed_date - origDueDate
	// if X <= -15 then origDueDate
	// if X > -15 then custbody_record_emailed_date + 14 days
	
	function updateAdjustDueDate(context) {
		
		log.audit({
			title: 'updateAdjustDueDate called',
			details: ''
		});
		
		var newRec = context.newRecord;
		var oldRec = context.oldRecord;
		var origDueDate = oldRec.getValue({ fieldId: 'duedate' }) || newRec.getValue({ fieldId: 'duedate' });
		var invoiceSentDate = oldRec.getValue({ fieldId: 'custbody_record_emailed_date' }) || newRec.getValue({ fieldId: 'custbody_record_emailed_date' });
		var oldAdjDueDate = oldRec.getValue({ fieldId: 'custbody_adjusted_due_date' });
		
		if((invoiceSentDate && origDueDate) && !oldAdjDueDate) {
			var dateDiff = new CalcDate(invoiceSentDate).getMomentDate().getDiff(origDueDate);
			
			var adjustedDueDate;
			
			if(dateDiff > -15) {
				adjustedDueDate = getFormattedDate(moment(invoiceSentDate).add(14, 'days'));
			} else {
				adjustedDueDate = getFormattedDate(moment(origDueDate));
			}
			
			log.debug({
				title: 'Date fields validation',
				details: 'Due Date : ' + origDueDate + ', ' + 'Invoice Sent Date: ' + invoiceSentDate + ', Date Diff: ' + dateDiff
			});
			
			newRec.setValue({
				fieldId: 'custbody_adjusted_due_date',
				value: new Date(adjustedDueDate),
				ignoreFieldChange : true
			});
		}

	}
	


	exports.updateAdjustDueDate = updateAdjustDueDate;
    return exports;
    
});
