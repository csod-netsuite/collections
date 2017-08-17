define(['N/ui/serverWidget', 'N/runtime'], function (ui, runtime) {

    /**
     * Module Description...
     *
     * @exports XXX
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan - cyi@csod.com
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     * @NScriptType Suitelet
     */
    var exports = {};

    /**
     * <code>onRequest</code> event handler
     *
     * @governance XXX
     *
     * @param context
     *        {Object}
     * @param context.request
     *        {ServerRequest} The incoming request object
     * @param context.response
     *        {ServerResponse} The outgoing response object
     *
     * @return {void}
     *
     * @static
     * @function onRequest
     */
    function onRequest(context) {
        // TODO: create form and add sublist with list of invoices
        if(context.request.method === 'GET') {
            var form = ui.createForm({
               title: 'Multi "Add to Queue" Form'
            });

            context.response.writePage(form);
        }

    }

    exports.onRequest = onRequest;
    return exports;
});