import { RollbackSeedBatchError } from "@testseed/core";
import { createRollbackRouter, rollbackSchema, toRollbackHttpStatus } from "../rollback";

void createRollbackRouter;

const parsedRollbackBody = rollbackSchema.parse({
  seedBatchId: "11111111-1111-4111-8111-111111111111",
  mongoUri: "mongodb://user:secret@example.test/app"
});

const invalidSeedBatchIdStatus = toRollbackHttpStatus(
  new RollbackSeedBatchError({
    code: "ROLLBACK_SEED_BATCH_ID_INVALID",
    message: "seedBatchId is invalid."
  })
);

const notFoundStatus = toRollbackHttpStatus(
  new RollbackSeedBatchError({
    code: "ROLLBACK_BATCH_NOT_FOUND",
    message: "Seed batch was not found."
  })
);

const conflictStatus = toRollbackHttpStatus(
  new RollbackSeedBatchError({
    code: "ROLLBACK_BATCH_ALREADY_ROLLED_BACK",
    message: "Seed batch was already rolled back."
  })
);

void parsedRollbackBody;
void invalidSeedBatchIdStatus;
void notFoundStatus;
void conflictStatus;
