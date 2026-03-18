const puppeteer = require('puppeteer');
const fs = require('fs');

class RightmoveCrawler {
  constructor(options = {}) {
    this.baseUrl = 'https://www.rightmove.co.uk';
    this.browser = null;
    this.page = null;
    this.headless = options.headless !== false;
    this.timeout = options.timeout || 30000;
  }

  // Initialize browser
  async init() {
    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
      // Use system Chrome if available
      executablePath: this.getChromePath(),
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
    
    this.page = await this.browser.newPage();
    
    // Set user agent to avoid detection
    await this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    
    // Disable webdriver flag
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    // Add random delay
    await this.randomDelay(1000, 3000);
  }

  // Get Chrome path for macOS
  getChromePath() {
    const paths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const path of paths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    return undefined;
  }

  // Random delay to mimic human behavior
  async randomDelay(min = 500, max = 2000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Search by area and criteria
  async search(params) {
    const { query, minPrice, maxPrice, beds, includesBills } = params;
    
    if (!this.page) await this.init();
    
    // For London searches, use areaCode 554705 for Greater London
    let locationId = '554705'; // Default to Greater London if no specific location
    if (query.toLowerCase().includes('manchester')) locationId = '552605';
    if (query.toLowerCase().includes('birmingham')) locationId = '547039';
    if (query.toLowerCase().includes('edinburgh')) locationId = '551699';
    if (query.toLowerCase().includes('glasgow')) locationId = '551701';
    if (query.toLowerCase().includes('oxford')) locationId = '549265';
    if (query.toLowerCase().includes('cambridge')) locationId = '549015';
    
    // Build search URL with correct locationIdentifier format
    let searchUrl = `${this.baseUrl}/property-to-rent/find.html?`;
    searchUrl += `locationIdentifier=REGION%5E${locationId}&`;
    if (minPrice) searchUrl += `minPrice=${minPrice}&`;
    if (maxPrice) searchUrl += `maxPrice=${maxPrice}&`;
    if (beds) searchUrl += `minBedrooms=${beds}&maxBedrooms=${beds}&`;
    // Remove trailing &
    searchUrl = searchUrl.replace(/&$/, '');
    
    console.log(`Searching Rightmove: ${searchUrl}`);
    
    await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: this.timeout });
    await this.randomDelay(2000, 4000);
    
    // Check if we have results
    await this.page.waitForSelector('div.propertyCard-wrapper', { timeout: 10000 }).catch(() => null);
    
    // Extract listings
    const listings = await this.extractListings();
    
    return listings;
  }

  // Extract basic listing information from search results
  async extractListings() {
    const listings = await this.page.evaluate(() => {
      const results = [];
      // Rightmove updated their class names
      const cards = document.querySelectorAll('[data-testid="propertyCard"]');
      
      cards.forEach(card => {
        try {
          // Title and address
          const titleEl = card.querySelector('[data-testid="property-title"] a');
          const addressEl = card.querySelector('[data-testid="property-address"]');
          const title = (titleEl?.textContent || addressEl?.textContent)?.trim() || '';
          const relativeUrl = titleEl?.getAttribute('href') || '';
          const url = relativeUrl.startsWith('http') ? relativeUrl : `https://www.rightmove.co.uk${relativeUrl}`;
          const id = relativeUrl.match(/property-(\d+)\.html/)?.[1] || '';
          
          // Price
          const priceEl = card.querySelector('[data-testid="price"]');
          const priceText = priceEl?.textContent?.trim() || '';
          const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
          
          // Rooms
          const bedsEl = card.querySelector('[data-testid="beds"]');
          const beds = bedsEl?.textContent?.replace(/[^0-9]/g, '') || '';
          
          // Agent
          const agentEl = card.querySelector('[data-testid="agentName"]');
          const agent = agentEl?.textContent?.trim() || '';
          
          // Image
          const imgEl = card.querySelector('img');
          const imageUrl = imgEl?.getAttribute('src') || '';
          
          results.push({
            id,
            title,
            url,
            price,
            priceText,
            beds: parseInt(beds) || 0,
            agent,
            imageUrl,
            source: 'rightmove',
          });
        } catch (err) {
          console.error('Error parsing card:', err);
        }
      });
      
      return results;
    });
    
    // Get detailed info for each listing
    const detailedListings = [];
    for (const listing of listings.slice(0, 20)) { // Limit to first 20
      try {
        const detail = await this.getListingDetails(listing.url);
        detailedListings.push({ ...listing, ...detail });
        await this.randomDelay(1000, 2500);
      } catch (err) {
        console.error(`Error fetching details for ${listing.id}:`, err);
        detailedListings.push(listing);
      }
    }
    
    return detailedListings;
  }

  // Get detailed information from a property page
  async getListingDetails(url) {
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: this.timeout });
    await this.randomDelay(1000, 2000);
    
    const details = await this.page.evaluate(() => {
      const data = {};
      
      // Full description
      const descEl = document.querySelector('div[data-testid="description"]');
      data.description = descEl?.textContent?.trim() || '';
      
      // Address
      const addressEl = document.querySelector('h1.property-title-heading');
      data.address = addressEl?.textContent?.trim() || '';
      
      // Available date
      const availableEl = document.querySelector('table.key-features-list li');
      data.availableDate = availableEl?.textContent?.trim() || '';
      
      // Key features
      const features = [];
      document.querySelectorAll('ul.list-bullets li').forEach(li => {
        features.push(li.textContent.trim());
      });
      data.keyFeatures = features;
      
      // Check if bills included
      data.includesBills = data.description.toLowerCase().includes('bill') || 
                          data.description.toLowerCase().includes('included') ||
                          data.keyFeatures.some(f => f.toLowerCase().includes('bill') || f.toLowerCase().includes('included'));
      
      // Furnishings
      data.furnished = data.description.toLowerCase().includes('furnished') ? 
        (data.description.toLowerCase().includes('unfurnished') ? 'unfurnished' : 'furnished') : 'part-furnished';
      
      // Agent contact
      const agentNameEl = document.querySelector('div.agent-details h2');
      data.agentName = agentNameEl?.textContent?.trim() || '';
      
      // Location coordinates
      const latMatch = document.body.innerHTML.match(/latitude:.*?"([\d.]+)"/);
      const lngMatch = document.body.innerHTML.match(/longitude:.*?"([\d.]+)"/);
      data.latitude = latMatch ? parseFloat(latMatch[1]) : null;
      data.longitude = lngMatch ? parseFloat(lngMatch[1]) : null;
      
      return data;
    });
    
    return details;
  }

  // Close browser
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = RightmoveCrawler;
