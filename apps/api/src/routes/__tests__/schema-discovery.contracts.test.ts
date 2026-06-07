import { createSchemaRouter, toMongoConnectionErrorCategory, toMongoConnectionErrorMessage } from "../schema";

void createSchemaRouter;

const invalidFormatCategory = toMongoConnectionErrorCategory(
  new Error("Invalid connection string: mongodb://user:pass@example.test/shop")
);
const authCategory = toMongoConnectionErrorCategory(
  Object.assign(new Error("Authentication failed for mongodb://example.test/shop"), {
    code: 18
  })
);
const timeoutMessage = toMongoConnectionErrorMessage("timeout");

void invalidFormatCategory;
void authCategory;
void timeoutMessage;
