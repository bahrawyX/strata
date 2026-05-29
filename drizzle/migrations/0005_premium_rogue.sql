ALTER TABLE "connections" ADD COLUMN "environment" varchar(16) DEFAULT 'dev' NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "read_only" boolean DEFAULT false NOT NULL;