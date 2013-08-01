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
var Ci = Components.interfaces;
var Cc = Components.classes;

//Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://exchangecalendar/ecFunctions.js");
Cu.import("resource://calendar/modules/calUtils.jsm");

if (!exchWebService) var exchWebService = {};

exchWebService.eventDialog = {

    _initialized: false,
    onLoad: function _onLoad() {
        if (this._initialized) return;

        exchWebService.commonFunctions.LOG(" !! exchWebService.eventDialog.onLoad 1");
        // document.getElementById("event-grid-attendee-row").setAttribute("collapsed" , true);
        exchWebService.eventDialog.updateAttendees();
        if (document.getElementById("todo-entrydate")) {
            this._initialized = true;
            // nuke the onload, or we get called every time there's
            // any load that occurs
            exchWebService.commonFunctions.LOG(" !! exchWebService.eventDialog.onLoad 1a");
            window.removeEventListener("load", exchWebService.eventDialog.onLoad, false);

            var args = window.arguments[0];
            var item = args.calendarEvent;
            if ((!cal.isEvent(item)) && (item.calendar.type == "exchangecalendar")) {

                exchWebService.commonFunctions.LOG(" !! exchWebService.eventDialog.onLoad 2");
                var tmpDatePicker = document.createElement("datepicker");
                tmpDatePicker.setAttribute("type", "popup");
                tmpDatePicker.setAttribute("id", "todo-entrydate");
                tmpDatePicker.setAttribute("value", document.getElementById("todo-entrydate").value);
                //tmpDatePicker.setAttribute("onchange","dateTimeControls2State(true);exchWebService.eventDialog.updateTime();");
                tmpDatePicker.addEventListener("change", exchWebService.eventDialog.updateTime, false);
                if (!document.getElementById("todo-has-entrydate").checked) {
                    tmpDatePicker.setAttribute("disabled", "true");
                }
                document.getElementById("event-grid-startdate-picker-box").replaceChild(tmpDatePicker, document.getElementById("todo-entrydate"));

                exchWebService.commonFunctions.LOG(" !! exchWebService.eventDialog.onLoad 3");
                var tmpDatePicker = document.createElement("datepicker");
                tmpDatePicker.setAttribute("type", "popup");
                tmpDatePicker.setAttribute("id", "todo-duedate");
                tmpDatePicker.setAttribute("value", document.getElementById("todo-duedate").value);
                //tmpDatePicker.setAttribute("onchange","dateTimeControls2State(false);exchWebService.eventDialog.updateTime();");
                tmpDatePicker.addEventListener("change", exchWebService.eventDialog.updateTime, false);
                if (!document.getElementById("todo-has-duedate").checked) {
                    tmpDatePicker.setAttribute("disabled", "true");
                }
                document.getElementById("event-grid-enddate-picker-box").replaceChild(tmpDatePicker, document.getElementById("todo-duedate"));
                exchWebService.commonFunctions.LOG(" !! exchWebService.eventDialog.onLoad 4");

                document.getElementById("link-image-top").hidden = true;
                document.getElementById("link-image-bottom").hidden = true;
                document.getElementById("keepduration-button").hidden = true;
                document.getElementById("timezone-starttime").hidden = true;
                document.getElementById("timezone-endtime").hidden = true;

                if (document.getElementById("item-repeat")) {
                    document.getElementById("item-repeat").addEventListener("command", exchWebService.eventDialog.updateRepeat, false);
                }
                exchWebService.eventDialog.updateTime();
                exchWebService.eventDialog.updateRepeat();
            }
        }
        exchWebService.commonFunctions.LOG(" !! exchWebService.eventDialog.onLoad 5");
    },

    updateTime: function _updateTime() {
        exchWebService.commonFunctions.LOG(" ===++ calendar-event-dialog.js");
        if (document.getElementById("todo-entrydate").dateValue) {
            document.getElementById("todo-entrydate").dateValue.setHours(12);
        }
        if (document.getElementById("todo-duedate").dateValue) {
            document.getElementById("todo-duedate").dateValue.setHours(13);
        }
    },

    // This will remove the time value from the repeat part and tooltip.
    updateRepeat: function _updateRepeat() {
        var repeatDetails = document.getElementById("repeat-details").childNodes;
        if (repeatDetails.length == 3) {
            document.getElementById("repeat-details").removeChild(repeatDetails[2]);
            var toolTip = repeatDetails[0].getAttribute("tooltiptext");
            var tmpArray = toolTip.split("\n");
            tmpArray.splice(2, 1);
            repeatDetails[0].setAttribute("tooltiptext", tmpArray.join("\n"));
            repeatDetails[1].setAttribute("tooltiptext", tmpArray.join("\n"));
        }
    },

    updateAttendees: function _updateAttendees() {
        let attendeeRow = document.getElementById("event-grid-attendee-row");
        attendeeRow.setAttribute('collapsed', 'true');
        let attendeeRow2 = document.getElementById("event-grid-attendee-row-2");
        let optAttendeeRow = document.getElementById("event-grid-attendee-row-4");
        let reqAttendeeRow = document.getElementById("event-grid-attendee-row-3");
        if (window.attendees && window.attendees.length > 0) {
            if (isEvent(window.calendarItem)) { // sending email invitations currently only supported for events
                attendeeRow2.removeAttribute('collapsed');
            } else {
                attendeeRow2.setAttribute('collapsed', 'true');
            }

            let attendeeNames = [];
            let attendeeEmails = [];
            let reqAttendeeNames = [];
            let reqAttendeeEmails = [];
            let optAttendeeNames = [];
            let optAttendeeEmails = [];
            let numAttendees = window.attendees.length;
            let emailRE = new RegExp("^mailto:(.*)", "i");
            for (let i = 0; i < numAttendees; i++) {
                let attendee = window.attendees[i];
                let name = attendee.commonName;
                if (attendee.role == "OPT-PARTICIPANT") {
                    if (name && name.length) {
                        optAttendeeNames.push(name);
                        let email = attendee.id;
                        if (email && email.length) {
                            if (emailRE.test(email)) {
                                name += ' <' + RegExp.$1 + '>';
                            } else {
                                name += ' <' + email + '>';
                            }
                            optAttendeeEmails.push(name);
                        }
                    } else if (attendee.id && attendee.id.length) {
                        let email = attendee.id;
                        if (emailRE.test(email)) {
                            optAttendeeNames.push(RegExp.$1);
                        } else {
                            optAttendeeNames.push(email);
                        }
                    } else {
                        continue;
                    }

                } else {

                    if (name && name.length) {
                        reqAttendeeNames.push(name);
                        let email = attendee.id;
                        if (email && email.length) {
                            if (emailRE.test(email)) {
                                name += ' <' + RegExp.$1 + '>';
                            } else {
                                name += ' <' + email + '>';
                            }
                            reqAttendeeEmails.push(name);
                        }
                    } else if (attendee.id && attendee.id.length) {
                        let email = attendee.id;
                        if (emailRE.test(email)) {
                            reqAttendeeNames.push(RegExp.$1);
                        } else {
                            reqAttendeeNames.push(email);
                        }
                    } else {
                        continue;
                    }

                }
            }
            if (reqAttendeeNames.length > 0) {
                reqAttendeeRow.removeAttribute('collapsed');
            } else {
                reqAttendeeRow.setAttribute('collapsed', 'true');
            }
            if (optAttendeeNames.length > 0) {
                optAttendeeRow.removeAttribute('collapsed');
            } else {
                optAttendeeRow.setAttribute('collapsed', 'true');
            }

            let attendeeList = document.getElementById("attendee-list");
            let reqAttendeeList = document.getElementById("req-attendee-list-3");
            let optAttendeeList = document.getElementById("opt-attendee-list-4");

            let callback = function func() {
                reqAttendeeList.setAttribute('value', reqAttendeeNames.join(', '));
                reqAttendeeList.setAttribute('tooltiptext', reqAttendeeEmails.join(', '));
                optAttendeeList.setAttribute('value', optAttendeeNames.join(', '));
                optAttendeeList.setAttribute('tooltiptext', optAttendeeEmails.join(', '));
            };
            setTimeout(callback, 1);
        } else {

            attendeeRow2.setAttribute('collapsed', 'true');
            optAttendeeRow.setAttribute('collapsed', 'true');
            reqAttendeeRow.setAttribute('collapsed', 'true');
        }
    },

    editAttendees: function _editAttendees() {
        let savedWindow = window;
        let calendar = getCurrentCalendar();

        var callback = function (attendees, organizer, startTime, endTime) {
            savedWindow.attendees = attendees;
            if (organizer) {
                // In case we didn't have an organizer object before we
                // added attendees to our event we take the one created
                // by the 'invite attendee'-dialog.
                if (savedWindow.organizer) {
                    // The other case is that we already had an organizer object
                    // before we went throught the 'invite attendee'-dialog. In that
                    // case make sure we don't carry over attributes that have been
                    // set to their default values by the dialog but don't actually
                    // exist in the original organizer object.
                    if (!savedWindow.organizer.id) {
                        organizer.id = null;
                    }
                    if (!savedWindow.organizer.role) {
                        organizer.role = null;
                    }
                    if (!savedWindow.organizer.participationStatus) {
                        organizer.participationStatus = null;
                    }
                    if (!savedWindow.organizer.commonName) {
                        organizer.commonName = null;
                    }
                }
                savedWindow.organizer = organizer;
            }
            var duration = endTime.subtractDate(startTime);
            startTime = startTime.clone();
            endTime = endTime.clone();
            var kDefaultTimezone = calendarDefaultTimezone();
            gStartTimezone = startTime.timezone;
            gEndTimezone = endTime.timezone;
            gStartTime = startTime.getInTimezone(kDefaultTimezone);
            gEndTime = endTime.getInTimezone(kDefaultTimezone);
            gItemDuration = duration;
            exchWebService.eventDialog.updateAttendees();
            updateDateTime();
            updateAllDay();
            if (isAllDay != gStartTime.isDate) {
                setShowTimeAs(gStartTime.isDate)
            }
        };

        var startTime = gStartTime.getInTimezone(gStartTimezone);
        var endTime = gEndTime.getInTimezone(gEndTimezone);

        var isAllDay = getElementValue("event-all-day", "checked");
        if (isAllDay) {
            startTime.isDate = true;
            endTime.isDate = true;
            endTime.day += 1;
        } else {
            startTime.isDate = false;
            endTime.isDate = false;
        }

        var menuItem = document.getElementById('options-timezone-menuitem');
        var displayTimezone = menuItem.getAttribute('checked') == 'true';

        var args = new Object();
        args.startTime = startTime;
        args.endTime = endTime;
        args.displayTimezone = displayTimezone;
        args.attendees = window.attendees;
        args.organizer = window.organizer && window.organizer.clone();
        args.calendar = calendar;
        args.item = window.calendarItem;
        args.onOk = callback;
        args.fbWrapper = window.fbWrapper;

        // open the dialog modally
        openDialog(
            "chrome://calendar/content/calendar-event-dialog-attendees.xul",
            "_blank",
            "chrome,titlebar,modal,resizable",
            args);
    }
}

window.addEventListener("load", exchWebService.eventDialog.onLoad, false);

