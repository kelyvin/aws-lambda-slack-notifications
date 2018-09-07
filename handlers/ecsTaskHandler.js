module.exports = (event) => {
  const record = event.Records[0]
  const timestamp = (new Date(record.Sns.Timestamp)).getTime() / 1000
  const message = JSON.parse(record.Sns.Message)
  const subject = message['detail-type']
  const region = message.region
  const detail = message.detail
  const clusterName = detail.clusterArn.split('/').pop()  // arn:aws:ecs:us-west-2:example:cluster/example-cluster
  const serviceName = detail.group.split(":").pop()  // service:example-service
  const taskDefinition = detail.taskDefinitionArn.split("/").pop()
  const status = detail.lastStatus
  const startedBy = detail.startedBy
  const link = `https://${region}.console.aws.amazon.com/ecs/home?region=${region}#/clusters/${clusterName}/services/${serviceName}/tasks`

  let color = 'warning'

  switch (status) {
    case 'STOPPED':
      color = 'danger'
      break
    case 'RUNNING':
      color = 'good'
      break
    case 'PENDING':
    default:
      color = 'warning'
  }

  return {
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
  }
}
