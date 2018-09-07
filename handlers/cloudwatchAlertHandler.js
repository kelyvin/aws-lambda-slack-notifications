module.exports = (event) => {
  const timestamp = (new Date(event.Records[0].Sns.Timestamp)).getTime() / 1000
  const message = JSON.parse(event.Records[0].Sns.Message)
  const region = event.Records[0].EventSubscriptionArn.split(":")[3]
  const subject = 'AWS CloudWatch Notification'
  const alarmName = message.AlarmName
  const metricName = message.Trigger.MetricName
  const oldState = message.OldStateValue
  const newState = message.NewStateValue
  const alarmDescription = message.AlarmDescription
  const alarmReason = message.NewStateReason
  const trigger = message.Trigger
  let color = 'warning'

  switch (newState) {
    case 'ALARM':
      color = 'danger'
      break
    case 'OK':
      color = 'good'
      break
    default:
      color = 'warning'
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
          'value': `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:alarmFilter=ANYname=${encodeURIComponent(alarmName)}`,
          'short': false
        }
      ],
      'ts': timestamp
    }]
  }
}

