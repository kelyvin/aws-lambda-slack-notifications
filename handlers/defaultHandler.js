module.exports = (event) => {
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

  return {
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
}
