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
 * Author: Deepak Kumar
 * email: deepk2u@gmail.com
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

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

Cu.import("resource://exchangecalendar/ecFunctions.js");
Cu.import("resource://exchangecalendar/ecExchangeRequest.js");
Cu.import("resource://exchangecalendar/erForewardItem.js");


if (! exchWebService) var exchWebService = {};


exchWebService.forewardEvent2 = {
	showOptionalAttendees: function _showOptionalAttendees()
	{
		var args = window.arguments[0];
	        var item = args.calendarEvent;
		var attendees = item.getAttendees({});
                var optionalAttendeeList = new Array();
		var requiredAttendeeList = new Array();
                for each (var attendee in attendees) {
			if(attendee.role == "OPT-PARTICIPANT")
			{			
				optionalAttendeeList.push(attendee);
			}
			else 
			{
				requiredAttendeeList.push(attendee); 
			}      
                }

		
		
		if(requiredAttendeeList && requiredAttendeeList.length){
			document.getElementById("required-attendee-spacer").removeAttribute("hidden");  
			document.getElementById("item-required-attendee-listbox").removeAttribute("hidden");  			
			document.getElementById("item-required-attendee").removeAttribute("hidden");   
			exchWebService.forewardEvent2.displayAttendees(requiredAttendeeList, "item-required-attendee-listbox"); 
		}

                if(optionalAttendeeList && optionalAttendeeList.length){ 
			document.getElementById("item-optional-attendee").removeAttribute("hidden");
			document.getElementById("optional-attendee-spacer").removeAttribute("hidden");  
			document.getElementById("optional-attendee-caption").removeAttribute("hidden");                 	
			exchWebService.forewardEvent2.displayAttendees(optionalAttendeeList, "item-optional-attendee-listbox");
		}

		// hide existing attendees box
		var item_attendees_box = document.getElementById("item-attendees");
		
		var children = item_attendees_box.children;
		children[0].setAttribute("hidden", true);
		children[1].setAttribute("hidden", true);
		children[2].setAttribute("hidden", true);
		children[3].setAttribute("hidden", true);
                
  	},

	displayAttendees: function _displayAttendees(attendees, listBox)
	{		
         		var listbox = document.getElementById(listBox);
			var itemNode = listbox.getElementsByTagName("listitem")[0];
         		var num_items = Math.ceil(attendees.length/2)-1;
         		while (num_items--) {
             			var newNode = itemNode.cloneNode(true);
             			listbox.appendChild(newNode);
         		}
         		var list = listbox.getElementsByTagName("listitem");
         		var page = 0;
         		var line = 0;
         		for each (var attendee in attendees) {
					var itemNode = list[line];
             				var listcell = itemNode.getElementsByTagName("listcell")[page];
             				if (attendee.commonName && attendee.commonName.length) {
                 				listcell.setAttribute("label", attendee.commonName);
             				} else {
                 				listcell.setAttribute("label",  attendee.toString());
             				}
             				listcell.setAttribute("tooltiptext", attendee.toString());
             				listcell.setAttribute("status", attendee.participationStatus);
             				listcell.removeAttribute("hidden");

	             			page++;
	             			if (page > 1) {
               				page = 0;
               				line++;
					}
				
             		} //end of for
         	
	},
	onForward : function _onForward()
	{	
		var args = window.arguments[0];
		var item = args.calendarEvent;
		item =item.clone();
		var calendar = item.calendar;
		var args = new Object();
		args.startTime = item.startDate;
		args.endTime = item.endDate;
		args.organizer = item.organizer;
		args.item = item;
		args.attendees =item.organizer;
		args.calendar =calendar;
		args.onOk = exchWebService.forewardEvent2.callOnOk;
		args.opener="exchWebService-onForward";
		window.openDialog("chrome://calendar/content/calendar-event-dialog-attendees.xul","_blank", "chrome,titlebar,modal,resizable",args);
		
	},	
	
	callOnOk : function(attendee,organizer,startTime,endTime){
		
		var args = window.arguments[0];
		var item = args.calendarEvent;
		var calendar = item.calendar;
		var calId = calendar.id;
		var calPrefs = Cc["@mozilla.org/preferences-service;1"]
		            .getService(Ci.nsIPrefService)
			    .getBranch("extensions.exchangecalendar@extensions.1st-setup.nl."+calId+".");
		
		var tmpObject = new erForewardItemRequest(
			{user: exchWebService.commonFunctions.safeGetCharPref(calPrefs, "ecDomain")+"\\"+exchWebService.commonFunctions.safeGetCharPref(calPrefs, "ecUser"), 
			mailbox: exchWebService.commonFunctions.safeGetCharPref(calPrefs, "ecMailbox"),
			serverUrl: exchWebService.commonFunctions.safeGetCharPref(calPrefs, "ecServer"), item: item, attendees: attendee, 
			changeKey :  item.changeKey, description : item.getProperty("description")}, 					
			exchWebService.forewardEvent2.erForewardItemRequestOK, exchWebService.forewardEvent2.erForewardItemRequestError);		
	},

	erForewardItemRequestOK : function _erForewardItemRequestOK(aForewardItemRequest, aResp)
	{
		alert(aResp);
	},

	erForewardItemRequestError: function _erForewardItemRequestError(aForewardItemRequest, aCode, aMsg)
	{
		alert(aCode+":"+aMsg);
	},

	onLoad: function _onLoad()
	{
		exchWebService.forewardEvent2.showOptionalAttendees();
		if (document.getElementById("calendar-event-summary-dialog")) {
			window.removeEventListener("load", exchWebService.forewardEvent2.onLoad, false);
			var args = window.arguments[0];
			var item = args.calendarEvent;
			var calendar = item.calendar;
			var tmpButtons = document.getElementById("calendar-event-summary-dialog").getAttribute("buttons");
			if (calendar.getProperty("exchWebService.offlineOrNotConnected")) {
				var tmpArray = tmpButtons.split(",");
				var newArray = [];
				for (var index in tmpArray) {
					if (tmpArray[index] != "extra1") {
						newArray.push(tmpArray[index]);
					}
				}
				document.getElementById("calendar-event-summary-dialog").buttons = newArray.join(",");
			}
			else {
				if ((item.calendar.type == "exchangecalendar") && (item.responseObjects) && (item.responseObjects.ForwardItem)) {
					document.getElementById("calendar-event-summary-dialog").buttons += ",extra1";
				}
			}
		}
	},
}

window.addEventListener("load", exchWebService.forewardEvent2.onLoad, false);

