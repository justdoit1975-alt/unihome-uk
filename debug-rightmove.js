const RightmoveCrawler = require('./backend/crawler/rightmove');
const fs = require('fs');

(async () => {
  const crawler = new RightmoveCrawler();
  try {
    await crawler.init();
    const url = 'https://www.rightmove.co.uk/property-to-rent/find.html?minPrice=200&maxPrice=500&minBedrooms=1&maxBedrooms=1&locationName=London';
    await crawler.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await crawler.randomDelay(3000, 5000);
    
    // Save HTML for debugging
    const html = await crawler.page.content();
    fs.writeFileSync('debug-rightmove.html', html);
    console.log('Saved HTML to debug-rightmove.html');
    
    // Count what we can find
    const counts = await crawler.page.evaluate(() => {
      return {
        propertyCard: document.querySelectorAll('[data-testid="propertyCard"]').length,
        propertyCardWrapper: document.querySelectorAll('div.propertyCard-wrapper').length,
        anyCards: document.querySelectorAll('[class*="card"]').length,
        anyProperties: document.querySelectorAll('[id*="property"]').length,
      };
    });
    
    console.log('Element counts:', counts);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await crawler.close();
  }
})();
