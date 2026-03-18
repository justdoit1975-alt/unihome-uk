/**
 * Zoopla Listing Crawler
 * Extract listing data from Zoopla
 */

const axios = require('axios');
const cheerio = require('cheerio');

class ZooplaCrawler {
  constructor() {
    this.baseUrl = 'https://www.zoopla.co.uk';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
  }

  // Search by area and criteria
  async search(params) {
    const { query, minPrice, maxPrice, beds, includesBills } = params;
    
    // Build search URL for rental
    let searchUrl = `${this.baseUrl}/property-to-rent/search/?q=${encodeURIComponent(query)}`;
    
    if (minPrice) searchUrl += `&price_min=${minPrice}`;
    if (maxPrice) searchUrl += `&price_max=${maxPrice}`;
    if (beds) searchUrl += `&beds_min=${beds}&beds_max=${beds}`;
    
    console.log(`Searching Zoopla: ${searchUrl}`);
    
    try {
      const response = await axios.get(searchUrl, { headers: this.headers });
      const $ = cheerio.load(response.data);
      
      const listings = [];
      
      $('.listing-results-wrapper').each((i, el) => {
        const title = $(el).find('.listing-results-name').text().trim();
        const address = $(el).find('.listing-results-address').text().trim();
        const priceText = $(el).find('.listing-results-price').text().trim();
        const price = parseInt(priceText.replace(/[^0-9]/g, ''));
        const link = $(el).find('a.listing-results-link').attr('href');
        const imageUrl = $(el).find('img.listing-results-image').attr('src');
        
        if (link && price) {
          listings.push({
            title,
            location: address || title,
            price,
            priceUnit: 'pw',
            url: this.baseUrl + link,
            imageUrl: imageUrl || null,
            source: 'zoopla',
            crawledAt: new Date().toISOString(),
          });
        }
      });
      
      return listings;
    } catch (err) {
      console.error('Zoopla search error:', err);
      throw err;
    }
  }

  // Get detailed info from a single listing
  async getListingDetail(url) {
    try {
      const fullUrl = url.startsWith('http') ? url : this.baseUrl + url;
      const response = await axios.get(fullUrl, { headers: this.headers });
      const $ = cheerio.load(response.data);
      
      const title = $('h1').first().text().trim();
      const address = $('.dp-address').text().trim() || $('.Breadcrumbs-crumbs').last().text().trim();
      const priceText = $('[data-testid="price"]').text().trim();
      const price = parseInt(priceText.replace(/[^0-9]/g, ''));
      const description = $('[data-testid="description"]').text().trim();
      
      // Extract key features
      const features = [];
      $('.dp-features-list li').each((i, el) => {
        features.push($(el).text().trim());
      });
      
      // Parse features for key info
      const includesBills = features.some(f => f.toLowerCase().includes('bill') || f.toLowerCase().includes('all inclusive'));
      const studentFriendly = features.some(f => f.toLowerCase().includes('student')) || description.toLowerCase().includes('student');
      
      const beds = parseInt(features.find(f => f.includes('bedroom'))?.match(/\d+/)?.[0] || '1');
      const baths = parseInt(features.find(f => f.includes('bathroom'))?.match(/\d+/)?.[0] || '1');
      
      const imageUrls = [];
      $('.js-gallery-image img, .dp-carousel-image img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('placeholder')) imageUrls.push(src);
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
        url: fullUrl,
        source: 'zoopla',
        crawledAt: new Date().toISOString(),
      };
      
    } catch (err) {
      console.error('Zoopla detail error:', err);
      throw err;
    }
  }
}

module.exports = ZooplaCrawler;
