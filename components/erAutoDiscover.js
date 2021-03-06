/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * -- Exchange 2007/2010 Calendar and Tasks Provider.
 * -- For Thunderbird with the Lightning add-on.
 *
 * This work is a combination of the Storage calendar, part of the default Lightning add-on, and 
 * the "Exchange Data Provider for Lightning" add-on currently, october 2011, maintained by Simon Schubert.
 * Primarily made because the "Exchange Data Provider for Lightning" add-on is a continuation 
 * of old code and this one is build up from the ground. It still uses some parts from the 
 * "Exchange Data Provider for Lightning" project.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/wordpress/?page_id=133
 * email: exchangecalendar@extensions.1st-setup.nl
 *
 *
 * This code uses parts of the Microsoft Exchange Calendar Provider code on which the
 * "Exchange Data Provider for Lightning" was based.
 * The Initial Developer of the Microsoft Exchange Calendar Provider Code is
 *   Andrea Bittau <a.bittau@cs.ucl.ac.uk>, University College London
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://exchangecalendar/ecFunctions.js");

Cu.import("resource://exchangecalendar/ecExchangeRequest.js");

var EXPORTED_SYMBOLS = ["erAutoDiscoverRequest"];

var nsAutodiscoverResponse = new Namespace("nsAutodiscoverResponse", "http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a");

function erAutoDiscoverRequest(aArgument, aCbOk, aCbError, aListener)
{
	this.mCbOk = aCbOk;
	this.mCbError = aCbError;
	this.mArgument = aArgument;

	var self = this;

	this.parent = new ExchangeRequest(aArgument, 
		function(aExchangeRequest, aResp) { self.onSendOk(aExchangeRequest, aResp);},
		function(aExchangeRequest, aCode, aMsg) { self.onSendError(aExchangeRequest, aCode, aMsg);},
		aListener);

	this.mailbox = aArgument.mailbox;

	this.isRunning = true;
	this.execute();
}

erAutoDiscoverRequest.prototype = {

	execute: function _execute()
	{
		// This autodiscover is of the type POX (http://msdn.microsoft.com/en-us/library/bb204189.aspx)
		// This is compatible with exchange 2007 and 2010. For 2010 we could also 
		// use SOAP (http://msdn.microsoft.com/en-us/library/dd877096%28v=EXCHG.140%29.aspx)

//		exchWebService.commonFunctions.LOG("sendAutodiscover\n");
		var email = this.mailbox;
                var parts = email.split("@");
                var domain = parts[1];
		exchWebService.commonFunctions.LOG("autodiscover email:"+email+", domain:"+domain+"\n");

		this.parent.urllist = [
			"https://" + domain + "/autodiscover/autodiscover.xml",
			"https://autodiscover." + domain + "/autodiscover/autodiscover.xml",
			"http://autodiscover." + domain + "/autodiscover/autodiscover.xml"
		];

		var req = exchWebService.commonFunctions.xmlToJxon('<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006"/>');
		var request = req.addChildTag("Request", null, null);
		request.addChildTag("EMailAddress", null, email);
		request.addChildTag("AcceptableResponseSchema", null, "http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a");

		exchWebService.commonFunctions.LOG("sendAutodiscover.execute:"+req.toString()+"\n");
 		this.parent.xml2jxon = true;
		this.parent.sendRequest(xml_tag + req.toString());

	},

	onSendOk: function _onSendOk(aExchangeRequest, aResp)
	{
		exchWebService.commonFunctions.LOG("sendAutodiscover.onSendOk:"+String(aResp));
		var DisplayName = "";
		var SMTPaddress = "";
		var ewsUrls = "";
		var aError = true;
		var aCode = -1;
		var aMsg = String(aResp);

		// Try to get the Displayname if it is available
		var tag = aResp.XPath("/a1:Autodiscover/a2:Response/a2:User/a2:DisplayName");
		if (tag.length > 0) {
			DisplayName = tag[0].value;
		}
		else {
			exchWebService.commonFunctions.LOG("autodiscoverOk but Displayname is not available.");
		}

		// Try to get the SMTP address if it is available
		var tag = aResp.XPath("/a1:Autodiscover/a2:Response/a2:User/a2:AutoDiscoverSMTPAddress");
		if (tag.length > 0) {
			SMTPaddress = tag[0].value;
		}
		else {
			exchWebService.commonFunctions.LOG("autodiscoverOk but AutoDiscoverSMTPAddress is not available.");
		}

		// Try to get the EWS urls if they are available
		ewsUrls = aResp.XPath("/a1:Autodiscover/a2:Response/a2:Account/a2:Protocol[a2:Type='WEB']/*/a2:Protocol/a2:ASUrl");
		if (ewsUrls.length > 0) {
			exchWebService.commonFunctions.LOG(" cc protocol type WEB:"+ewsUrls+".");
			aError = false;
		}
		else {
			ewsUrls = aResp.XPath("/a1:Autodiscover/a2:Response/a2:Account/a2:Protocol[a2:Type='EXCH']/a2:EwsUrl");
			if (ewsUrls.length > 0) {
				exchWebService.commonFunctions.LOG(" cc protocol type EXCH:"+ewsUrls+".");
				aError = false;
			}
			else {
				aMsg = "autodiscoverOk error getting ewsUrls from:"+this.parent.currentUrl;
				aCode = this.parent.ER_ERROR_AUTODISCOVER_GET_EWSULR;
				aError = true;
			}
		}
	
		if (aError) {
			this.onSendError(aExchangeRequest, aCode, aMsg);
		}
		else {
			if (this.mCbOk) {
				this.mCbOk(ewsUrls, DisplayName, SMTPaddress);
			}
		}
		this.isRunning = false;
	},

	onSendError: function _onSendError(aExchangeRequest, aCode, aMsg)
	{
		exchWebService.commonFunctions.LOG("sendAutodiscover.onSendError: aCode:"+aCode+", aMsg:"+aMsg);
		this.isRunning = false;
		if (this.mCbError) {
			this.mCbError(this, aCode, aMsg);
		}
	},
};


