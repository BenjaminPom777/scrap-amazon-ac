const puppeteer = require('puppeteer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const mostSellingItems = require('./most-selling.json');

const scrapeAutocomplete = async (searchTerms) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://amazon.com');
  await new Promise(resolve => setTimeout(resolve, 500));
  const searchSelector = '#twotabsearchtextbox';
  await page.waitForSelector(searchSelector);   //error: Waiting for selector `#twotabsearchtextbox` failed: Waiting failed: 30000ms exceeded   need to fix
  let allAutocompleteList = [];

  let appear = false;
  for (const searchTerm of searchTerms) {


    await page.click(searchSelector, { clickCount: 3 }) //trick to clean input
    await page.type(searchSelector, searchTerm);

    // Wait for the autocomplete suggestions to appear
    const autocompleteSelector = '.s-suggestion-container';
    if (!appear) {
      await page.waitForSelector(autocompleteSelector);
      appear = true;
    }


    const autocompleteList = await page.evaluate(async (selector) => {
      await new Promise(resolve => setTimeout(resolve, 2000)); //delay for results to be more accurate 
      const suggestions = document.querySelectorAll(selector);
      return Array.from(suggestions, suggestion => suggestion.innerText);
    }, autocompleteSelector);

    allAutocompleteList = [...allAutocompleteList, ...autocompleteList];
  }

  await browser.close();

  return allAutocompleteList;
}


const printToXml = async (items) => {

  fs.writeFileSync('autocomplete_data.json', JSON.stringify(items, null, 2));

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Autocomplete Data');

  worksheet.columns = [
    { header: 'Autocomplete Suggestions', key: 'suggestion' }
  ];

  items.forEach(suggestion => {
    worksheet.addRow({ suggestion });
  });

  await workbook.xlsx.writeFile('autocomplete_data.xlsx');
}


const flow = async (userInput) => {

  const itemsToScrap = [];

  for (const msItem of mostSellingItems) {
    if (msItem.toLowerCase().startsWith(userInput)) {
      itemsToScrap.push(msItem.toLowerCase());
    }
  }
  if (!itemsToScrap.includes(userInput)) { // also insure that this item is last
    itemsToScrap.push(userInput);
  }

  const searchTermsToPrint = await scrapeAutocomplete(itemsToScrap);

  if (searchTermsToPrint.length > 0) {
    printToXml(searchTermsToPrint);
  }

}

flow('mo')