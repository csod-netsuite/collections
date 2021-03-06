/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */

define(['./moment', 'N/format', 'N/record'],


function(moment, format, record) {
	
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


    function dateTimeToString(dateTime) {
        return format.format({
            value: dateTime,
            type: format.Type.DATETIME
        });
    }

    function stringToDateTimeToday(dateTime) {

	    var formattedDate = format.parse({
            value: new Date(),
            type: format.Type.DATETIME,
            timezone: format.Timezone.AMERICA_LOS_ANGELES
        });

        return format.format({
            value: formattedDate,
            type: format.Type.DATETIME
        });
    }
	
	
	// function to update custbody_adjusted_due_date
	// X = custbody_record_emailed_date - origDueDate
	// if X <= -15 then origDueDate
	// if X > -15 then custbody_record_emailed_date + 14 days
	
	function updateAdjustDueDate(context) {
		
		var newRec = context.newRecord;
		var oldRec = context.oldRecord;

        // UPDATE after release Oct 11th, 2017

        // If custbody_record_emailed_datetime is not empty and custbody_adjusted_due_date is empty
        // Fill out Invoice Sent Date
        var emailedDateTime = newRec.getValue({ fieldId: 'custbody_record_emailed_datetime' });

        if(emailedDateTime && !oldRec.getValue({ fieldId: 'custbody_record_emailed_date' }) ) {
            log.debug({
                title: 'Check emailedDateTime',
                details: 'Setting new value : ' + emailedDateTime
            });
            newRec.setValue({
                fieldId: 'custbody_record_emailed_date',
                value: new Date(emailedDateTime)
            });
        }

        var invoiceSentDate = newRec.getValue({ fieldId: 'custbody_record_emailed_date' }) || oldRec.getValue({ fieldId: 'custbody_record_emailed_date' });
		var origDueDate = oldRec.getValue({ fieldId: 'duedate' }) || newRec.getValue({ fieldId: 'duedate' });
		var oldAdjDueDate = oldRec.getValue({ fieldId: 'custbody_adjusted_due_date' });
		
		log.debug({
            title: 'Invoice Sent Date Variable Old Rec',
            details: 'Invoice Sent Date Variable Old Rec : ' + oldRec.getValue({ fieldId: 'custbody_record_emailed_date' })
        });
		
		log.debug({
            title: 'Invoice Sent Date Variable New Rec',
            details: 'Invoice Sent Date Variable New Rec : ' + newRec.getValue({ fieldId: 'custbody_record_emailed_date' })
        });
		
		log.debug({
            title: 'Invoice Sent Date Variable Leveraged',
            details: 'Invoice Sent Date Variable Leveraged : ' + invoiceSentDate
        });
		
		log.debug({
            title: 'Original Due Date Variable',
            details: 'Original Due Date : ' + origDueDate
        });
		
		log.debug({
            title: 'Old Adjusted Due Date Variable',
            details: 'Old Adjusted Due Date : ' + oldAdjDueDate
        });


        // Only populate if Adjusted New Date is not populated
      	// BC New Adjusting this to recalculate Adjusted Due Date - removing "&& !oldAdjDueDate" condition - if((invoiceSentDate && origDueDate) && !oldAdjDueDate)
		if(invoiceSentDate && origDueDate) {

			var dateDiff = new CalcDate(invoiceSentDate).getMomentDate().getDiff(origDueDate);
			
			log.debug({
	            title: 'Date Diff Variable',
	            details: 'dateDiff : ' + dateDiff
	        });
			
			var adjustedDueDate;
			
			if(dateDiff > -15) {
				adjustedDueDate = getFormattedDate(moment(invoiceSentDate).add(14, 'days'));
			} else {
				adjustedDueDate = getFormattedDate(moment(origDueDate));
			}
			
			log.debug({
				title: 'Adjusted Due Date Variable',
				details: 'Adjusted Due Date Variable: ' + adjustedDueDate
			});
			
			newRec.setValue({
				fieldId: 'custbody_adjusted_due_date',
				value: new Date(adjustedDueDate),
				ignoreFieldChange : true
			});

            newRec.setValue({
				fieldId: 'custbody_record_emailed',
				value: true,
                ignoreFieldChange: true
			});

		}




	}

	function submitRecord(rec, valueObj) {
        record.submitFields({
            type: rec.type,
            id: rec.id,
            values: valueObj,
            options: {
                enableSourcing: false,
                ignoreMandatoryFields : true
            }
        });
    }

	function createTimeStamp(oldRec, newRec) {

        if(oldRec.getValue({fieldId: 'custbody_csod_add_grace_period'}) == false
            && newRec.getValue({fieldId: 'custbody_csod_add_grace_period'}) == true) {
            // Grace Period is checked
            // write timestamp to custbody_csod_grace_period_startdate

            var dateToWrite = stringToDateTimeToday();
            log.debug(dateToWrite);
            submitRecord(newRec, {custbody_csod_grace_period_startdate : dateToWrite});

        } else if (oldRec.getValue({fieldId: 'custbody_csod_add_grace_period'}) == true
            && newRec.getValue({fieldId: 'custbody_csod_add_grace_period'}) == false) {
            // Grace Period is unchecked
            // write timestampt to custbody_csod_grace_period_enddate
            // Calculate how many grace periods were given in days

            var gracePeriodStartDate = moment(newRec.getValue({
                fieldId: 'custbody_csod_grace_period_startdate'
            }));

            var gracePeriodEndDate = moment(new Date());

            var daysWereOnHold = +oldRec.getValue({fieldId: 'custbody_csod_grace_period_days_onhold'}) || 0;
            var gracePeriodInDays = +gracePeriodEndDate.diff(gracePeriodStartDate, 'days') || 0;

            log.debug({
                title: 'Checking values in CreateTimeStamp',
                details: 'daysWereOnHold : ' + daysWereOnHold + ', gracePeriodInDays : ' + gracePeriodInDays
            });

            var valueObj = {
                custbody_csod_grace_period_enddate : stringToDateTimeToday(),
                custbody_csod_grace_period_days_onhold: gracePeriodInDays + daysWereOnHold
            };

            submitRecord(newRec, valueObj);

        }
	};
	
	// function addGracePeriod(rec, gracePeriod) {
	// 	var currDueDate = rec.getValue({fieldId: 'custbody_adjusted_due_date'});
    //
	// 	var dateGracePeriodAdded = getFormattedDate(moment(currDueDate).add(gracePeriod, 'days'));
    //
     //    log.debug({
     //        title: 'addGracePeriod',
     //        details: 'currDueDate : ' + currDueDate + ', dateGracePeriodAdded : ' + dateGracePeriodAdded
     //    });
    //
     //    // set new custbody_adjusted_due_date and uncheck custbody_csod_add_grace_period
    //
     //    var submittedId = record.submitFields({
     //       type: rec.type,
     //       id: rec.id,
     //       values: {
     //           custbody_adjusted_due_date: new Date(dateGracePeriodAdded)
     //       },
     //       options: {
     //           enableSourcing: false,
     //           ignoreMandatoryFields: true
     //       }
     //    });
    //
     //    log.debug({
     //        title: 'Record Updated',
     //        details: 'ID : ' + submittedId
     //    });
	// }

	exports.updateAdjustDueDate = updateAdjustDueDate;
	exports.createTimeStamp = createTimeStamp;
    return exports;
    
});