CREATE TABLE "pending_undos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" uuid NOT NULL,
	"schema_name" varchar(64) DEFAULT 'public' NOT NULL,
	"table_name" varchar(128) NOT NULL,
	"primary_key_column" varchar(128) NOT NULL,
	"primary_key_value" text NOT NULL,
	"operation" varchar(16) NOT NULL,
	"previous_values" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_undos" ADD CONSTRAINT "pending_undos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;