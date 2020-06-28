/**
 * Lambda function that will send a slack notification to the provided slack channel
 *
 * Author: Kelvin Nguyen
 */

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

const notificationSources = require('./configs/notificationSources');
const cloudwatchAlertHandler = require('./handlers/cloudwatchAlertHandler');
const scheduledEventHandler = require('./handlers/scheduledEventHandler');
const ecsTaskHandler = require('./handlers/ecsTaskHandler');
const defaultHandler = require('./handlers/defaultHandler');

// The base-64 encoded, encrypted key (CiphertextBlob) stored in the kmsEncryptedHookUrl environment variable
const kmsEncryptedHookUrl = process.env.kmsEncryptedHookUrl;
// If you don't want to encrypt your hook url, use this instead
const unencryptedHookUrl = process.env.unencryptedHookUrl;
// The Slack channel to send a message to stored in the slackChannel environment variable
const slackChannel = process.env.slackChannel;
let hookUrl = '';

const DEFAULT_SLACK_MSG = {
  channel: slackChannel
};
const CLOUDWATCH_ALARM = 'CLOUDWATCH_ALARM';

function postMessage(message, callback) {
  const body = JSON.stringify(message);
  const options = url.parse(hookUrl);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };

  const postReq = https.request(options, (res) => {
    const chunks = [];
    res.setEncoding('utf8');
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      if (callback) {
        callback({
          body: chunks.join(''),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
        });
      }
    });
    return res;
  });

  postReq.write(body);
  postReq.end();
}

function createSlackMessage (event) {
  const record = event.Records[0];
  console.info('SNS Event Data', JSON.stringify(record, null, 2));

  // The message always comes in as a JSON string
  const timestamp = (new Date(record.Sns.Timestamp)).getTime() / 1000;
  const snsMessage = JSON.parse(record.Sns.Message);
  const snsSubject = record.Sns.Subject || '';

  // Checks if the event source is a cloudwatch alarm. If not, not, then default to interpretting the snsMessage source
  const eventSource = (snsSubject.indexOf(CLOUDWATCH_ALARM) > -1) ? CLOUDWATCH_ALARM : snsMessage['source'];

  let slackMessage = null;

  switch (eventSource) {
  case notificationSources.ECS:
    console.log('Processing ecs event');
    slackMessage = ecsTaskHandler(snsMessage, timestamp);
    break;
  case notificationSources.SCHEDULED_EVENT:
    console.log('Processing scheduled event');
    slackMessage = scheduledEventHandler(snsMessage, timestamp);
    break;
  case ALARM_SOURCE:
    console.log('Processing cloudwatch alarm event');
    slackMessage = cloudwatchAlertHandler(snsMessage, timestamp);
    break;
  default:
    console.log('Processing default message event');
    slackMessage = defaultHandler(event, timestamp);
  }

  return {
    ...DEFAULT_SLACK_MSG,
    ...slackMessage
  };
}

function processEvent(event, callback) {
  const slackMessage = createSlackMessage(event);

  postMessage(slackMessage, (response) => {
    if (response.statusCode < 400) {
      console.info('Message posted successfully');
      callback(null);
    } else if (response.statusCode < 500) {
      console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
      callback(null); // Don't retry because the error is due to a problem with the request
    } else {
      // Let Lambda retry
      callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
    }
  });
}


exports.handler = (event, context, callback) => {
  if (hookUrl) {
    processEvent(event, callback);
  } else if (unencryptedHookUrl) {
    hookUrl = unencryptedHookUrl;
    processEvent(event, callback);
  } else if (kmsEncryptedHookUrl && kmsEncryptedHookUrl !== '<kmsEncryptedHookUrl>') {
    const encryptedBuf = Buffer.from(kmsEncryptedHookUrl, 'base64');
    const cipherText = {
      CiphertextBlob: encryptedBuf
    };

    const kms = new AWS.KMS();
    kms.decrypt(cipherText, (err, data) => {
      if (err) {
        console.log('Decrypt error:', err);
        return callback(err);
      }
      hookUrl = `https://${data.Plaintext.toString('ascii')}`;
      processEvent(event, callback);
    });
  } else {
    callback('Hook URL has not been set.');
  }
};
