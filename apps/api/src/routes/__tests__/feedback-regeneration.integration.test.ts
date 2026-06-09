import { createGenerationRouter } from "../generation";
import type { FeedbackRegenerationResponse } from "@testseed/types";

const retryBlockedResponse: FeedbackRegenerationResponse = {
  mode: "rejected",
  message: "The requested refinement could not be applied without violating the reviewed schema.",
  validationResults: [
    {
      severity: "error",
      code: "UNIQUE_VALUE_DUPLICATE",
      collectionName: "User",
      fieldName: "email",
      message: "Duplicate email values were generated.",
      suggestedAction: "Revise feedback to permit unique generated values."
    }
  ],
  warnings: [],
  chatHistory: [
    { role: "user", content: "Use duplicate email values" },
    {
      role: "assistant",
      content: "The requested refinement could not be applied without violating the reviewed schema."
    }
  ],
  candidateReview: {
    state: "awaiting_revised_feedback",
    retryAttempt: 1,
    changeSummary: {
      status: "invalid",
      collectionsChanged: [],
      notableFieldsChanged: [],
      preservedCollections: ["User"],
      appliedFeedbackSummary: "No meaningful changes were made to the accepted dataset.",
      skippedFeedbackSummary: "Duplicate email values were generated.",
      noMeaningfulChanges: true
    }
  }
};

void createGenerationRouter;
void retryBlockedResponse;
