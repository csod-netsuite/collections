define(['N/search', 'N/file', 'N/email', 'N/runtime', './Libraries/CSOD_MR_Collection_Libs'],
	function (search, file, email, runtime, csod) {

    /**
     * Module Description...
     *
     * @exports XXX
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan     <cyi@csod.com>
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType ScheduledScript
     */
    var exports = {};

    /**
     * <code>execute</code> event handler
     *
     * @governance 10,000
     *
     * @param context
     *        {Object}
     * @param context.type
     *        {InvocationTypes} Enumeration that holds the string values for
     *            scheduled script execution contexts
     *
     * @return {void}
     *
     * @static
     * @function execute
     */
    function execute(context) {
        // TODO get list of emails by script params
    	var scriptObj = runtime.getCurrentScript();
    	var fileId = scriptObj.getParameter({name: "custscript_csod_coll_inst_file_id"});
    	var recipient = scriptObj.getParameter({name: "custscript_csod_coll_inst_email"});
    	var americaRecipient = scriptObj.getParameter({name: "custscript_csod_coll_inst_amrc_email"});
    	var emeaRecipient = scriptObj.getParameter({name: "custscript_csod_coll_inst_emea_email"});
    	var apjRecipient = scriptObj.getParameter({name: "custscript_csod_coll_inst_apj_email"});
    	var americaSearch = scriptObj.getParameter({name: "custscript_csod_coll_inst_amrc_src"});
    	var emeaSearch = scriptObj.getParameter({name: "custscript_csod_coll_inst_emea_src"});
    	var apjSearch = scriptObj.getParameter({name: "custscript_csod_coll_inst_apj_src"});

    	log.debug({
    		title: "Loaded Script Context",
    		details: "file ID: " + fileId + ", email : " + recipient
    	});
        // load instruction file
    	var attachedFile = file.load({
    		id: fileId
    	});

    	// get CSV file ID for APJ
        var amerCsvObj = csod.searchToCSV(americaSearch);
        var apjCsvObj = csod.searchToCSV(apjSearch);
        var emeaCsvObj = csod.searchToCSV(emeaSearch);
       
        // send email
    	var title = 'Collection Instructions';
    	var body = 'Please see attached PDF';

        sendEmail(americaRecipient, title, body, attachedFile, amerCsvObj);
        sendEmail(apjRecipient, title, body, attachedFile, apjCsvObj);
        sendEmail(emeaRecipient, title, body, attachedFile, emeaCsvObj);

    }

    var sendEmail = function(recipient, title, body, instruction, report) {
        email.send({
            author: 1343,
            recipients: recipient,
            subject: title,
            body: body,
            attachments: [instruction, report]
        });
    };

    exports.execute = execute;
    return exports;
});
