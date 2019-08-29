'use strict';
const cheerio = require('cheerio');
const fetch = require("node-fetch");
const baseUrlMensaKapfenberg = "http://menu.mensen.at/index/index/?locid=50"; //Kapfenberg has the locid 50, week and year are for testing purpose
const urlDemo = "http://menu.mensen.at/index/index/?locid=50&woy=5&year=2019";
const locationID = 50; //kapfenberg mensa

class MenuDataHelper {

    /**
     *
     * @param demo when true then demo data will be returned
     * @param calendarWeek defines from which week data will be retrieved
     * @param year defines the year
     * @returns {Promise<unknown>}
     */
    static getMenuDataForWeek(demo, calendarWeek, year) {
        let weekString = "";
        let yearString = "";
        let url = "";

        if (calendarWeek != null) {
            weekString = "&woy=" + calendarWeek
        }
        if (year != null) {
            yearString = "&year=" + year
        }

        if (demo === 'true' || demo === true) {
            url = urlDemo;
        } else {
            url = baseUrlMensaKapfenberg + weekString + yearString;
        }

        return new Promise((resolve, reject) => {
            fetch(url)
                .then(res => res.text())
                .then((html) => {
                    let menuWeekData = {
                        "locationId": locationID,
                        "openingHours": "none",
                        "week": calendarWeek,
                        "year": year
                    };

                    let $ = cheerio.load(html);

                    function parseFoodData(foodString) {
                        let parsedFoodString = foodString.toString();
                        parsedFoodString = parsedFoodString.replace(/(\r\n|\n|\r)/gm, " "); //remove all linebreaks
                        parsedFoodString = parsedFoodString.replace(/\(([^)]+)\)/g, " "); //remove round brackets and everything between them
                        parsedFoodString = parsedFoodString.replace(/€..../g, "").trim(); //removes the price and trims
                        parsedFoodString = parsedFoodString.replace(/\s\s+/g, ' '); //replace multiple spaces with only one

                        return parsedFoodString;
                    }

                    function getAllergenFromFoodString(foodString) {
                        let allergenSet = new Set;
                        if (foodString == null)
                            return "none";

                        function getAllergenForChar(char) {
                            switch (char) {
                                case 'A':
                                    return ('Glutenhaltiges Getreide');
                                case 'B':
                                    return ('Krebstiere');
                                case 'C':
                                    return ('Eier');
                                case 'D':
                                    return ('Fisch');
                                case 'E':
                                    return ('Erdnüsse');
                                case 'F':
                                    return ('Sojabohnen');
                                case 'G':
                                    return ('Milch');
                                case 'H':
                                    return ('Schalenfrüchte');
                                case 'L':
                                    return ('Sellerie');
                                case 'M':
                                    return ('Senf');
                                case 'N':
                                    return ('Sesamsamen');
                                case 'O':
                                    return ('Sulfite');
                                case 'P':
                                    return ('Lupinen');
                                case 'R':
                                    return ('Weichtiere');
                                default:
                                    return
                            }
                        }

                        let data = foodString.match(/\(([^)]+)\)/g); //get ( and ) and the content between them

                        if (data == null) {
                            return "none"
                        } else {
                            data.forEach(function (element, i) {
                                let tmp = element.replace(/ /g, '').replace(/[()]/g, ''); //remove whitespace and brackets
                                if (tmp.length > 1) {
                                    let array = tmp.split(",").forEach(function (element, i) {
                                        allergenSet.add(getAllergenForChar(element))
                                    })
                                } else {
                                    allergenSet.add(getAllergenForChar(tmp))
                                }
                            });
                            return Array.from(allergenSet).join(',')
                        }
                    }

                    function getPriceFromFoodString(foodString) {
                        let data = foodString.replace(/\s/g, "").match(/€..../gm); //remove whitespace then extract the price
                        if (data == null) {
                            return "none";
                        } else {
                            return data[0];
                        }
                    }

                    function checkFoodStringIfVegan(foodString) {
                        if (foodString == null) {
                            return false;
                        }
                        if (foodString.toLowerCase() === "vegan") {
                            return true;
                        } else {
                            return false;
                        }
                    }

                    function checkFoodStringIfVegetarian(foodString) {
                        if (foodString == null) {
                            return false;
                        }
                        if (foodString.toLowerCase() === "vegetarisch") {
                            return true;
                        } else {
                            return false;
                        }
                    }

                    menuWeekData.openingHours = $('#addtional-info').find('.category-opening-hours').first().text().toString();

                    $('div.day').each(function (element, i) {
                        let day = $(this).children('.day-of-week').text();

                        if (day === "Mo" || day === "Di" || day === "Mi" || day === "Do" || day === "Fr" || day === "Sa") {


                            //Menu One
                            let menuOneTitle = $(this).children('.day-content').children('.category-first').children('.category-title').text();
                            let menuOneFoodRawData = $(this).children('.day-content').children('.category-first').children('.category-content').text();
                            let menuOneFood = parseFoodData(menuOneFoodRawData);
                            let menuOnePrice = getPriceFromFoodString(menuOneFoodRawData);
                            let menuOneAllergen = getAllergenFromFoodString(menuOneFoodRawData);
                            let menuOneVegan = false;
                            let menuOneVegetarian = false;

                            let menuOneVeg = $(this).children('.day-content').children('.category-first').find('img').each(function (i, element) {
                                menuOneVegan = checkFoodStringIfVegan($(this).attr('alt'));
                                menuOneVegetarian = checkFoodStringIfVegetarian($(this).attr('alt'));
                            });

                            //Menu Two
                            let menuTwoTitle = $(this).children('.day-content').children('.category-second').children('.category-title').text();
                            let menuTwoFoodRawData = $(this).children('.day-content').children('.category-second').children('.category-content').text();
                            let menuTwoFood = parseFoodData(menuTwoFoodRawData);
                            let menuTwoPrice = getPriceFromFoodString(menuTwoFoodRawData);
                            let menuTwoAllergen = getAllergenFromFoodString(menuTwoFoodRawData);
                            let menuTwoVegan = false;
                            let menuTwoVegetarian = false;

                            let menuTwoVeg = $(this).children('.day-content').children('.category-second').find('img').each(function (i, element) {
                                menuTwoVegan = checkFoodStringIfVegan($(this).attr('alt'));
                                menuTwoVegetarian = checkFoodStringIfVegetarian($(this).attr('alt'));
                            });

                            //Menu Three
                            let menuThreeTitle = $(this).children('.day-content').children('#category148').children('.category-title').text();
                            let menuThreeFoodRawData = $(this).children('.day-content').children('#category148').children('.category-content').text();
                            let menuThreeFood = parseFoodData(menuThreeFoodRawData);
                            let menuThreePrice = getPriceFromFoodString(menuThreeFoodRawData);
                            let menuThreeAllergen = getAllergenFromFoodString(menuThreeFoodRawData);
                            let menuThreeVegan = false;
                            let menuThreeVegetarian = false;

                            let menuThreeVeg = $(this).children('.day-content').children('#category148').find('img').each(function (i, element) {
                                menuThreeVegan = checkFoodStringIfVegan($(this).attr('alt'));
                                menuThreeVegetarian = checkFoodStringIfVegetarian($(this).attr('alt'));
                            });


                            // check if the menu has actually menu data, sometimes the website just returns "Mensa geöffnet"
                            if (menuOneFood.length > 20) {
                                menuWeekData[day.toLowerCase()] = {
                                    "menuOne": {
                                        "title": menuOneTitle,
                                        "food": menuOneFood,
                                        "price": menuOnePrice,
                                        "allergen": menuOneAllergen,
                                        "vegetarian": menuOneVegetarian,
                                        "vegan": menuOneVegan,
                                    },
                                    "menuTwo": {
                                        "title": menuTwoTitle,
                                        "food": menuTwoFood,
                                        "price": menuTwoPrice,
                                        "allergen": menuTwoAllergen,
                                        "vegetarian": menuTwoVegetarian,
                                        "vegan": menuTwoVegan,
                                    },
                                    "menuThree": {
                                        "title": menuThreeTitle,
                                        "food": menuThreeFood,
                                        "price": menuThreePrice,
                                        "allergen": menuThreeAllergen,
                                        "vegetarian": menuThreeVegetarian,
                                        "vegan": menuThreeVegan,
                                    },
                                };
                            }
                        }
                    });
                    resolve(menuWeekData)
                })
                .catch(function (err) {
                    reject('Failed to fetch page: ', err);
                });
        });
    }
}

module.exports = MenuDataHelper;
module.exports.MenuDataHelper = MenuDataHelper;