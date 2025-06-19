CREATE TABLE "cuadre" (
	"id" varchar PRIMARY KEY NOT NULL,
	"transaction_id" varchar NOT NULL,
	"banco" varchar,
	"banco2" varchar,
	"fecha_cliente" timestamp,
	"referencia" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "fecha" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "cuadre" ADD CONSTRAINT "cuadre_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "matricula";