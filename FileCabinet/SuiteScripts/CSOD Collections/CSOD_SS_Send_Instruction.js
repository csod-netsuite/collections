define(['N/search', 'N/file', 'N/email', 'N/runtime'], function (search, file, email, runtime) {

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
    	
    	log.debug({
    		title: "Loaded Script Context",
    		details: "file ID: " + fileId + ", email : " + recipient
    	});
        // TODO load file
    	var attachedFile = file.load({
    		id: fileId
    	});
    	
       
        // TODO send email
    	var title = 'Collection Instructions';
    	var body = 'Please see attached PDF';
    	
    	email.send({
    		author: 1343,
    		recipients: recipient,
    		subject: title,
    		body: body,
    		attachments: [attachedFile]
    		
    	});
    }

    exports.execute = execute;
    return exports;
});
