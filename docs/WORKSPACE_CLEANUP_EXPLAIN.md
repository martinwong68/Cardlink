# Workspace Cleanup Explain

## Purpose
Prepare this repository for a fresh planning-first, multi-agent development cycle by removing legacy prompt and migration artifacts that are no longer needed for the next project phase.

## Removed Files

### Legacy planning/prompt docs at repository root
- ADMIN_PANEL_NFC_DURATION_AND_SUBSCRIPTION_PROMPT.md
- ADMIN_PANEL_PRICE_AND_FREE_PLAN_UPDATE_PROMPT.md
- ADMIN_PANEL_SPEC_PROMPT.md
- CARDLINK_ADMIN_LOGIN_AND_BILLING_PROMPT.md
- CODEBASE_OVERVIEW.md
- TEMPLATE_SYSTEM_GUIDE.md

### Legacy SQL/migration artifacts
- nfc_setup.sql
- migrations/20260220_company_members_rls_recursion_fix2.sql
- migrations/20260220_company_membership_phase1.sql
- migrations/20260220_company_membership_phase2.sql
- migrations/20260220_company_membership_rls_hotfix.sql
- migrations/20260220_membership_function_test.sql
- migrations/20260220_membership_redeem_hotfix.sql
- migrations/20260220_redemption_approval_flow.sql
- migrations/20260220_set_martin_owner.sql
- migrations/20260221_admin_panel_visibility_hotfix.sql
- migrations/20260221_rls_policy_cleanup_pack.sql
- migrations/20260222_client_membership_spend_tier_support.sql
- migrations/20260222_company_cards_account_mother_card_support.sql
- migrations/20260222_company_profile_card_backfill.sql
- migrations/20260222_membership_join_company_ambiguity_hotfix.sql
- migrations/20260225_business_cards_background_image.sql
- migrations/20260225_company_cards_company_id_backfill.sql
- migrations/20260225_reset_templates_to_classic_business.sql
- migrations/20260226_admin_data_cleanup_safe.sql
- migrations/20260226_company_cards_backfill_runbook.sql
- migrations/20260301_billing_settings_and_free_plan_card_limits.sql
- migrations/20260301_subscription_tracking_and_nfc_premium_duration.sql
- migrations/20260303_profile_plan_sync_from_premium_until.sql
- migrations/20260311_inventory_procurement_mvp_foundation.sql
- migrations/add_template_column.sql

## Retained Files (key)
- .github/AGENTS.md
- .github/agents/*.agent.md
- .github/instructions/planning-first.instructions.md
- .github/prompts/sprint-planning.prompt.md
- docs/DEV_STREAM_STARTER.md
- docs/MARCH_2026_MVP_EXECUTION_PLAN.md
- docs/AGENT_OPERATING_MODEL.md
- cardlink/* (application source)

## Notes
- This cleanup intentionally removes all existing migration history as requested.
- Before deploying to production, recreate a clean baseline migration set for the new project phase.
