const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Retrieve the Telegram bot token from the environment variable
const botToken = process.env.TELEGRAM_BOT_TOKEN;
// Create the Telegram bot instance
const bot = new TelegramBot(botToken, { polling: true });

// Define the predefined caption
const predefinedCaption = "\n\n𝗛𝗼𝘄 𝗧𝗼 𝗢𝗽𝗲𝗻 𝗟𝗶𝗻𝗸 🔗👇\n https://t.me/+_XbnklvoehphODA1\nJoin Main Channel 👇🏻\nhttps://t.me/+_XbnklvoehphODA1";

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  const welcomeMessage = `Hello, ${username}!\n\n`
    + 'Welcome to the URL Shortener Bot!\n'
    + 'You can use this bot to shorten URLs using the mybios.eu.org service.\n\n'
    + 'To shorten a URL, just type or paste the URL directly in the chat, and the bot will provide you with the shortened URL.\n\n'
    + 'If you haven\'t set your MyBios API token yet, use the command:\n/setarklinks YOUR_MYBIOS_API_TOKEN\n\n'
    + 'Now, go ahead and try it out!';

  bot.sendMessage(chatId, welcomeMessage);
});

// Command: /setarklinks
bot.onText(/\/setarklinks (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userToken = match[1].trim(); // Get the API token provided by the user

  // Save the user's MyBios API token to the database
  saveUserToken(chatId, userToken);

  const response = `MyBios API token set successfully. Your token: ${userToken}`;
  bot.sendMessage(chatId, response);
});

// Function to extract URLs from a given string
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Listen for any message (not just commands)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  // Ensure message text is defined before processing
  if (!messageText && !msg.photo) {
    console.log('No message text or photo found.');
    return;
  }

  if (messageText) {
    // Handle text messages
    await processTextMessage(chatId, messageText);
  } else if (msg.photo) {
    // Handle photo messages
    const caption = msg.caption || '';
    await processPhotoMessage(chatId, msg.photo, caption);
  }
});

// Function to process text messages
async function processTextMessage(chatId, messageText) {
  console.log('Message Text:', messageText);

  const urls = extractUrls(messageText);
  console.log('Extracted URLs:', urls);

  if (urls.length === 0) {
    bot.sendMessage(chatId, 'No URLs found in the message.');
    return;
  }

  try {
    const promises = urls.map(url => shortenUrl(url));
    const shortenedUrls = await Promise.all(promises);

    let updatedMessage = messageText;
    urls.forEach((url, index) => {
      updatedMessage = updatedMessage.replace(url, shortenedUrls[index]);
    });

    // Append the predefined caption
    updatedMessage += predefinedCaption;

    bot.sendMessage(chatId, updatedMessage);
  } catch (error) {
    console.error('Shorten URL Error:', error);
    bot.sendMessage(chatId, 'An error occurred while shortening the URLs. Please check your API token and try again.');
  }
}

// Function to process photo messages
async function processPhotoMessage(chatId, photos, caption) {
  const fileId = photos[photos.length - 1].file_id; // Get the highest resolution photo
  const file = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

  try {
    const response = await axios.get(fileUrl, { responseType: 'stream' });

    const urls = extractUrls(caption);
    console.log('Extracted URLs:', urls);

    if (urls.length > 0) {
      try {
        const promises = urls.map(url => shortenUrl(url));
        const shortenedUrls = await Promise.all(promises);

        let updatedCaption = caption;
        urls.forEach((url, index) => {
          updatedCaption = updatedCaption.replace(url, shortenedUrls[index]);
        });

        // Append the predefined caption
        updatedCaption += predefinedCaption;

        bot.sendPhoto(chatId, response.data, { caption: updatedCaption });
      } catch (error) {
        console.error('Shorten URL Error:', error);
        bot.sendMessage(chatId, 'An error occurred while shortening the URLs. Please check your API token and try again.');
      }
    } else {
      // Append the predefined caption
      caption += predefinedCaption;

      bot.sendPhoto(chatId, response.data, { caption });
    }
  } catch (error) {
    console.error('Download Image Error:', error);
    bot.sendMessage(chatId, 'An error occurred while downloading the image.');
  }
}

// Function to shorten a single URL
async function shortenUrl(url) {
  try {
    const apiUrl = `https://teraboxurl.buzz/api?api=957647632ddfbadaa5017c417196bb85b69449e4&url=${url}`;
    const response = await axios.get(apiUrl);
    return response.data.shortenedUrl;
  } catch (error) {
    console.error('Shorten URL Error:', error);
    // Return original URL in case of error
    return url;
  }
}

// Dummy function to simulate saving user's MyBios API token
function saveUserToken(chatId, token) {
  // Implement your own logic to save the token (e.g., to a database)
  console.log(`Saved token for chatId ${chatId}: ${token}`);
}
