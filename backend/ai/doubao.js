/**
 * Doubao AI - Property Analysis
 * Analyze UK rental listings for international students
 */

const axios = require('axios');

class DoubaoAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  }

  async analyzeListing(listing) {
    const prompt = `
你是一位经验丰富的英国租房顾问，专门帮助中国留学生分析房源。请分析以下这套英国租房房源，给出简洁清晰的总结，要点包括：

1. 位置优势/劣势（离大学远近、交通是否方便）
2. 价格性价比分析（对比区域市场价，是否划算）
3. 对留学生友好吗？有哪些亮点需要注意（是否包bill，是否接受学生，要不要担保人）
4. 潜在风险点（有啥坑需要注意）

要求：用中文回答，控制在100字以内，分点列出，用emoji开头更清晰。

房源信息：
标题：${listing.title}
位置：${listing.location}
价格：£${listing.price} ${listing.priceUnit || 'per week'}
卧室：${listing.beds}
卫生间：${listing.baths}
包bill：${listing.includesBills ? '是' : '否'}
学生友好：${listing.studentFriendly ? '是' : '否'}
描述：${listing.description || '无'}
`;

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: 'doubao-4k-250428',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const summary = response.data.choices[0].message.content;
      return summary.trim();
    } catch (err) {
      console.error('Doubao AI analysis error:', err.response?.data || err.message);
      return null;
    }
  }
}

module.exports = DoubaoAI;
