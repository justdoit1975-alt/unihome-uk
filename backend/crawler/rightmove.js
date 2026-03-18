/**
 * Rightmove Listing Crawler
 * Extract listing data from Rightmove
 */

const axios = require('axios');
const cheerio = require('cheerio');

class RightmoveCrawler {
  constructor() {
    this.baseUrl = 'https://www.rightmove.co.uk';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  // Search by area and criteria
  async search(params) {
    const { query, minPrice, maxPrice, beds, includesBills } = params;
    
    // Build search URL
    let searchUrl = `${this.baseUrl}/property-to-rent/find.html?`;
    
    if (minPrice) searchUrl += `&minPrice=${minPrice}`;
    if (maxPrice) searchUrl += `&maxPrice=${maxPrice}`;
    if (beds) searchUrl += `&minBedrooms=${beds}&maxBedrooms=${beds}`;
    
    console.log(`Searching Rightmove: ${searchUrl}`);
    
    try {
      const response = await axios.get(searchUrl, { headers: this.headers });
      const $ = cheerio.load(response.data);
      
      const listings = [];
      
      $('.propertyCard').each((i, el) => {
        const title = $(el).find('.propertyCard-title').text().trim();
        const address = $(el).find('.propertyCard-address').text().trim();
        const priceText = $(el).find('.propertyCard-priceValue').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''));
        const link = $(el).find('.propertyCard-link').attr('href');
        const imageUrl = $(el).find('img.propertyCard-img').attr('src');
        
        listings.push({
          title,
          location: address,
          price,
          priceUnit: 'pw',
          url: this.baseUrl + link,
          imageUrl,
          crawledAt: new Date().toISOString(),
        });
      });
      
      return listings;
    } catch (err) {
      console.error('Rightmove search error:', err);
      throw err;
    }
  }

  // Get detailed info from a single listing
  async getListingDetail(url) {
    try {
      const response = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(response.data);
      
      const title = $('h1').text().trim();
      const address = $('.dl-room-summary-address').text().trim();
      const priceText = $('.pv-pricing-group-price').text().trim();
      const price = parseInt(priceText.replace(/[^0-9]/g, ''));
      const description = $('.vip-description-body').text().trim();
      
      // Extract key features
      const features = [];
      $('.vip-features-list li').each((i, el) => {
        features.push($(el).text().trim());
      });
      
      // Parse features for key info
      const includesBills = features.some(f => f.toLowerCase().includes('bill') || f.toLowerCase().includes('all inclusive'));
      const studentFriendly = features.some(f => f.toLowerCase().includes('student')) || description.toLowerCase().includes('student');
      
      const beds = parseInt(features.find(f => f.includes('bedroom'))?.match(/\d+/)?.[0] || '1');
      const baths = parseInt(features.find(f => f.includes('bathroom'))?.match(/\d+/)?.[0] || '1');
      
      const imageUrls = [];
      $('.js-gallery-image img').each((i, el) => {
        const src = $(el).attr('src');
        if (src) imageUrls.push(src);
      });
      
      return {
        title,
        address,
        price,
        priceUnit: 'pw',
        description,
        features,
        includesBills,
        studentFriendly,
        beds,
        baths,
        imageUrl: imageUrls[0] || null,
        imageUrls,
        url,
        crawledAt: new Date().toISOString(),
      };
      
    } catch (err) {
      console.error('Rightmove detail error:', err);
      throw err;
    }
  }
}

module.exports = RightmoveCrawler;
