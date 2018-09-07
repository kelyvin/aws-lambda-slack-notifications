# aws-lambda-slack-notifications
Slack notifications on AWS Lambda, SNS, and Cloudwatch

## Overview
**NOTE:**: This is still in beta and being actively developed, use at your own risk.

This project is an extension from the original [AWS blueprint named cloudwatch-alarm-to-slack](https://aws.amazon.com/blogs/aws/new-slack-integration-blueprints-for-aws-lambda/) and effectively adds better formatting options to slack.

![Slack Notification Image](https://i.imgur.com/YmrrSah.png)

## Setup

I will eventually write more about this, but you can simply extract this as a zip and upload it to AWS lambda for now.

## Supported Handlers
The following is a list of all supported slack notifications (with formatted alerts)

- [x] ECS Task State Change
- [x] Cloudwatch Alert Monitoring


## TODO:
- [ ] Add build job that will auto package and upload to s3 and update the lambda function directly
- [ ] Improve README
