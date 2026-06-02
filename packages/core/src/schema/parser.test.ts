import { parseManualSchema } from "./parser";
import { parseManualSchemaLocal } from "./local-parser";
import { parseManualSchemaAI } from "./ai-parser";

describe("Manual Schema Parser", () => {
  describe("Local Sandbox Parser", () => {
    it("should successfully parse standard JS Mongoose schemas with different field types", () => {
      const schemaText = `
        const mongoose = require('mongoose');
        const Schema = mongoose.Schema;

        const UserSchema = new Schema({
          email: { type: String, required: true, unique: true },
          age: Number,
          roles: [{ type: String, enum: ['admin', 'member'] }],
          active: { type: Boolean, default: true },
          createdAt: { type: Date, default: Date.now }
        });

        mongoose.model('User', UserSchema);
      `;

      const result = parseManualSchemaLocal(schemaText);
      expect(result.schema.collections).toHaveLength(1);
      
      const userCol = result.schema.collections[0];
      expect(userCol.name).toBe("User");

      // Verify fields
      const emailField = userCol.fields.find(f => f.name === "email");
      expect(emailField).toBeDefined();
      expect(emailField?.type).toBe("String");
      expect(emailField?.required).toBe(true);
      expect(emailField?.unique).toBe(true);

      const ageField = userCol.fields.find(f => f.name === "age");
      expect(ageField).toBeDefined();
      expect(ageField?.type).toBe("Number");
      expect(ageField?.required).toBe(false);

      const rolesField = userCol.fields.find(f => f.name === "roles");
      expect(rolesField).toBeDefined();
      expect(rolesField?.type).toBe("Array");

      const activeField = userCol.fields.find(f => f.name === "active");
      expect(activeField).toBeDefined();
      expect(activeField?.type).toBe("Boolean");
      expect(activeField?.defaultValue).toBe("true");
    });

    it("should extract Schema variables if not explicitly registered as models", () => {
      const schemaText = `
        const ProductSchema = new Schema({
          title: String,
          price: { type: Number, required: true }
        });
      `;

      const result = parseManualSchemaLocal(schemaText);
      expect(result.schema.collections).toHaveLength(1);
      const productCol = result.schema.collections[0];
      expect(productCol.name).toBe("Product");
      
      const priceField = productCol.fields.find(f => f.name === "price");
      expect(priceField?.type).toBe("Number");
      expect(priceField?.required).toBe(true);
    });

    it("should extract ObjectId references and relations correctly", () => {
      const schemaText = `
        const OrderSchema = new Schema({
          customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          total: Number
        });
      `;

      const result = parseManualSchemaLocal(schemaText);
      expect(result.schema.collections).toHaveLength(1);
      const orderCol = result.schema.collections[0];
      expect(orderCol.name).toBe("Order");
      
      const customerField = orderCol.fields.find(f => f.name === "customer");
      expect(customerField?.type).toBe("ObjectId");
      expect(customerField?.ref).toBe("User");
      expect(customerField?.required).toBe(true);
    });

    it("should fallback to static regex parsing if syntax errors exist in the sandbox execution", () => {
      const schemaText = `
        // Syntax error on purpose (missing closing bracket for example, or TypeScript syntax)
        const PostSchema: Schema = new mongoose.Schema({
          author: { type: Schema.Types.ObjectId, ref: 'User' },
          content: String
        });
      `;

      const result = parseManualSchemaLocal(schemaText);
      expect(result.schema.collections).toHaveLength(1);
      const postCol = result.schema.collections[0];
      expect(postCol.name).toBe("Post");
      
      const authorField = postCol.fields.find(f => f.name === "author");
      expect(authorField?.type).toBe("ObjectId");
      expect(authorField?.ref).toBe("User");
    });
  });

  describe("AI-Assisted Parser", () => {
    it("should call OpenAI with structured output format and return parsed schema", async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                collections: [
                  {
                    name: "User",
                    fields: [
                      { name: "email", type: "String", required: true, unique: true, enum: null, ref: null, defaultValue: null },
                      { name: "role", type: "String", required: false, unique: false, enum: ["admin", "member"], ref: null, defaultValue: "member" }
                    ]
                  }
                ]
              })
            }
          }
        ]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockOpenAIResponse)
          }
        }
      };

      const result = await parseManualSchemaAI("some complex typescript schema", {
        openai: mockOpenAI
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(result.collections).toHaveLength(1);
      
      const userCol = result.collections[0];
      expect(userCol.name).toBe("User");
      expect(userCol.fields).toHaveLength(2);
      
      const roleField = userCol.fields.find(f => f.name === "role");
      expect(roleField?.type).toBe("String");
      expect(roleField?.enum).toEqual(["admin", "member"]);
      expect(roleField?.defaultValue).toBe("member");
    });
  });

  describe("Coordinator (parseManualSchema)", () => {
    it("should use local parser if it successfully extracts collections", async () => {
      const schemaText = `
        const ItemSchema = new Schema({
          sku: String
        });
      `;

      const result = await parseManualSchema({ schemaText });
      expect(result.schema.collections).toHaveLength(1);
      expect(result.schema.collections[0].name).toBe("Item");
    });

    it("should fall back to AI parser if local parser finds nothing and openai client is available", async () => {
      const mockOpenAIResponse = {
        collections: [
          {
            name: "ComplexModel",
            fields: [{ name: "name", type: "String", required: true }]
          }
        ]
      };

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: JSON.stringify(mockOpenAIResponse) } }]
            })
          }
        }
      };

      // Empty schema will fail local parser or find nothing
      const result = await parseManualSchema(
        { schemaText: "complex ts decorators" },
        { openai: mockOpenAI }
      );

      expect(result.schema.collections).toHaveLength(1);
      expect(result.schema.collections[0].name).toBe("ComplexModel");
    });
  });
});
