/* eslint-disable no-useless-catch */
/* eslint-disable no-fallthrough */
/* eslint-disable arrow-parens */

const { v4: uuidv4 } = require('uuid');
const model = require('../../model');
const logger = require('../../utils/logger');
const strings = require('../strings');
const { botConfig } = require('../../config');
const { Text } = require('../../utils/message-types');
const registrationService = require('../../registration/service');
const PersistentMenuService = require('../../persistent-menu/services');
const { insertRegisteredUser} = require('../../utils/stats-api');
const {
  invalidWebMessageButtons, invalidWebViewMoreMessageButtons,
} = require('../../utils/message-samples');
const { getUserMessage } = require('../../utils/swiftchat-helpers');
const fetchQuizQuestions = require('../../utils/fetch-quiz'); // Add this import at the top
// const { fetchQuizQuestions } = require('../../utils/fetch-quiz');

const klusterWebhook = async (userMobile, userMessage, messageType, messageBody) => {
  const waNumber = null;
  const responseMessage = [];
  try {
    let userContext = await model.getUserContext(userMobile);
    let userMedium;
    if (userContext === null) {
      insertRegisteredUser(userMobile);
      userContext = { stepName: 'entryPoint', stepData: {} };
      userMedium = botConfig.medium;
    } else if (!userContext.userMedium) {
      userMedium = botConfig.medium;
    } else {
      userMedium = userContext.userMedium;
    }
    logger.debug(
      `SwiftChat Message Received - From: ${userMobile}, Message: ${userMessage}`
    );
    if (messageType === null) {
      responseMessage.push(new Text(strings[userMedium].typeExceptionMessage));
      model.sendMessage(waNumber, userMobile, responseMessage).catch((err) =>
        logger.error('Send Message Failure ', {
          waNumber,
          userMobile,
          responseMessage,
          err: model.constructError(err),
        })
      );
      return;
    }
    const lockId = uuidv4();
    const isLockAvailable = await model.getMessageLock(userMobile, lockId);
    if (!isLockAvailable) {
      logger.info({ userMobile, message: 'SwiftChat Message Rejected' });
      responseMessage.push(new Text(strings[userMedium].redisLockMessage));
      model.sendMessage(waNumber, userMobile, responseMessage).catch((err) =>
        logger.error('Send Message Failure ', {
          waNumber,
          userMobile,
          responseMessage,
          err: model.constructError(err),
        })
      );
      return;
    }

    const isUserValidationLocked = await model.isUserValidationLocked(userMobile);
    if (isUserValidationLocked) {
      let response = []
      logger.info({ userMobile, message: 'Message Rejected (Pending Response for previous query)' });
      await model.releaseMessageLock(userMobile, lockId);
      response.push(new Text(strings[userMedium].userValidationLockMessage));
      model.sendMessage(waNumber, userMobile, response).catch(err => logger.error('Send Message Failure ', {
        waNumber, userMobile, responseMessage, err: model.constructError(err),
      }));
      return;
    }

    if (userMessage === 'user reset') {
      await model.updateUserContext(userMobile, {
        stepName: 'entryPoint',
        stepData: {},
      });
      await model.releaseMessageLock(userMobile, lockId);
      responseMessage.push(new Text(strings[userMedium].unregisterMessage));
      model.sendMessage(waNumber, userMobile, responseMessage).catch((err) =>
        logger.error('Send Message Failure ', {
          waNumber,
          userMobile,
          responseMessage,
          err: model.constructError(err),
        })
      );
      return;
    }

    // Add this block before checking userContext.stepName
    if (userMessage && userMessage.trim().toLowerCase() === 'start quiz') {
      await model.updateUserContext(userMobile, {
        stepName: 'awaitCategoryDifficulty',
        stepData: {},
        userMedium,
      });
      responseMessage.push(
        new Text('Please enter the quiz category and difficulty in the format: <category>, <difficulty>. Example: 21, easy')
      );
      await model.sendMessage(waNumber, userMobile, responseMessage);
      await model.releaseMessageLock(userMobile, lockId);
      return;
    }

    let isPersistentMenu = messageType === 'persistent_menu_response';
    if (userContext.stepName === 'entryPoint' && isPersistentMenu) {
      isPersistentMenu = false;
    }
    if (isPersistentMenu) {
      await PersistentMenuService.processMessage(
        waNumber,
        userMobile,
        userMessage,
        userContext,
        userMedium
      );
      return await model.releaseMessageLock(userMobile, lockId);
    }

    if (userContext.stepName === 'awaitViewMessageTypes' && !userContext.stepData.firstTime) {
      userMessage = await getUserMessage(messageType, messageBody, [...invalidWebMessageButtons, ...invalidWebViewMoreMessageButtons]);
    }
    
    if (userContext.stepName === 'awaitCategoryDifficulty') {
      try {
        // Parse user input for category and difficulty
        const [category, difficulty] = userMessage.split(',').map(s => s.trim());
        if (!category || !difficulty) {
          responseMessage.push(new Text('Please reply in the format: <category>, <difficulty>. Example: 21, easy'));
          await model.sendMessage(waNumber, userMobile, responseMessage);
          await model.releaseMessageLock(userMobile, lockId);
          return;
        }
        const quizData = await fetchQuizQuestions(category, difficulty);
        if (quizData.results && quizData.results.length > 0) {
          // Store quiz state
          await model.updateUserContext(userMobile, {
            stepName: 'awaitQuizAnswer',
            stepData: {
              quiz: quizData.results,
              current: 0,
              score: 0,
            },
            userMedium,
          });
          // Prepare options as buttons
          const q = quizData.results[0];
          const options = [...q.incorrect_answers, q.correct_answer]
            .sort(() => Math.random() - 0.5);
          const buttons = options.map((opt, i) => ({
            type: 'solid',
            body: `${String.fromCharCode(65 + i)}) ${opt}`,
            reply: `${String.fromCharCode(65 + i)}`,
          }));
          responseMessage.push(
            new (require('../../utils/message-types').Button)(
              new Text(`Q1: ${q.question}`),
              buttons
            )
          );
        } else {
          responseMessage.push(new Text('No questions found for this category and difficulty.'));
        }
        await model.sendMessage(waNumber, userMobile, responseMessage);
      } catch (error) {
        logger.error('Quiz fetch error', error);
        responseMessage.push(new Text('Failed to fetch quiz questions. Please try again later.'));
        await model.sendMessage(waNumber, userMobile, responseMessage);
      }
      await model.releaseMessageLock(userMobile, lockId);
      return;
    }

    if (userContext.stepName === 'awaitQuizAnswer') {
      try {
        const { quiz, current, score } = userContext.stepData;
        const q = quiz[current];
        const correct = q.correct_answer;
        const options = [...q.incorrect_answers, q.correct_answer].sort();
        let userAns = userMessage.trim().toUpperCase();
        // let idx = userAns.charCodeAt(0) - 65;
        let idx = userAns-1;
        let isCorrect = options[idx] && options[idx] === correct;
        console.log("Correct answer:", correct);
        console.log("value of current:", current);
        console.log("Step Data:", userContext.stepData);
        console.log("Options:", options);
        console.log("User answer index:", idx);
        console.log("User answer option:", options[idx]);
        console.log("User answer:", userAns);
        let newScore = score + (isCorrect ? 1 : 0);
        let reply = isCorrect ? '✅ Correct!' : `❌ Wrong! Correct answer: ${correct}`;
        responseMessage.push(new Text(reply));
        // Next question or finish
        if (current + 1 < quiz.length) {
          const nextQ = quiz[current + 1];
          const nextOptions = [...nextQ.incorrect_answers, nextQ.correct_answer]
            .sort(() => Math.random() - 0.5);
          const buttons = nextOptions.map((opt, i) => ({
            type: 'solid',
            body: `${String.fromCharCode(65 + i)}) ${opt}`,
            reply: `${String.fromCharCode(65 + i)}`,
          }));
          responseMessage.push(
            new (require('../../utils/message-types').Button)(
              new Text(`Q${current + 2}: ${nextQ.question}`),
              buttons
            )
          );
          await model.updateUserContext(userMobile, {
            stepName: 'awaitQuizAnswer',
            stepData: { quiz, current: current + 1, score: newScore },
            userMedium,
          });
        } else {
          // Show score as a rich message (ScoreCard)
          // const { ScoreCard } = require('../../utils/message-types');
          // responseMessage.push(
          //   new ScoreCard({
          //     performance: newScore === quiz.length ? 'high' : 'medium',
          //     text1: 'Quiz Complete!',
          //     text2: `Your score: ${newScore}/${quiz.length}`,
          //     score: `${Math.round((newScore / quiz.length) * 100)}`,
          //   }, 'Share your score!')
          // );
          // Add a message for total correct score
          responseMessage.push(
            new Text(`You answered ${newScore} out of ${quiz.length} questions correctly!`)
          );
          responseMessage.push(
            new Text(
              `Quiz Complete!\nYour score: ${newScore}/${quiz.length}\nYou answered ${newScore} out of ${quiz.length} questions correctly!`
            )
          );
          await model.updateUserContext(userMobile, {
            stepName: 'entryPoint',
            stepData: {},
            userMedium,
          });
        }
        await model.sendMessage(waNumber, userMobile, responseMessage);
      } catch (error) {
        logger.error('Quiz answer error', error);
        responseMessage.push(new Text('Something went wrong. Please try again.'));
        await model.sendMessage(waNumber, userMobile, responseMessage);
      }
      await model.releaseMessageLock(userMobile, lockId);
      return;
    }

    switch (userContext.stepName) {
      case 'entryPoint':
      case 'awaitMedium':
      case 'awaitNext':
      case 'awaitName':
      case 'awaitViewMessageTypes':
        await registrationService.processMessage(
          waNumber,
          userMobile,
          userMessage,
          userContext,
          userMedium,
        );
        break;
      default: break;
    }
    return await model.releaseMessageLock(userMobile, lockId);
  } catch (e) {
    throw e;
  }
};

module.exports = {
  klusterWebhook,
  fetchQuizQuestions,
};
