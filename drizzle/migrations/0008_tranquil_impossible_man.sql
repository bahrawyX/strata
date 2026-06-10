CREATE INDEX "activity_log_user_conn_action_created_idx" ON "activity_log" USING btree ("user_id","connection_id","action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_log_created_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "connections_user_idx" ON "connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pending_undos_expires_idx" ON "pending_undos" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "saved_queries_user_conn_idx" ON "saved_queries" USING btree ("user_id","connection_id");--> statement-breakpoint
CREATE INDEX "team_invites_expires_idx" ON "team_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "team_invites_team_idx" ON "team_invites" USING btree ("team_id");