'use strict';
const Alexa = require('ask-sdk-core');
const dataHelper = require('./menuDataHelper');
const miscHelpers = require('./miscHelpers');
const HELP_MESSAGE = 'Du kannst mich zum Beispiel fragen: Was gibt es heute zu essen? Welche Allergene befinden sich in Menü 1 von heute? Wie lauten die Öffnungszeiten?';
const STOP_MESSAGE = 'Servus!';
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
                resolve(handlerInput.responseBuilder.speak(speechOutput).reprompt(speechOutput).getResponse());
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

                if (slotValues.weekday === undefined) {
                    dayprefix = 'heute';
                    askedDay = currentDay;
                } else {
                    dayprefix = slotValues.weekday.heardAs;
                    askedDay = getAskedDay(slotValues.weekday.heardAs)
                }

                if (data[askedDay] === undefined) {
                    speechOutput = `${getFullDayNameFromString(askedDay)} gibt es nichts zu essen! Weitere Infos dazu auf www.mensen.at`;
                } else {
                    speechOutput = `${dayprefix} gibt es folgende Menüs: ${data[askedDay].menuOne.title} ${checkMenuVegOrVegan(data[askedDay].menuOne)} : ${data[askedDay].menuOne.food} um ${data[askedDay].menuOne.price} <break time="0.3s"/>
                     ${data[askedDay].menuTwo.title} ${checkMenuVegOrVegan(data[askedDay].menuTwo)} : ${data[askedDay].menuTwo.food} um ${data[askedDay].menuTwo.price} <break time="0.3s"/>
                     ${data[askedDay].menuThree.title} ${checkMenuVegOrVegan(data[askedDay].menuThree)}: ${data[askedDay].menuThree.food} um ${data[askedDay].menuThree.price} <break time="0.3s"/> `
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
                } else {
                    if (slotValues.weekday.heardAs === undefined) {
                        dayprefix = 'heute';
                        askedDay = currentDay;
                        console.log("No weekday specified, selecting 'heute'")
                    } else {
                        dayprefix = slotValues.weekday.heardAs;
                        askedDay = getAskedDay(slotValues.weekday.heardAs);
                    }
                    menuNumber = Number(slotValues.number.heardAs);

                    if (data[askedDay] === undefined) {
                        speechOutput = `${getFullDayNameFromString(askedDay)} gibt es nichts zu essen! Weitere Infos dazu auf www.mensen.at`;
                    } else {
                        if (menuNumber === 1) {
                            speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet folgende Allergene: ${data[askedDay].menuOne.allergen} `
                        } else if (menuNumber === 2) {
                            speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet folgende Allergene: ${data[askedDay].menuTwo.allergen} `
                        } else if (menuNumber === 3) {
                            speechOutput = `Das Menü ${menuNumber} von ${dayprefix} beinhaltet folgende Allergene: ${data[askedDay].menuThree.allergen} `
                        }
                    }
                }
                resolve(handlerInput.responseBuilder.speak(speechOutput).getResponse());
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
        speechOutput = `Demo Daten sind ${state} . Frag mich was es zu essen gibt!`;
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
            askedDay = weekDays[getCurrentDay() + 1];
            break;
        case 'übermorgen':
            askedDay = weekDays[getCurrentDay() + 2];
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
        OpeningHoursIntentHandler,
        SetDemoIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    //.addRequestInterceptors(LogRequestInterceptor)
    .lambda();
