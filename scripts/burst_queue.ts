import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { config } from "dotenv";
config();

const client = new SQSClient({});

const queueURL = process.env.QUEUE_URL;

/**
 * This function will send N~ messages to SQS
 */
const main = async () => {
  let count: number | string = process.argv[2];
  if (!count || typeof parseInt(count) !== "number") {
    console.warn("Provide a number");
    process.exit(1);
  }
  count = parseInt(count);

  console.log(`Sending ${count} operations to SQS...`);

  const errors: Error[] = [];

  try {
    const sendMessageCommand = new SendMessageCommand({
      MessageBody: JSON.stringify({ date: new Date().toISOString() }),
      QueueUrl: queueURL,
    });

    const proms = Array(count)
      .fill(null)
      .map((e) => client.send(sendMessageCommand).catch((e) => errors.push(e)));

    await Promise.all(proms);
  } catch (err) {
    console.log(err);
  } finally {
    console.log("Exiting....");
    console.log(`Errors (${errors.length})`, errors);
  }
};

main();
