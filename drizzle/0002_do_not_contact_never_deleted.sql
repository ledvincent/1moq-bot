-- The do-not-contact list is never emptied, even by mistake (okf/domain/do-not-contact-list.md):
-- DELETE and TRUNCATE on it are refused. drizzle-kit does not generate triggers, hence this file.
CREATE FUNCTION "do_not_contact_refuse_removal"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'The do-not-contact list is never deleted from (%)', TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "do_not_contact_no_delete"
  BEFORE DELETE ON "do_not_contact"
  FOR EACH STATEMENT EXECUTE FUNCTION "do_not_contact_refuse_removal"();
--> statement-breakpoint
CREATE TRIGGER "do_not_contact_no_truncate"
  BEFORE TRUNCATE ON "do_not_contact"
  FOR EACH STATEMENT EXECUTE FUNCTION "do_not_contact_refuse_removal"();
