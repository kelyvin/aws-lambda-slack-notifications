module.exports = (snsMessage, timestamp) => {
  const region = snsMessage.TopicArn.split(':')[3];
  const subject = snsMessage.Subject;
  const alarmName = snsMessage.AlarmName;
  const newState = snsMessage.NewStateValue;
  const alarmDescription = snsMessage.AlarmDescription;
  const alarmReason = snsMessage.NewStateReason;
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

  return {
    text: `*${subject}*`,
    attachments: [{
      'color': color,
      'fields': [{
        'title': 'Alarm Name',
        'value': alarmName,
        'short': true
      },
      {
        'title': 'Current State',
        'value': newState,
        'short': true
      },
      {
        'title': 'Alarm Description',
        'value': alarmDescription,
        'short': false
      },
      {
        'title': 'Link to Alarm',
        'value': `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:alarmFilter=ANYname=${encodeURIComponent(alarmName)}`,
        'short': false
      }
      ],
      'ts': timestamp
    }]
  };
};

