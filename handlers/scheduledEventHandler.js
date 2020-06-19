module.exports = (snsMessage, timestamp) => {
  const { resources, region, detail } = snsMessage
  const subject = snsMessage['detail-type']
  const eventArn = (resources.length > 0) ? resources[0] : ''
  const ruleName = eventArn.split('/').pop
  let color = 'good'

  if (Object.keys(detail).length === 0) {
    return {
      text: `*${subject}*`,
      attachments: [{
        'color': color,
        'fields': [{
          'title': 'Cloudwatch Rule',
          'value': ruleName,
          'short': true
        }],
        'ts': timestamp
      }]
    }
  }

  const { name = '', env = '', lambdaFuncName = ''. logGroup = '' } = detail
  const link = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${logGroup}`

  return {
    text: `*${subject}*`,
    attachments: [{
      'color': color,
      'fields': [{
        'title': 'Event Name',
        'value': name,
        'short': true
      }, {
        'title': 'Environment',
        'value': env,
        'short': true
      }, {
        'title': 'Lambda Function',
        'value': lambdaFuncName,
        'short': true
      }, {
        'title': 'Clouldwatch Rule',
        'value': ruleName,
        'short': true
      }, {
        'title': 'Log group',
        'value': link,
        'short': false
      }],
      'ts': timestamp
    }]
  }

}

