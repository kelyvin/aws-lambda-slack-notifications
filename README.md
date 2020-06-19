# aws-lambda-slack-notifications
Slack notifications through AWS Lambda + SNS

Originally forked from the project [AWS blueprint named cloudwatch-alarm-to-slack](https://aws.amazon.com/blogs/aws/new-slack-integration-blueprints-for-aws-lambda/), this has since been expanded upon to support a variety of different SNS triggers to properly format various sources.

![Slack Notification Image](https://i.imgur.com/YmrrSah.png)

## Supported sources
We currently support the following event to produce unique, prettified messages:

- Cloudwatch alerts
- Cloudwatch scheduled events
- ECS task changes

All other events will be directed through our default message handler. You can refer to the `/handlers` directory to see how we parse through each one and go through the `/examples` directory for sample data formats.

## Setup Instructions

1. Packaging for Lambda. Run the following command and upload the generated zip file into the appropriate lambda function:
```bash
# zip up all the relevant files required for AWS lambda into the `dist` directory
`npm run package`
```

2. Configure the environment variables with the fields necessary (refer to the next section below)
3. Set up an SNS topic and have your lambda function subscribe to it
4. Wherever you decide to setup events (e.g. Cloudwatch rules or alerts), specify your created SNS topic as a triggered event. This will automatically send the event data through SNS and into the lambda function to be interpretted.

## Configuring webhook in Slack

Follow these steps to configure the webhook in Slack:
1. Navigate to https://<your-team-domain>.slack.com/services/new
2. Search for and select "Incoming WebHooks".
3. Choose the default channel where messages will be sent and click "Add Incoming WebHooks ntegration".
4. Copy the webhook URL from the setup instructions and use it in the next section.

## Encrypt your secrets (optional)
1. Create or use an existing KMS Key by following the provided [documentation](http://docs.aws.amazon.com/kms/latest/developerguide/reate-keys.html)
2. Click the "Enable Encryption Helpers" checkbox
3. Paste <SLACK_HOOK_URL> into the kmsEncryptedHookUrl environment variable and click encrypt
> Note: You must exclude the protocol from the URL (e.g. "hooks.slack.com/services/abc123").

4. Give your function's role permission for the kms:Decrypt action. See example below:

```json
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
```

## Cloudwatch scheduled events
You may choose to set up a scheduled cloudwatch rule to automatically trigger lambda functions and set up a SNS notification. This function will also parse a custom `details` object that you provide to your custom rule. It will parse for the following fields:

```
{
  name: 'My Lambda Function',
  env: 'production',
  lambdaFuncName: 'lambda-func-name',
  logGroup: 'lambda/loggroup/name'
}
```

To set this custom details field, in your cloudwatch event rules, when you set the target for **SNS topic**, use *Input Transformer* as the configured input. Then provide those fields into the details like so:

Input Path:
```
{"detailType":"$.detail-type","resources":"$.resources","id":"$.id","source":"$.source","time":"$.time","region":"$.region"}
```

Input Template:
```
{ "id": <id>, "source": <source>, "detail-type": <detailType>, "time": <time>, "resources": <resources>, "region": <region>, "detail": { "name": "My Lambda Function", "env": "production", "lambdaFuncName": "lambda-func-name", "logGroup": "lambda/loggroup/name" } }
```
