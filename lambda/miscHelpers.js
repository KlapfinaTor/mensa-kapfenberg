//Code from: https://github.com/alexa/alexa-cookbook/blob/master/tools/TestFlow/sampleskill2/helpers.js
module.exports = {
    'getSlotValues': function (filledSlots) {
        const slotValues = {};

        Object.keys(filledSlots).forEach((item) => {
            const name = filledSlots[item].name;

            if (filledSlots[item] &&
                filledSlots[item].resolutions &&
                filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
                filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
                filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
                switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
                    case 'ER_SUCCESS_MATCH':
                        slotValues[name] = {
                            heardAs: filledSlots[item].value,
                            resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                            ERstatus: 'ER_SUCCESS_MATCH'
                        };
                        break;
                    case 'ER_SUCCESS_NO_MATCH':
                        slotValues[name] = {
                            heardAs: filledSlots[item].value,
                            resolved: '',
                            ERstatus: 'ER_SUCCESS_NO_MATCH'
                        };
                        break;
                    default:
                        break;
                }
            } else {
                slotValues[name] = {
                    heardAs: filledSlots[item].value,
                    resolved: '',
                    ERstatus: ''
                };
            }
        }, this);

        return slotValues;
    },
};

// another way to define helpers: extend a native type with a new function
Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) < 0;
    });
};

