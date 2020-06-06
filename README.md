## The world's crappiest scraper

### What it does

Scrapes police salary data from transparentcalifornia.com.  Right now it just pulls the mean and median total comp for San Jose, but that functionality can be expanded.

Also includes simple filesystem caching so we don't overload their servers. Always scrape responsibly!

### How to run it

1. Clone repo, make sure a modern version of node is installed
2. `npm install`
3. `npm run scrape`. You can add an option parameter for your query (make sure to put it in quotes), otherwise it'll default to 'police officer'

### Results from my last run

```
...
Starting scrape of page 49
Found a cache entry for page 49
Starting scrape of page 50
Found a cache entry for page 50
Starting scrape of page 51
Found a cache entry for page 51
Finished! Total rows: 2500
Number of entries for San Jose: 482
====  RESULTS  ====
Query was police officer
Mean comp $347,230.00
Median comp $348,609.00
```
