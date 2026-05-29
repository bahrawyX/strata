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
    // URL parsing trims leading whitespace silently, which would let
    // " postgresql://..." pass. Reject any leading/trailing whitespace
    // before we even try to parse.
    (val) => val === val.trim(),
    "Must be a valid PostgreSQL connection string (postgresql://...)"
  )
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

export const rotateConnectionStringSchema = z.object({
  connectionId: z.string().uuid("Invalid connection id."),
  newConnectionString: connectionStringSchema,
});

export type RotateConnectionInput = z.infer<typeof rotateConnectionStringSchema>;

export const savedQueryNameSchema = z
  .string()
  .trim()
  .min(1, "Give the query a name.")
  .max(120, "Name is too long (max 120 characters).");

export const savedQueryBodySchema = z
  .string()
  .min(1, "Query cannot be empty.")
  .max(10_000, "Query is too long.");

export const saveQuerySchema = z.object({
  connectionId: z.string().uuid().nullable(),
  name: savedQueryNameSchema,
  query: savedQueryBodySchema,
});

export const updateSavedQuerySchema = z.object({
  id: z.string().uuid(),
  name: savedQueryNameSchema.optional(),
  query: savedQueryBodySchema.optional(),
});

export type SaveQueryInput = z.infer<typeof saveQuerySchema>;
export type UpdateSavedQueryInput = z.infer<typeof updateSavedQuerySchema>;

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
