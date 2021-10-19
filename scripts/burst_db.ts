import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "dotenv";
config();

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const QUEUE_URL = process.env.QUEUE_URL;
const tableName = process.env.TABLE_NAME;

/**
 * This function will send N~ update requests to dynamo and attempt to
 * increment the `count` attribute on a single partition key.
 *
 * If 20,000 requests are sent, the expected outcome is that
 * the count will be 20,000, representing the 20,000 successful operations.
 *
 * But in reality, count ends up being around 19,972 due to throttling.
 *
 * This is known as a "hot partition".
 * @see https://aws.amazon.com/premiumsupport/knowledge-center/dynamodb-table-throttled/
 */
const main = async () => {
  let count: number | string = process.argv[2];
  if (!count || typeof parseInt(count) !== "number") {
    console.warn("Provide a number");
    process.exit(1);
  }
  count = parseInt(count);

  console.log(`Sending ${count} operations to DDB...`);

  let errorCount = 0;

  try {
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: { pk: "hot-parition" },
      UpdateExpression: "SET #count = if_not_exists(#count, :zero) + :incr",
      ExpressionAttributeNames: { "#count": "count" },
      ExpressionAttributeValues: { ":incr": 1, ":zero": 0 },
    });

    const proms = Array(count)
      .fill(null)
      .map(() =>
        docClient.send(updateCommand).catch((e) => {
          errorCount += 1;
        })
      );

    await Promise.all(proms);
  } catch (err) {
    console.log(err);
  } finally {
    console.log("Exiting....");
    console.log("Error Count:", errorCount);
  }
};

main();
