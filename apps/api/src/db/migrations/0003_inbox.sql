CREATE TABLE "message_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"channel" varchar(20),
	"body" text,
	"author" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_events_message_idx" ON "message_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_email_idx" ON "messages" USING btree ("email");