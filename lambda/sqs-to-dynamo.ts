import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import type { SQSHandler } from "aws-lambda";

const ddbClient = new DynamoDBClient({ maxAttempts: 3 });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const tableName = process.env.TABLE_NAME;

export const handler: SQSHandler = async (event) => {
  /* Batched update to up to 10 partition keys */

  // /* ######################################### */
  // const batchWriteCommand = new TransactWriteCommand({
  //   TransactItems: event.Records.map((_, i) => {
  //     return {
  //       TableName: tableName,
  //       Key: { pk: `${i}`.padStart(3, "0") },
  //       UpdateExpression: "SET #count = if_not_exists(#count, :zero) + :incr",
  //       ExpressionAttributeNames: { "#count": "count" },
  //       ExpressionAttributeValues: { ":incr": 1, ":zero": 0 },
  //     };
  //   }),
  // });
  // await docClient.send(batchWriteCommand);
  // /* ######################################### */

  /* Sequential updates to 1 partition key */
  /* ##################################### */
  for (const _ of event.Records) {
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { pk: "sqs-partition" },
      UpdateExpression: "SET #count = if_not_exists(#count, :zero) + :incr",
      ExpressionAttributeNames: { "#count": "count" },
      ExpressionAttributeValues: { ":incr": 1, ":zero": 0 },
    });
    await docClient.send(updateCommand);
  }
  /* ##################################### */
};
