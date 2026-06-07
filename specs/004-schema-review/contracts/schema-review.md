# Contract: Schema Review

## Save Reviewed Schema

`PUT /projects/{projectId}/schema`

### Authentication

Requires the same authenticated project owner token as other project routes.

### Request

```json
{
  "schema": {
    "collections": [
      {
        "name": "orders",
        "sampleCount": 20,
        "warnings": ["Collection inferred from a small sample."],
        "fields": [
          {
            "name": "customerId",
            "type": "ObjectId",
            "required": false,
            "unique": false,
            "ref": "customers",
            "refConfidence": "possible",
            "confidence": "low",
            "warnings": ["Reference target should be reviewed."]
          }
        ]
      }
    ]
  },
  "source": "mongodb"
}
```

### Accepted Field Metadata

- `confidence`: `high`, `medium`, `low`
- `warnings`: string[]
- `children`: recursive field array
- `itemType`: string
- `enumSource`: `declared`, `inferred`
- `refConfidence`: `explicit`, `inferred`, `possible`

### Rejection Cases

- Missing authentication.
- Empty project id.
- Empty collection name.
- Empty field name.
- Invalid `source`, `confidence`, `enumSource`, or `refConfidence` values.
- Malformed recursive children.

### Response

Returns the saved project and schema snapshot. The snapshot schema must include the reviewed field edits and warnings exactly as validated.

### Security

The request must not include MongoDB connection strings or other secrets. Connection strings remain operation-only inputs for test/discovery routes.

