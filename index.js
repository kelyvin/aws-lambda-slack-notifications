'use strict';

/**
 * Follow these steps to configure the webhook in Slack:
 *
 *   1. Navigate to https://<your-team-domain>.slack.com/services/new
 *
 *   2. Search for and select "Incoming WebHooks".
 *
 *   3. Choose the default channel where messages will be sent and click "Add Incoming WebHooks Integration".
 *
 *   4. Copy the webhook URL from the setup instructions and use it in the next section.
 *
 *
 * To encrypt your secrets use the following steps:
 *
 *  1. Create or use an existing KMS Key - http://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html
 *
 *  2. Click the "Enable Encryption Helpers" checkbox
 *
 *  3. Paste <SLACK_HOOK_URL> into the kmsEncryptedHookUrl environment variable and click encrypt
 *
 *  Note: You must exclude the protocol from the URL (e.g. "hooks.slack.com/services/abc123").
 *
 *  4. Give your function's role permission for the kms:Decrypt action.
 *      Example:

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1443036478000",
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": [
                "<your KMS key ARN>"
            ]
        }
    ]
}

 */

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

// The base-64 encoded, encrypted key (CiphertextBlob) stored in the kmsEncryptedHookUrl environment variable
const kmsEncryptedHookUrl = process.env.kmsEncryptedHookUrl;
// If you don't want to encrypt your hook url, use this instead
const unencryptedHookUrl = process.env.unencryptedHookUrl;
// The Slack channel to send a message to stored in the slackChannel environment variable
const slackChannel = process.env.slackChannel;
let hookUrl;

const CLOUDWATCH_NOTIFICATIONS = 'CloudWatchNotifications';
const ECS_NOTIFICATIONS = 'ecs';
const DEFAULT_SLACK_MSG = {
  channel: slackChannel
};

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

function handleEcsTaskNotification (event) {
  const record = event.Records[0];
  const timestamp = (new Date(record.Sns.Timestamp)).getTime() / 1000;
  const message = JSON.parse(record.Sns.Message);
  const subject = message['detail-type'];
  const region = message.region;
  const detail = message.detail;
  const clusterName = detail.clusterArn.split('/').pop();  // arn:aws:ecs:us-west-2:example:cluster/example-cluster
  const serviceName = detail.group.split(":").pop();  // service:example-service
  const taskDefinition = detail.taskDefinitionArn.split("/").pop();
  const status = detail.lastStatus;
  const startedBy = detail.startedBy;
  const link = `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/clusters/${clusterName}/services/${serviceName}/tasks`;

  let color = 'warning';

  switch (status) {
    case 'STOPPED':
      color = 'danger';
      break;
    case 'RUNNING':
      color = 'good';
      break;
    case 'PENDING':
    default:
      color = 'warning';
  }

  const slackMessage = {
    text: `*${subject}*`,
    attachments: [{
      'color': color,
      'fields': [{
          'title': 'Cluster',
          'value': clusterName,
          'short': true
        },
        {
          'title': 'Service',
          'value': serviceName,
          'short': true
        },
        {
          'title': 'Task Definition',
          'value': taskDefinition,
          'short': true
        },
        {
          'title': 'Status',
          'value': status,
          'short': true
        },
        {
          'title': 'Started By',
          'value': startedBy,
          'short': true
        },
        {
          'title': 'Link to Task',
          'value': link,
          'short': false
        }
      ],
      'ts': timestamp
    }]
  };

  return {
    ...DEFAULT_SLACK_MSG,
    ...slackMessage
  };
}

function handleCloudWatch (event) {
  const timestamp = (new Date(event.Records[0].Sns.Timestamp)).getTime() / 1000;
  const message = JSON.parse(event.Records[0].Sns.Message);
  const region = event.Records[0].EventSubscriptionArn.split(":")[3];
  const subject = 'AWS CloudWatch Notification';
  const alarmName = message.AlarmName;
  const metricName = message.Trigger.MetricName;
  const oldState = message.OldStateValue;
  const newState = message.NewStateValue;
  const alarmDescription = message.AlarmDescription;
  const alarmReason = message.NewStateReason;
  const trigger = message.Trigger;
  let color = 'warning';

  switch (newState) {
    case 'ALARM':
      color = 'danger';
      break;
    case 'OK':
      color = 'good';
      break;
    default:
      color = 'warning';
  }

  const slackMessage = {
    text: `*${subject}*`,
    attachments: [{
      'color': color,
      'fields': [{
          'title': 'Alarm Name',
          'value': alarmName,
          'short': true
        },
        {
          'title': 'Alarm Description',
          'value': alarmDescription,
          'short': false
        },
        {
          'title': 'Alarm Reason',
          'value': alarmReason,
          'short': false
        },
        {
          'title': 'Trigger',
          'value': `${trigger.Statistic} ${metricName} ${trigger.ComparisonOperator} ${trigger.Threshold} for ${trigger.EvaluationPeriods} period(s) of ${trigger.Period} seconds.`,
          'short': false
        },
        {
          'title': 'Old State',
          'value': oldState,
          'short': true
        },
        {
          'title': 'Current State',
          'value': newState,
          'short': true
        },
        {
          'title': 'Link to Alarm',
          'value': `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:alarmFilter=ANY;name=${encodeURIComponent(alarmName)}`,
          'short': false
        }
      ],
      'ts': timestamp
    }]
  };

  return {
    ...DEFAULT_SLACK_MSG,
    ...slackMessage
  };
}

function handleCatchAll (event) {
  const record = event.Records[0];
  const subject = record.Sns.Subject;
  const timestamp = new Date(record.Sns.Timestamp).getTime() / 1000;
  const message = record.Sns.Message;
  const newState = message.NewStateValue;
  let color = 'warning';

  switch (newState) {
    case 'ALARM':
      color = 'danger';
      break;
    case 'OK':
      color = 'good';
      break;
    default:
      color = 'warning';
  }

  // Add all of the values from the event message to the Slack message description
  let description = '';

  for (let key in message) {
    let renderedMessage = typeof message[key] === 'object' ?
      JSON.stringify(message[key]) :
      message[key];

    description = `${description}\n${key}: ${renderedMessage}`;
  }

  const slackMessage = {
    text: `*${subject}*`,
    attachments: [{
      'color': color,
      'fields': [{
          'title': 'Message',
          'value': subject,
          'short': false
        },
        {
          'title': 'Description',
          'value': description,
          'short': false
        }
      ],
      'ts': timestamp
    }]
  };

  return {
    ...DEFAULT_SLACK_MSG,
    ...slackMessage
  };
}


function processEvent(event, callback) {
  const eventSubscriptionArn = event.Records[0].EventSubscriptionArn;
  const eventSnsSubject = event.Records[0].Sns.Subject || 'no subject';
  const eventSnsTopicArn = event.Records[0].Sns.TopicArn;
  const eventSnsMessage = event.Records[0].Sns.Message;

  let slackMessage = null;

  if (eventSubscriptionArn.indexOf(CLOUDWATCH_NOTIFICATIONS) > -1 || eventSnsSubject.indexOf(CLOUDWATCH_NOTIFICATIONS) > -1 || eventSnsMessage.indexOf(CLOUDWATCH_NOTIFICATIONS) > -1) {
    console.log('Processing cloudwatch notification');
    slackMessage = handleCloudWatch(event);
  } else if (eventSubscriptionArn.indexOf(ECS_NOTIFICATIONS) > -1 || eventSnsTopicArn.indexOf(ECS_NOTIFICATIONS) > -1 || eventSnsMessage.indexOf(ECS_NOTIFICATIONS) > -1) {
    slackMessage = handleEcsTaskNotification(event);
  } else {
    slackMessage = handleCatchAll(event);
  }

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
    // Container reuse, simply process the event with the key in memory
    processEvent(event, callback);
  } else if (unencryptedHookUrl) {
    hookUrl = unencryptedHookUrl;
    processEvent(event, callback);
  } else if (kmsEncryptedHookUrl && kmsEncryptedHookUrl !== '<kmsEncryptedHookUrl>') {
    const encryptedBuf = new Buffer(kmsEncryptedHookUrl, 'base64');
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
