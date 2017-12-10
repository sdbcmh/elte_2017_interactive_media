// Client ID and API key from the Developer Console
var CLIENT_ID = '906708430776-pk082cqcu4viu4h8be5g2dbvl3vi9cpq.apps.googleusercontent.com';
var API_KEY = 'AIzaSyDIZ6RLigSUJs8FPSXVKpiAylhyfpRDr3k';


// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/calendar";
var t = { OTHER: "2", PARTY: "3", EAT: "4", ASSIGNMENT: "5", CLASS: "6", WORK: "7", SLEEP: "10", FIXED: "11" };
var MAXDATE = new Date('2017-12-17T08:05:00+01:00');
var authorizeButton = document.getElementById('authorize-button');
var signoutButton = document.getElementById('signout-button');

var allEvents = [];
var freeTime = [];
var mandatoryEvents = [];
var notMandatoryEvents = [];
var googleEvents=[];
var totalEvents=[];
/**
*  On load, called to load the auth2 library and API client library.
*/
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
*  Initializes the API client library and sets up sign-in state
*  listeners.
*/
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
  });
}

/**
*  Called when the signed in status changes, to update the UI
*  appropriately. After a sign-in, the API is called.
*/
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    listUpcomingEvents();
  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
  }
}


/**
*  Sign in the user upon button click.
*/
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
*  Sign out the user upon button click.
*/
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

/**
* Append a pre element to the body containing the given message
* as its text node. Used to display the results of the API call.
*
* @param {string} message Text to be placed in pre element.
*/
function appendPre(message) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}

function appendDelete(message, id) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode('\t' + message + '\n');
  var htmlValue = document.createElement("button");
  htmlValue.textContent = "Delete";
  htmlValue.onclick = function () { deleteEventClick(id, summary) };
  pre.appendChild(htmlValue);
  pre.appendChild(textContent);
}
/**
* Print the summary and start datetime/date of the next ten events in
* the authorized user's calendar. If no events are found an
* appropriate message is printed.
*/
function listUpcomingEvents() {
  gapi.client.calendar.events.list({
    'calendarId': 'primary',
    'timeMin': (new Date()).toISOString(),
    'timeMax': MAXDATE.toISOString(),
    'showDeleted': false,
    'singleEvents': true,
    'maxResults': 30,
    'orderBy': 'startTime'
  }).then(function (response) {
    var events = response.result.items;
    allEvents = events;
    console.log(allEvents);
    appendPre('Upcoming events:');
    if (events.length > 0) {
      for (i = 0; i < events.length; i++) {
        var event = events[i];

        var start = event.start.dateTime;
        if (!start) {
          start = event.start.date;
        }
        appendDelete(event.summary + ' (' + start + ')' + '(' + event.end.dateTime + ')', event.id);
      }
      //handle overlaps, split mandatory and non mandatory events, find windows
      prepareData(events);
      //console.log(freeTime);
      //console.log(notMandatoryEvents);
      googleConvert(events);


    } else {
      appendPre('No upcoming events found.');
    }
  });
}

function prepareData(events) {
  var endDate = new Date(events[0].end.dateTime);
  var distance = 0;
  splitPriorities(events[0]);
  for (i = 1; i < events.length; i++) {
    splitPriorities(events[i]);

    distance = (new Date(events[i].start.dateTime) - endDate) / 1000 / 60;
    if (distance >= 30) {
      freeTime.push({
        'startHour': endDate,
        'endHour': new Date(events[i].start.dateTime),
        'value': (new Date(events[i].start.dateTime) - endDate) / 1000 / 60
      });
    }
    else if (distance < 0) {
      //add buttons to delete one of them using id's
      handleOverlap(events[i - 1], events[i]);
    }
    endDate = new Date(events[i].end.dateTime);
  }
  distance = (MAXDATE - new Date(events[events.length - 1].end.dateTime)) / 1000 / 60;
  if (distance >= 30) {
    freeTime.push({
      'startHour': new Date(events[events.length - 1].end.dateTime),
      'endHour': MAXDATE,
      'value': distance
    });
  }

}

function splitPriorities(event) {
  if (event.colorId) {
    if (event.colorId == t.OTHER || event.colorId == t.PARTY) {
      notMandatoryEvents.push(event);
    }
    else if (event.colorId == t.ASSIGNMENT) {
      mandatoryEvents.push(event);
    }
  }

}

function handleOverlap(event1, event2) {
  if (event1.colorId < event2.colorId) {
    //delete button with event1.eventId
    appendPre("Overlap between: " + event1.summary + " and " + event2.summary + ". We recommend to delete event: " + event1.summary);
  }
  else if (event1.colorId > event2.colorId) {
    //delete button with event2.eventId
    appendPre("Overlap between: " + event1.summary + " and " + event2.summary + ". We recommend to delete event: " + event2.summary);
  }
  else {
    appendPre("Overlap between: " + event1.summary + " and " + event2.summary + ". Events have equal priorities");
  }
}

function addEventClick(event) {
  console.log('click add');

  var request = gapi.client.calendar.events.insert({
    'calendarId': 'primary',
    'resource': event
  });

  request.execute(function (event) {
    appendPre('Event created: ' + event.summary); //+ " " + event.htmlLink);
	listUpcomingEvents();
  });
  $('#modalCreate').modal('hide');
}


function deleteEventClick(id, summary) {
  var request = gapi.client.calendar.events.delete({
    'calendarId': 'primary',
    'eventId': id
  });

  request.execute(function (event) {
    appendPre('Event : ' + summary + " was deleted");
	  listUpcomingEvents();
  })
}

Date.prototype.addHours = function (h) {
  this.setHours(this.getHours() + h);
  return this;
}

function haveOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return (firstStart < secondStart && secondEnd < firstEnd)
  || (secondStart < firstStart && firstEnd < secondEnd)
  || (secondStart < firstEnd && firstStart < secondEnd)
  || (firstStart < secondEnd && secondStart < firstEnd);
}

function deletePartially(start, end, overlapedEvent) {
  var overlapedStart = new Date(overlapedEvent.start.dateTime);
  var overlapedEnd = new Date(overlapedEvent.end.dateTime);
  if (start < overlapedStart && overlapedEnd < end) {
    //addEventClick(overlapedEvent);
  }
  else if (overlapedStart < start && end < overlapedEnd) {
    var event = generateEvent(overlapedEvent.summary,
      overlapedEvent.location,
      overlapedEvent.description,
      overlapedEvent.colorId,
      overlapedStart.toISOString(),
      start.toISOString());
      addEventClick(event);

      var event = generateEvent(overlapedEvent.summary,
        overlapedEvent.location,
        overlapedEvent.description,
        overlapedEvent.colorId,
        end.toISOString(),
        overlapedEnd.toISOString());
        addEventClick(event);
      }
      else if (start < overlapedEnd && overlapedEnd < end) {
        var event = generateEvent(overlapedEvent.summary,
          overlapedEvent.location,
          overlapedEvent.description,
          overlapedEvent.colorId,
          overlapedStart.toISOString(),
          start.toISOString());
          //console.log(event);
          addEventClick(event);
        }
        else if (overlapedStart < end && end < overlapedEnd) {
          var event = generateEvent(overlapedEvent.summary,
            overlapedEvent.location,
            overlapedEvent.description,
            overlapedEvent.colorId,
            end.toISOString(),
            overlapedEnd.toISOString());
            //console.log(event);
            addEventClick(event);
          }
          deleteEventClick(overlapedEvent.id, overlapedEvent.summary);
        }

        function reasign(startAfter, overlapedEvent) {
          var index = mandatoryEvents.indexOf(overlapedEvent);
          //console.log(index);
          if(index>=0){
            mandatoryEvents.splice(index,1);
          }
          deleteEventClick(overlapedEvent.id, overlapedEvent.summary);
          //console.log(overlapedEvent);
          //console.log(freeTime);
          //console.log(mandatoryEvents);
          //console.log(notMandatoryEvents);
          var deadline = new Date(overlapedEvent.description.split('|')[0]);
          //console.log(deadline);
          var hours = (new Date(overlapedEvent.end.dateTime) - new Date(overlapedEvent.start.dateTime)) / 1000 / 60;
          //console.log(hours);
          var freeUntilDeadline = [];
          for (let i = 0; i < freeTime.length; i++) {
            const element = freeTime[i];
            if (element.endHour < deadline) {
              freeUntilDeadline.push(element);
            }
          }
          //console.log("freeUntilDeadline");
          //console.log(freeUntilDeadline);
          for (let i = 0; i < freeUntilDeadline.length; i++) {
            const element = freeUntilDeadline[i];
            if (element.value < hours && hours != 0) {
              var event = generateEvent(overlapedEvent.summary,
                overlapedEvent.location,
                overlapedEvent.description,
                overlapedEvent.colorId,
                element.startHour.toISOString(),
                element.endHour.toISOString());
                addEventClick(event);
                hours = hours - element.value;
                //console.log('comparison');
                freeTime.splice(i,1);
                //console.log(freeTime);
              }
              else if (element.value >= hours && hours != 0) {
                var event = generateEvent(overlapedEvent.summary,
                  overlapedEvent.location,
                  overlapedEvent.description,
                  overlapedEvent.colorId,
                  element.startHour.toISOString(),
                  element.startHour.addHours(hours / 60).toISOString());
                  addEventClick(event);
                  hours = 0;
                  //delete from free time
                  freeTime.splice(i,1);
                  //console.log(freeTime);
                  break;
                }
                else {
                  break;
                }
              }
              //console.log(hours);
              if (hours > 0) {
                var notMandatory = [];
                for (let i = 0; i < notMandatoryEvents.length; i++) {
                  const element = notMandatoryEvents[i];
                  if (new Date(element.end.dateTime) < deadline)
                  notMandatory.push(element);
                }
                //console.log(notMandatory);
                for (let i = 0; i < notMandatory.length; i++) {
                  const element = notMandatory[i];
                  var value = (new Date(element.end.dateTime) - new Date(element.start.dateTime)) / 1000 / 60;
                  //console.log(value);

                  if (hours > value && hours != 0) {
                    deleteEventClick(element.id, element.summary);
                    var event = generateEvent(overlapedEvent.summary,
                      overlapedEvent.location,
                      overlapedEvent.description,
                      overlapedEvent.colorId,
                      element.start.dateTime,
                      element.end.dateTime);
                      addEventClick(event);
                      //console.log(event);
                      hours = hours - value;
                      notMandatoryEvents.splice(i,1);
                    }
                    else if (hours <= value && hours != 0) {
                      deleteEventClick(element.id, element.summary);
                      var event = generateEvent(overlapedEvent.summary,
                        overlapedEvent.location,
                        overlapedEvent.description,
                        overlapedEvent.colorId,
                        element.start.dateTime,
                        (new Date(element.start.dateTime)).addHours(hours / 60).toISOString());
                        //console.log(event);
                        addEventClick(event);
                        notMandatoryEvents.splice(i,1);
                        hours = 0;
                        break;
                      }
                      else {
                        break;
                      }
                    }
                  }

                  //console.log(hours);
                  if (hours > 0) {
                    var reasignable = [];
                    for (let i = 0; i < mandatoryEvents.length; i++) {
                      const element = mandatoryEvents[i];
                      if (new Date(element.description.split('|')[0]) > deadline) {
                        reasignable.push(element);
                      }
                    }
                    //console.log(reasignable);
                    for (let i = 0; i < reasignable.length; i++) {
                      const element = reasignable[i];
                      var value = (new Date(element.end.dateTime) - new Date(element.start.dateTime)) / 1000 / 60;
                      //console.log(value);
                      if (hours > value && hours != 0) {
                        deleteEventClick(element.id, element.summary);
                        var event = generateEvent(overlapedEvent.summary,
                          overlapedEvent.location,
                          overlapedEvent.description,
                          overlapedEvent.colorId,
                          element.start.dateTime,
                          element.end.dateTime);
                          addEventClick(event);
                          //console.log(event);
                          hours = hours - value;
                          mandatoryEvents.splice(i,1);
                          reasign(deadline, element);
                        }
                        else if (hours <= value && hours != 0) {
                          deleteEventClick(element.id, element.summary);
                          var event = generateEvent(overlapedEvent.summary,
                            overlapedEvent.location,
                            overlapedEvent.description,
                            overlapedEvent.colorId,
                            element.start.dateTime,
                            (new Date(element.start.dateTime)).addHours(hours / 60).toISOString());
                            //console.log(event);
                            addEventClick(event);
                            hours = 0;
                            mandatoryEvents.splice(i,1);
                            reasign(deadline, element);
                            break;
                          }
                          else {
                            break;
                          }
                        }
                      }

                      if (hours > 0) {
                        appendPre(hours + " minutes from event : " + overlapedEvent.summary + " cannot be reasigned automatically.");
                      }
                    }

                    function submitForm() {
                      // data from forms
                      var summary = document.getElementById("summary").value;
                      var location = document.getElementById("location").value;
                      var description = document.getElementById("description").value;
                      var type = document.getElementById("type").value;
                      var reminder = document.getElementById("reminder").value;
                      var start = document.getElementById("start").value;
                      var end = document.getElementById("end").value;
                      var hours = document.getElementById("hours").value;
                      var deadline = document.getElementById("deadline").value;

                      //select method of adding depending on type
                      var startTime = new Date(start).toISOString();
                      var endTime = new Date(end).toISOString();

                      var cannotBeAdded = true;
                      switch (type) {
                        case t.FIXED: {
                          var overlaps = [];
                          cannotBeAdded = false;
                          for (let i = 0; i < allEvents.length; i++) {
                            if (haveOverlap(new Date(allEvents[i].start.dateTime), new Date(allEvents[i].end.dateTime)
                            , new Date(startTime), new Date(endTime))) {
                              if (allEvents[i].colorId === t.FIXED) {
                                appendPre('Cannot be added because there is already a fixed event on this interval : ' + allEvents[i].summary);
                                cannotBeAdded = true;
                                break;
                              }
                              overlaps.push(allEvents[i]);
                            }
                          };

                          if (overlaps.length > 0) {
                            for (let i = 0; i < overlaps.length; i++) {
                              if (overlaps[i].colorId === t.EAT || overlaps[i].colorId === t.OTHER || overlaps.PARTY) {
                                deleteEventClick(overlaps[i].eventId, overlaps[i].summary);
                              }
                              else if (overlaps[i].colorId === t.CLASS || overlaps[i].colorId === t.WORK || overlaps[i].colorId === t.SLEEP) {
                                //delete partially
                                deletePartially(new Date(startTime), new Date(endTime), overlaps[i]);
                              }
                              else if (overlaps[i].colorId === t.ASSIGNMENT){
                                reasign(end, overlaps[i]);
                              }
                            }
                          }
                          break;
                        }
                        case t.ASSIGNMENT: {
                          var time = new Date();
                          reasign(time, generateEvent(summary, location, deadline + '|' + description, type, time.toISOString(), time.addHours(parseInt(hours)).toISOString()));
                          break;
                        }
                        case t.OTHER: {
                          for (i = 0; i < freeTime.length; i++) {
                            if (freeTime[i].endHour <= new Date(deadline) && parseInt(hours) * 60 <= freeTime[i].value) {
                              startTime = new Date(freeTime[i].startHour).toISOString();
                              endTime = (freeTime[i].startHour.addHours(parseInt(hours))).toISOString();
                              description = deadline + '|' + description;
                              cannotBeAdded = false;
                              break;
                            }
                          }
                          break;
                        }
                        case t.PARTY: {
                          for (let i = 0; i < freeTime.length; i++) {
                            const element = freeTime[i];
                            if (element.startHour <= new Date(startTime) && new Date(endTime) <= element.endHour) {
                              cannotBeAdded = false;
                              break;
                            }
                          }
                          if (cannotBeAdded) {
                            var overlaps = [];
                            for (let i = 0; i < allEvents.length; i++) {
                              const element = allEvents[i];
                              if (haveOverlap(new Date(element.start.dateTime), new Date(element.end.dateTime), new Date(startTime), new Date(endTime))) {
                                console.log(element.summary);
                                if (element.colorId === t.OTHER) {
                                  overlaps.push(element);
                                  cannotBeAdded = false;
                                }
                                else {
                                  cannotBeAdded = true;
                                  break;
                                }
                              }
                            }
                            if (cannotBeAdded == false) {
                              for (let i = 0; i < overlaps.length; i++) {
                                const element = overlaps[i];
                                deleteEventClick(element.id, element.summary);
                              }
                            }
                          }
                          break;
                        }
                        default: {
                          cannotBeAdded = false;
                          break;
                        }
                      }
                      generateEvent(summary, location, description, type, startTime, endTime);


                      if (!cannotBeAdded) {
                        addEventClick(event);
                      }
                      else {
                        appendPre("Event : " + summary + " cannot be added");
                      }
                      //addEventClick(seed[0]);
                    }

                    function selectRecurrence(type) {
                      if (type === t.CLASS ||
                        type === t.WORK ||
                        type === t.SLEEP ||
                        type === t.EAT) {
                          return 'FREQ=WEEKLY;COUNT=0';
                        }
                        else {
                          return 'FREQ=DAILY;COUNT=1';
                        }
                      }

                      function generateEvent(summary, location, description, type, startTime, endTime) {
                        return event = {
                          'summary': summary,
                          'location': location,
                          'description': description,
                          'colorId': type,
                          'start': {
                            'dateTime': startTime,
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': endTime,
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'     //+ selectRecurrence(type)
                          ]
                        };
                      }

                      function seed() {
                        //seed with events
                        for (let i = 0; i < Seed.length; i++) {
                          addEventClick(Seed[i]);
                        }
                      }

                      function deleteAll() {
                        for (let i = 0; i < allEvents.length; i++) {
                          const element = allEvents[i];
                          deleteEventClick(element.id, element.summary);
                        }
                      }
                      var Seed = [
                        {
                          'summary': 'Assignment',
                          'location': 'location',
                          'description': '2017-12-07T08:00:00+01:00|description',
                          'colorId': t.ASSIGNMENT,
                          'start': {
                            'dateTime': new Date('2017-12-06T08:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-06T15:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Cooking',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.EAT,
                          'start': {
                            'dateTime': new Date('2017-12-06T15:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-06T18:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Assignment second',
                          'location': 'location',
                          'description': '2017-12-08T20:00:00+01:00|description',
                          'colorId': t.ASSIGNMENT,
                          'start': {
                            'dateTime': new Date('2017-12-06T20:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-06T22:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Party',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.PARTY,
                          'start': {
                            'dateTime': new Date('2017-12-06T22:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-07T00:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Sleep',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.SLEEP,
                          'start': {
                            'dateTime': new Date('2017-12-07T00:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-07T08:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Classes',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.CLASS,
                          'start': {
                            'dateTime': new Date('2017-12-07T10:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-07T14:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Cooking ',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.EAT,
                          'start': {
                            'dateTime': new Date('2017-12-07T15:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-07T16:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Work',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.WORK,
                          'start': {
                            'dateTime': new Date('2017-12-07T17:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-07T22:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                        {
                          'summary': 'Sleep',
                          'location': 'location',
                          'description': 'description',
                          'colorId': t.SLEEP,
                          'start': {
                            'dateTime': new Date('2017-12-08T00:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'end': {
                            'dateTime': new Date('2017-12-08T08:00:00+01:00').toISOString(),
                            'timeZone': 'Europe/Budapest'
                          },
                          'recurrence': [
                            'RRULE:FREQ=DAILY;COUNT=1'
                          ]
                        },
                      ];

                      var eventsfb = [];



                      window.fbAsyncInit = function() {
                        FB.init({
                          appId            : '876969792383940',
                          autoLogAppEvents : true,
                          xfbml            : true,
                          version          : 'v2.11'
                        });

                        FB.getLoginStatus(function(response) {


                          if (response.status === 'connected') {
                            document.getElementById('loginBtn').style.display='none';
                            FB.api('me?fields=events', function(response) {
                              for ( x in response.events.data) {

                                eventsfb.push({

                                  title: response.events.data[x]['name'],
                                  start: response.events.data[x]['start_time']
								  
                                });

                              }
                              drawcalendar();
                            });
                          }
                        });
                      };
                      (function(d, s, id){
                        var js, fjs = d.getElementsByTagName(s)[0];
                        if (d.getElementById(id)) {return;}
                        js = d.createElement(s); js.id = id;
                        js.src = "https://connect.facebook.net/en_US/sdk.js";
                        fjs.parentNode.insertBefore(js, fjs);
                      }(document, 'script', 'facebook-jssdk'));

                      function googleConvert(arrayEvents){
						
						$('#fullcal').fullCalendar( 'removeEvents' );
						var googleEvents=[];
						
                        for (x in arrayEvents){
                          googleEvents.push({
                            title: arrayEvents[x]['summary'],
                            start: arrayEvents[x]['start']['dateTime'],
                            color: 'red'
                          });
                        }
                        $('#fullcal').fullCalendar( 'addEventSource', googleEvents );
                        $('#fullcal').fullCalendar( 'addEventSource', eventsfb );
                      }


                      function drawcalendar(){
                        totalEvents = eventsfb.concat(googleEvents);
                        $('#fullcal').fullCalendar({
                          header:{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'month,agendaWeek,agendaDay'
                          },

                          defaultView:'month',
                          editable:true,
                          events: totalEvents,
                          eventClick: function(event, element) {

                            event.title = "CLICKED!";
                            console.log('addsdd');
                            $('#fullcal').fullCalendar('updateEvent', event);
                          }

                        });

                      }

                      //# sourceMappingURL=app.js.map
