module.exports = (snsMessage, timestamp) => {
  const { region, detail } = snsMessage
  const subject = snsMessage['detail-type']
  const clusterName = detail.clusterArn.split('/').pop()  // arn:aws:ecs:us-west-2:example:cluster/example-cluster
  const serviceName = detail.group.split(":").pop()  // service:example-service
  const task = detail.taskArn.split("/").pop()
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
          'title': 'Task',
          'value': task,
          'short': false
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
