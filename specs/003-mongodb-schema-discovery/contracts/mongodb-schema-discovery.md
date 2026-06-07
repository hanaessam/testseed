# Contract: MongoDB Schema Discovery

## Test Connection

`POST /schemas/mongodb/test-connection`

### Request

```json
{
  "connectionString": "mongodb+srv://...",
  "projectId": "project-1"
}
```

### Success Response

```json
{
  "ok": true,
  "databaseName": "shop",
  "message": "Connection successful."
}
```

### Failure Response

```json
{
  "ok": false,
  "errorCategory": "authentication_failed",
  "message": "MongoDB authentication failed."
}
```

## Discover Schema

`POST /schemas/mongodb/discover`

### Request

```json
{
  "connectionString": "mongodb+srv://...",
  "projectId": "project-1",
  "sampleSize": 20
}
```

`sampleSize` is optional and bounded to 1-20. The default is 20.

### Success Response

```json
{
  "databaseName": "shop",
  "schema": {
    "collections": [
      {
        "name": "orders",
        "sampleCount": 20,
        "warnings": ["Only 20 sampled documents were inspected; review confidence carefully."],
        "fields": [
          {
            "name": "userId",
            "type": "ObjectId",
            "required": true,
            "unique": false,
            "confidence": "high",
            "ref": "users",
            "refConfidence": "inferred"
          }
        ]
      }
    ]
  },
  "collections": [
    {
      "name": "orders",
      "sampleCount": 20,
      "warnings": ["Only 20 sampled documents were inspected; review confidence carefully."],
      "fields": [
        {
          "name": "userId",
          "type": "ObjectId",
          "required": true,
          "unique": false,
          "confidence": "high",
          "ref": "users",
          "refConfidence": "inferred"
        }
      ]
    }
  ],
  "warnings": []
}
```

### Rules

- Routes require authentication through the API auth middleware.
- Connection strings are request-only and never returned.
- Discovery results are not saved automatically.
- Raw driver errors are never returned.
