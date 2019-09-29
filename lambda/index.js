'use strict';
const Alexa = require('ask-sdk-core');
const dataHelper = require('./menuDataHelper');
const miscHelpers = require('./miscHelpers');
const HELP_MESSAGE = 'Du kannst mich zum Beispiel fragen: Was gibt es heute zu essen? Welche Allergene befinden sich in Menü 1 von heute? Wie lauten die Öffnungszeiten?';
const STOP_MESSAGE = 'Mahlzeit!';
const LAUNCH_MESSAGE = 'Mahlzeit! Frag mich was es heute zu essen gibt!';
const ERROR_MESSAGE = "Tut mir leid das habe ich leider nicht verstanden. Frag mich nocheinmal!";


// 1. Handlers ===================================================================================
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = LAUNCH_MESSAGE;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .withShouldEndSession(false)
            .getResponse();
    }
};

/**
 * Speaks out the opening hours for the mensa in kapfenberg
 */
const OpeningHoursIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'OpeningHoursIntent';
    },
    handle(handlerInput) {
        //get the sessionattribute for demo data
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let demoData = sessionAttributes['demo'];
        if (sessionAttributes['demo'] === undefined) {
            demoData = false;
        }

        return new Promise((resolve) => {
            getMenuData((data) => {
                let speechOutput = '';

                if (data.openingHours === '') {
                    speechOutput = `Öffnungszeiten nicht verfügbar! Weitere Infos dazu auf www.mensen.at`;
                } else {
                    speechOutput = `Die Menü Essenszeiten sind ${data.openingHours}`;
                }
                resolve(handlerInput.responseBuilder.speak(speechOutput).getResponse());
            }, demoData);
        });
    }
};

/**
 * Speaks out the menus of today, tomorrow, day after tomorrow  or a specific weekday
 */
const BasicMenuOverviewIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'BasicMenuOverviewIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const slotValues = miscHelpers.getSlotValues(request.intent.slots);

        //get the sessionattribute for demo data
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let demoData = sessionAttributes['demo'];
        if (sessionAttributes['demo'] === undefined) {
            demoData = false;
        }

        //console.log('***** slotValues: ' + JSON.stringify(slotValues, null, 2));
        return new Promise((resolve) => {
            getMenuData((data) => {
                let speechOutput = "none";
                let currentDay = weekDays[getCurrentDay()];
                let askedDay = '';
                let dayprefix = '';

                if (slotValues.weekday.heardAs === undefined) {
                    dayprefix = 'heute';
                    askedDay = currentDay;
                } else {
                    dayprefix = getDayPrefixFromHeardAsDay(slotValues.weekday.heardAs);
                    askedDay = getAskedDay(slotValues.weekday.heardAs)
                }

                if (data[askedDay] === undefined) {
                    speechOutput = `${getFullDayNameFromString(askedDay)} gibt es keine Menüs! Weitere Infos dazu auf www.mensen.at`;
                } else {
                    speechOutput = `${dayprefix} gibt es folgende Menüs: ${data[askedDay].menuOne.title} ${checkMenuVegOrVegan(data[askedDay].menuOne)} : ${data[askedDay].menuOne.food} <break time="0.3s"/>
                     ${data[askedDay].menuTwo.title} ${checkMenuVegOrVegan(data[askedDay].menuTwo)} : ${data[askedDay].menuTwo.food} <break time="0.3s"/>
                     ${data[askedDay].menuThree.title} ${checkMenuVegOrVegan(data[askedDay].menuThree)}: ${data[askedDay].menuThree.food} <break time="0.3s"/> `
                }
                resolve(handlerInput.responseBuilder.speak(speechOutput).getResponse());
            }, demoData);
        });
    }
};

/**
 * Speaks out the allergene Info for a specific menu or all menus
 */
const AllergenInfoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AllergenInfoIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const slotValues = miscHelpers.getSlotValues(request.intent.slots);
        let reprompt = false;

        //get the sessionattribute for demo data
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let demoData = sessionAttributes['demo'];
        if (sessionAttributes['demo'] === undefined) {
            demoData = false;
        }

        return new Promise((resolve) => {
            getMenuData((data) => {
                let speechOutput = ERROR_MESSAGE;
                let currentDay = weekDays[getCurrentDay()];
                let askedDay = '';
                let dayprefix = '';
                let menuNumber = 0;

                if (slotValues.number.heardAs === undefined) {
                    console.log("No menunumber selected!");
                    speechOutput = ('Kein Menü angegeben. Bitte frage mich nocheinmal nach den Allergenen in  Menü 1, 2 oder 3.');
                    reprompt = true;
                } else {
                    if (slotValues.weekday.heardAs === undefined) {
                        dayprefix = 'heute';
                        askedDay = currentDay;
                        console.log("No weekday specified, selecting 'heute'")
                    } else {
                        dayprefix = getDayPrefixFromHeardAsDay(slotValues.weekday.heardAs);
                        askedDay = getAskedDay(slotValues.weekday.heardAs);
                    }
                    menuNumber = Number(slotValues.number.heardAs);

                    if (data[askedDay] === undefined) {
                        speechOutput = `${getFullDayNameFromString(askedDay)} gibt es keine Menüs! Weitere Infos dazu auf www.mensen.at`;
                    } else {
                        if (menuNumber === 1) {
                            if (data[askedDay].menuOne.allergen === 'none') {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet keine Allergene. `
                            } else {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet folgende Allergene: ${data[askedDay].menuOne.allergen} `
                            }
                        } else if (menuNumber === 2) {
                            if (data[askedDay].menuTwo.allergen === 'none') {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet keine Allergene. `
                            } else {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet folgende Allergene: ${data[askedDay].menuTwo.allergen} `
                            }

                        } else if (menuNumber === 3) {
                            if (data[askedDay].menuThree.allergen === 'none') {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet keine Allergene. `
                            } else {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet folgende Allergene: ${data[askedDay].menuThree.allergen} `
                            }
                        }
                    }
                }
                if (reprompt === true) {
                    resolve(handlerInput.responseBuilder.speak(speechOutput).reprompt(speechOutput).getResponse());
                } else {
                    resolve(handlerInput.responseBuilder.speak(speechOutput).getResponse());
                }
            }, demoData);
        });
    }
};

/**
 * Speaks out the price from the asked menu
 */
const PriceInfoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PriceInfoIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const slotValues = miscHelpers.getSlotValues(request.intent.slots);
        let reprompt = false;

        //get the sessionattribute for demo data
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let demoData = sessionAttributes['demo'];
        if (sessionAttributes['demo'] === undefined) {
            demoData = false;
        }

        return new Promise((resolve) => {
            getMenuData((data) => {
                let speechOutput = ERROR_MESSAGE;
                let currentDay = weekDays[getCurrentDay()];
                let askedDay = '';
                let dayprefix = '';
                let menuNumber = 0;

                if (slotValues.number.heardAs === undefined) {
                    console.log("No menunumber selected!");
                    speechOutput = ('Kein Menü angegeben. Bitte probiere es nocheinmal mit Menü 1, Menü 2 oder Menü 3.');
                    reprompt = true;
                } else {
                    if (slotValues.weekday.heardAs === undefined) {
                        dayprefix = 'heute';
                        askedDay = currentDay;
                        console.log("No weekday specified, selecting 'heute'")
                    } else {
                        dayprefix = getDayPrefixFromHeardAsDay(slotValues.weekday.heardAs);
                        askedDay = getAskedDay(slotValues.weekday.heardAs);
                    }
                    menuNumber = Number(slotValues.number.heardAs);

                    if (data[askedDay] === undefined) {
                        speechOutput = `${getFullDayNameFromString(askedDay)} gibt es keine Menüs! Weitere Infos dazu auf www.mensen.at`;
                    } else {
                        if (menuNumber === 1) {
                            if (data[askedDay].menuOne.price === "none") {
                                speechOutput = `Zum Menü ${menuNumber} von ${dayprefix} wurde kein Preis angegeben.`
                            } else {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} kostet: ${data[askedDay].menuOne.price} `
                            }

                        } else if (menuNumber === 2) {
                            if (data[askedDay].menuTwo.price === "none") {
                                speechOutput = `Zum Menü ${menuNumber} von ${dayprefix} wurde kein Preis angegeben.`
                            } else {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} kostet: ${data[askedDay].menuTwo.price} `
                            }
                        } else if (menuNumber === 3) {
                            if (data[askedDay].menuThree.price === "none") {
                                speechOutput = `Zum Menü ${menuNumber} von ${dayprefix} wurde kein Preis angegeben.`
                            } else {
                                speechOutput = `Das Menü ${menuNumber} von ${dayprefix} kostet: ${data[askedDay].menuThree.price} `
                            }
                        }
                    }
                }
                if (reprompt === true) {
                    resolve(handlerInput.responseBuilder.speak(speechOutput).reprompt(speechOutput).getResponse());
                } else {
                    resolve(handlerInput.responseBuilder.speak(speechOutput).getResponse());
                }
            }, demoData);
        });
    }
};
/**
 * Sets the demo data to 'ein' or 'aus'
 * Demo Data is used to test the skill when the mensa doesnt have any menu at the moment
 */
const SetDemoIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetDemoIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const slotValues = miscHelpers.getSlotValues(request.intent.slots);

        let state = slotValues.state.heardAs;
        let speechOutput = 'none';

        switch (state) {
            case 'ein':
                sessionAttributes['demo'] = 'true';
                break;
            case 'aus':
                sessionAttributes['demo'] = 'false';
                break;
            default:
                sessionAttributes['demo'] = 'false';
                state = 'aus'
        }
        speechOutput = `Demo Daten sind ${state} . Frag mich was es heute zu essen gibt!`;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(HELP_MESSAGE)
            .reprompt(HELP_MESSAGE)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(STOP_MESSAGE)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;
        console.log(`Error handled: ${error.message}`);
        console.log(` Original request was ${JSON.stringify(request, null, 2)}\n`);

        return handlerInput.responseBuilder
            .speak(ERROR_MESSAGE)
            .reprompt(ERROR_MESSAGE)
            .getResponse();
    },
};

/**
 * Request Interceptor to log the request sent by Alexa
 */
const LogRequestInterceptor = {
    process(handlerInput) {
        // Log Request
        console.log("==== REQUEST ======");
        console.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
    }
};

// 2. Helper Functions ==========================================================================
function getMenuData(callback, demoData) {
    const menuDataFromWeek = dataHelper.getMenuDataForWeek(demoData).then(data => {
        callback(data);
    }).catch(exception => console.log(exception.stack));
}

const weekDays = {
    1: 'mo',
    2: 'di',
    3: 'mi',
    4: 'do',
    5: 'fr',
    6: 'sa',
    7: 'so'
};

function getFullDayNameFromString(day) {
    switch (day) {
        case 'mo':
            return 'Montag';
        case 'di':
            return 'Dienstag';
        case 'mi':
            return 'Mittwoch';
        case 'do':
            return 'Donnerstag';
        case 'fr':
            return 'Freitag';
        case 'sa':
            return 'Samstag';
        case 'so':
            return 'Sonntag';
        default:
            return day;
    }
}

function getDayPrefixFromHeardAsDay(day) {
    day = day.toLowerCase();
    switch (day) {
        case 'montag':
            return 'Montag';
        case 'dienstag':
            return 'Dienstag';
        case 'mittwoch':
            return 'Mittwoch';
        case 'donnerstag':
            return 'Donnerstag';
        case 'freitag':
            return 'Freitag';
        case 'samstag':
            return 'Samstag';
        case 'sonntag':
            return 'Sonntag';
        case 'heute':
            return 'heute';
        case 'morgen':
            return 'morgen';
        case 'übermorgen':
            return 'übermorgen';
        default:
            return 'heute';
    }
}

function getCurrentDay() {
    let d = new Date();
    return d.getDay()
}

function getAskedDay(day) {
    let askedDay = '';
    switch (day) {
        case 'heute':
            askedDay = weekDays[getCurrentDay()];
            break;
        case 'morgen':
            if (getCurrentDay() === 7) {
                askedDay = weekDays[1];
            } else {
                askedDay = weekDays[getCurrentDay() + 1];
            }
            break;
        case 'übermorgen':
            askedDay = weekDays[getCurrentDay() + 2];
            if (getCurrentDay() === 6) {
                askedDay = weekDays[1];
            } else if (getCurrentDay() === 7) {
                askedDay = weekDays[2];
            }
            break;
        case 'montag':
            askedDay = weekDays[1];
            break;
        case 'dienstag':
            askedDay = weekDays[2];
            break;
        case 'mittwoch':
            askedDay = weekDays[3];
            break;
        case 'donnerstag':
            askedDay = weekDays[4];
            break;
        case 'freitag':
            askedDay = weekDays[5];
            break;
        case 'samstag':
            askedDay = weekDays[6];
            break;
        case 'sonntag':
            askedDay = weekDays[7];
            break;
        default:
            askedDay = weekDays[getCurrentDay()];
            break;
    }
    return askedDay;
}

function checkMenuVegOrVegan(menuData) {
    const menuVegan = 'Vegan';
    const menuVegetarian = "Vegetarisch";
    if (menuData.vegan === true) {
        return menuVegan;
    } else if (menuData.vegetarian === true) {
        return menuVegetarian;
    }
    return '';
}

// 3. Export ====================================================================================
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        BasicMenuOverviewIntentHandler,
        AllergenInfoIntentHandler,
        PriceInfoIntentHandler,
        OpeningHoursIntentHandler,
        SetDemoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    //.addRequestInterceptors(LogRequestInterceptor)
    .lambda();
