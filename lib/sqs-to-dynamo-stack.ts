import * as cdk from "@aws-cdk/core";
import * as dynamo from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJs from "@aws-cdk/aws-lambda-nodejs";
import * as sqs from "@aws-cdk/aws-sqs";
import { SqsEventSource } from "@aws-cdk/aws-lambda-event-sources";

import * as path from "path";

export class SqsToDynamoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamo.Table(this, "Table", {
      partitionKey: {
        name: "pk",
        type: dynamo.AttributeType.STRING,
      },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const dlQueue = new sqs.Queue(this, "DlQueue", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const queue = new sqs.Queue(this, "Queue", {
      deadLetterQueue: { queue: dlQueue, maxReceiveCount: 3 },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deliveryDelay: cdk.Duration.seconds(1),
    });

    // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-event-sources-readme.html
    const fn = new lambdaNodeJs.NodejsFunction(this, "SqsConsumer", {
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, "../lambda/sqs-to-dynamo.ts"),
      handler: "handler",
      deadLetterQueueEnabled: true,
      deadLetterQueue: dlQueue,
      memorySize: 1024,
      environment: {
        TABLE_NAME: table.tableName,
        QUEUE_URL: queue.queueUrl,
        DL_QUEUE_URL: dlQueue.queueUrl,
      },
    });

    const eventSource = new SqsEventSource(queue);

    fn.addEventSource(eventSource);

    queue.grantConsumeMessages(fn);
    table.grantReadWriteData(fn);

    new cdk.CfnOutput(this, "QUEUE_NAME", { value: queue.queueName });
    new cdk.CfnOutput(this, "QUEUE_URL", { value: queue.queueUrl });

    new cdk.CfnOutput(this, "DL_QUEUE_NAME", { value: dlQueue.queueName });
    new cdk.CfnOutput(this, "DL_QUEUE_URL", { value: dlQueue.queueUrl });

    new cdk.CfnOutput(this, "TABLE_NAME", { value: table.tableName });
    new cdk.CfnOutput(this, "FUNCTION_NAME", { value: fn.functionName });

    new cdk.CfnOutput(this, "EVENT_SOURCE_MAPPING_ID", { value: eventSource.eventSourceMappingId });
  }
}
