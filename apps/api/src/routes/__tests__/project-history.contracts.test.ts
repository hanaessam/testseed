import { createHistoryRouter } from "../history";
import { createProjectsRouter, updateProjectSchemaSchema } from "../projects";
import { createRollbackRouter } from "../rollback";

void createProjectsRouter;
void createHistoryRouter;
void createRollbackRouter;

const reviewedSchemaPayload = updateProjectSchemaSchema.parse({
  source: "mongodb",
  schema: {
    collections: [
      {
        name: "orders",
        sampleCount: 20,
        warnings: ["Collection inferred from a small sample."],
        fields: [
          {
            name: "customerId",
            type: "ObjectId",
            required: false,
            unique: false,
            ref: "customers",
            refConfidence: "possible",
            confidence: "low",
            warnings: ["Reference target should be reviewed."],
            children: [
              {
                name: "value",
                type: "String",
                required: false,
                unique: false,
                confidence: "high"
              }
            ]
          }
        ]
      }
    ]
  }
});

void reviewedSchemaPayload;
