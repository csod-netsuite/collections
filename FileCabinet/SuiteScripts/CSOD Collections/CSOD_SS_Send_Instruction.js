define(['N/search', 'N/file', 'N/email'], function (search, file, email) {

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
        // TODO load file
        file.load({

        });
        // TODO send email
    }

    exports.execute = execute;
    return exports;
});
