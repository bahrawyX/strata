import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(100, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const connectionStringSchema = z
  .string()
  .min(1, "Connection string is required.")
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        return url.protocol === "postgresql:" || url.protocol === "postgres:";
      } catch {
        return false;
      }
    },
    "Must be a valid PostgreSQL connection string (postgresql://...)"
  );

export const connectionNameSchema = z
  .string()
  .min(1, "Name is required.")
  .max(100, "Name must be under 100 characters.")
  .regex(
    /^[a-zA-Z0-9 _-]+$/,
    "Name can only contain letters, numbers, spaces, hyphens, and underscores."
  );

export const dbTypeSchema = z.enum(["neon", "supabase", "postgres"]);

export const newConnectionSchema = z.object({
  name: connectionNameSchema,
  connectionString: connectionStringSchema,
  dbType: dbTypeSchema,
});

export type NewConnectionInput = z.infer<typeof newConnectionSchema>;

export const sqlQuerySchema = z.object({
  connectionId: z.string().uuid("Invalid connection id."),
  query: z
    .string()
    .min(1, "Query cannot be empty.")
    .max(10000, "Query is too long."),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid identifier.");

export const tableNameSchema = identifierSchema;
export const columnNameSchema = identifierSchema;
export const schemaNameSchema = identifierSchema;

export const tableDataParamsSchema = z.object({
  connectionId: z.string().uuid(),
  tableName: tableNameSchema,
  schema: schemaNameSchema.default("public"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const insertRowSchema = z.object({
  connectionId: z.string().uuid(),
  tableName: tableNameSchema,
  schema: schemaNameSchema.default("public"),
  values: z.record(z.string(), z.unknown()),
});

export const updateRowSchema = z.object({
  connectionId: z.string().uuid(),
  tableName: tableNameSchema,
  schema: schemaNameSchema.default("public"),
  primaryKeyColumn: columnNameSchema,
  primaryKeyValue: z.unknown(),
  values: z.record(z.string(), z.unknown()),
});

export const deleteRowSchema = z.object({
  connectionId: z.string().uuid(),
  tableName: tableNameSchema,
  schema: schemaNameSchema.default("public"),
  primaryKeyColumn: columnNameSchema,
  primaryKeyValue: z.unknown(),
  isConfirmed: z.literal(true, {
    message: "Confirmation is required to delete a row.",
  }),
});
