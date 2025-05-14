const axios = require('axios');

/**
 * Fetch quiz questions from OpenTDB based on category and difficulty.
 * @param {string} reply - Example: '21, easy'
 * @returns {Promise<Object>} - The API response data
 */
async function fetchQuizQuestions(reply) {
  const [category, difficulty] = reply.replace(/\s/g, '').split(',');
  const url = `https://opentdb.com/api.php?amount=10&category=${category}&difficulty=easy&type=multiple`;
  console.log('Quiz API Request URL:', url); // Log the request URL
  const response = await axios.get(url);
  return response.data;
}

module.exports = fetchQuizQuestions;
