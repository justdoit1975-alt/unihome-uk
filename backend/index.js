/**
 * UniHome UK Backend
 * 
 * OpenClaw + Doubao AI powered backend for UniHome UK
 * - REST API for frontend
 * - Rightmove/Zoopla crawler
 * - Doubao AI integration
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Load config
const config = require('./config.json');

// Initialize Supabase
const supabase = createClient(config.supabase.url, config.supabase.key);

// Initialize Express
const app = express();
const PORT = config.port || 3001;

// Middleware
app.use(cors({
  origin: config.corsOrigin || '*',
}));
app.use(express.json());

// Doubao AI API call
async function callDoubao(prompt) {
  try {
    const response = await axios.post('https://aquasearch.ai.bytedance.net/v1/chat/completions', {
      model: 'doubao-4k',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${config.doubao.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return response.data.choices[0].message.content;
  } catch (err) {
    console.error('Doubao API error:', err);
    throw err;
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'unihome-backend', timestamp: new Date().toISOString() });
});

// Semantic search - convert user query to search parameters
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Use Doubao to parse natural language query
    const prompt = `
你是UniHome UK英国留学租房AI助手，请将用户的自然语言搜索需求转换为结构化的搜索参数。

用户需求：${query}

请返回JSON格式，包含以下字段：
- query: 搜索关键词（学校/地区）
- minPrice: 最低价格（镑/周，如果没说就是null）
- maxPrice: 最高价格（镑/周，如果没说就是null）
- beds: 卧室数量（如果没说就是null）
- includesBills: 是否需要包bill（true/false/null，不知道就是null）
- studentFriendly: 是否只允许学生房源（true/false/null）
- keywords: 关键词数组，比如["安静", "带书桌", "近学校"]
- location: 区域描述

只返回JSON，不要其他文字。
`;

    const aiResult = await callDoubao(prompt);
    let parsed;
    try {
      parsed = JSON.parse(aiResult);
    } catch (e) {
      parsed = { query, keywords: [], location: '' };
    }

    // Search from Supabase
    let dbQuery = supabase.from('listings').select('*');
    
    if (parsed.maxPrice) {
      dbQuery = dbQuery.lte('price', parsed.maxPrice);
    }
    if (parsed.beds) {
      dbQuery = dbQuery.eq('beds', parsed.beds);
    }
    if (parsed.includesBills !== null && parsed.includesBills !== undefined) {
      dbQuery = dbQuery.eq('includes_bills', parsed.includesBills);
    }
    if (parsed.studentFriendly !== null && parsed.studentFriendly !== undefined) {
      dbQuery = dbQuery.eq('student_friendly', parsed.studentFriendly);
    }

    const { data: listings, error } = await dbQuery.limit(20);

    if (error) {
      throw error;
    }

    // AI summarize each listing
    const summarized = await Promise.all(listings.map(async (listing) => {
      const summaryPrompt = `
你是UniHome UK的AI房源分析师，请给下面这个英国房源写一个简短的中文总结，包含优点和需要注意的点：

房源信息：
标题：${listing.title}
位置：${listing.location}
价格：${listing.price} 镑/周
卧室：${listing.beds}
卫生间：${listing.baths}
包bill：${listing.includes_bills ? '是' : '否'}
允许学生：${listing.student_friendly ? '是' : '否'}
描述：${listing.description}

请用中文回答，控制在3-5句话，标注出潜在风险点（比如需要担保人、位置差等）。
`;
      const summary = await callDoubao(summaryPrompt);
      return {
        ...listing,
        aiSummary: summary,
      };
    }));

    res.json({
      query: parsed,
      results: summarized,
      count: summarized.length,
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// AI analyze a single listing
app.post('/api/analyze', async (req, res) => {
  try {
    const { title, description, price, location } = req.body;

    const prompt = `
你是UniHome UK的AI房源审核专家，请分析这个英国租房房源，给出中文分析和风险提示：

标题：${title}
位置：${location}
价格：${price} 镑/周
描述：${description}

请分析：
1. 这个房源性价比如何
2. 有什么需要注意的风险点（比如：地下室、无窗、EPC等级低、需要英国保证人、不包bill等）
3. 给留学生的建议

用中文回答，条理清晰。
`;

    const analysis = await callDoubao(prompt);
    res.json({ analysis });

  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed', message: err.message });
  }
});

// Generate viewing email
app.post('/api/generate-email', async (req, res) => {
  try {
    const { listingTitle, university, moveInDate, name, phone } = req.body;

    const prompt = `
请帮我写一封给英国中介的预约看房邮件，要求语言地道，符合英国当地人的写作习惯，不要太生硬。

信息：
房源：${listingTitle}
大学：${university}
入住时间：${moveInDate}
我的名字：${name}
联系方式：${phone}

我是中国来的留学生，想要预约看房，请生成完整的邮件正文，不用主题，只要正文，用英文写。
`;

    const email = await callDoubao(prompt);
    res.json({ email });

  } catch (err) {
    console.error('Generate email error:', err);
    res.status(500).json({ error: 'Generate email failed', message: err.message });
  }
});

// Get listings (for development)
app.get('/api/listings', async (req, res) => {
  const { data, error } = await supabase.from('listings').select('*').limit(20);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ data });
});

// Crawl endpoints
const RightmoveCrawler = require('./crawler/rightmove');
const ZooplaCrawler = require('./crawler/zoopla');
const rightmove = new RightmoveCrawler();
const zoopla = new ZooplaCrawler();

// Trigger crawl
app.post('/api/crawl', async (req, res) => {
  try {
    const { source, query, minPrice, maxPrice, beds } = req.body;
    const params = { query, minPrice, maxPrice, beds };
    
    let results;
    if (source === 'zoopla') {
      results = await zoopla.search(params);
    } else {
      results = await rightmove.search(params);
    }
    
    // Get full details for each result and save to DB
    const saved = [];
    for (const item of results) {
      try {
        let detail;
        if (source === 'zoopla') {
          detail = await zoopla.getListingDetail(item.url);
        } else {
          detail = await rightmove.getListingDetail(item.url);
        }
        
        // Save to Supabase
        const { data, error } = await supabase.from('listings').upsert({
          title: detail.title,
          location: detail.address || detail.title,
          price: detail.price,
          price_unit: detail.priceUnit,
          description: detail.description,
          beds: detail.beds,
          baths: detail.baths,
          includes_bills: detail.includesBills,
          student_friendly: detail.studentFriendly,
          image_url: detail.imageUrl,
          image_urls: detail.imageUrls,
          source_url: detail.url,
          source: detail.source || source,
          crawled_at: detail.crawledAt,
        }, { onConflict: 'source_url' });
        
        if (error) {
          console.error('Save error:', error);
        } else {
          saved.push(detail);
        }
      } catch (err) {
        console.error('Failed to process listing:', item.url, err);
      }
    }
    
    res.json({
      source,
      found: results.length,
      saved: saved.length,
      results: saved,
    });
    
  } catch (err) {
    console.error('Crawl error:', err);
    res.status(500).json({ error: 'Crawl failed', message: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 UniHome Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🕷 Crawl endpoint: POST http://localhost:${PORT}/api/crawl`);
});
