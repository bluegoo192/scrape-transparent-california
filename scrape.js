const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const stats = require('simple-statistics');
const accounting = require('accounting');

const scrapedFieldsByIndex = [
  'name',
  'title',
  'pay',
  'total pay',
  'benefits',
  'total comp'
];

async function extractFields(cheerioRowObject) {
  return cheerioRowObject.find('td')
    .map((index, cell) => 
      cheerio(cell)
      .text() // get all raw text content
      .trim() // remove weird whitespace surrounding some of the text
      .split('\n') // job title column contains title AND location, separated by a newline. split 'em
      .map(str => str.trim()) // remove weird whitespace surrounding that newline
    )
    .get();
}

function getCachePath(pageNumber) {
  return `./cache/page${pageNumber}.json`;
}

async function scrapePage(number) {
  console.log('Starting scrape of page', number);

  // Try to fetch from cache first, so we don't accidentally DDOS a non-profit :)
  try {
    const cacheEntry = await fs.promises.readFile(getCachePath(number));
    console.log('Found a cache entry for page', number);
    return {
      ...JSON.parse(cacheEntry),
      fromCache: true,
    };
  } catch (err) {
    console.error(err);
    console.log('Cache miss on page', number);
  }


  const response = await fetch(`https://transparentcalifornia.com/salaries/search/?q=police+officer&y=2019&page=${number}`);
    const html = await response.text();
    const parsedHtml = cheerio.load(html, {
      normalizeWhitespace: true
    });

    const table = parsedHtml('tbody tr');
    const tableRows = await Promise.all(
      table.map((index, row) => 
        extractFields(cheerio(row))
      )
      .get()
    );

  console.log(`Page ${number} has ${tableRows.length} rows`);//, starting at ${tableRows[0][0]} and ending at ${tableRows[tableRows.length-1][0]}`);

  const nextButtons = parsedHtml('.next').not('.disabled').get();
  const hasNextPage = nextButtons.length > 0;
  return {tableRows, hasNextPage};
};

function writePageToCache(index, object) {
  if (object.fromCache === true) {
    return;
  }
  const objectString = JSON.stringify(object);
  fs.writeFile(getCachePath(index), objectString, err => {
    if (err) {
      console.error('error caching page.  error is ', err);
    } else {
      console.log('Successfully cached page ', index);
    }
  })
}

async function scrape() {
    let currentPage = 0;
    let hasNextPage = true;
    let rows = [];
    while (hasNextPage) {
      currentPage++;
      const pageScrapeResult = await scrapePage(currentPage);
      writePageToCache(currentPage, pageScrapeResult);
      rows = rows.concat(pageScrapeResult.tableRows);
      hasNextPage = pageScrapeResult.hasNextPage;
    }

    console.log('Finished! Total rows:', rows.length);
  return rows;
}

function toDollars(number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
}

async function analyze() {
  const rows = await scrape();
  
  const sanJoseRows = rows.filter(fields => fields[2].toLowerCase().includes('san jose'));
  console.log('Number of entries for San Jose:', sanJoseRows.length);

  const sanJoseTotalComps = sanJoseRows
    // Manually extract name, title, location, and total comp
    .map(fields => [fields[0], fields[1], fields[2], accounting.unformat(fields[fields.length - 1])])
  const sanJoseRawComps = sanJoseTotalComps.map(fields => fields[fields.length - 1]);

  const mean = stats.mean(sanJoseRawComps);
  const median = stats.median(sanJoseRawComps);

  console.log('====  RESULTS  ====');
  console.log('Mean comp', toDollars(Math.round(mean)));
  console.log('Median comp', toDollars(Math.round(median)));
}

analyze();

